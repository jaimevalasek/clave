import { defaultFontPx, stepSize } from '../../../shared/blockSize';
import {
  MAX_DEPTH,
  hasChildren,
  indentRefusal,
  moveSubtree,
  moveSubtreeBefore,
  normalizeDepths,
  shiftSubtree
} from '../../../shared/sheetTree';
import type { IndentRefusal } from '../../../shared/sheetTree';
import { sliceRuns } from '../../../shared/textMarks';
import type { TextRun } from '../../../shared/textMarks';
import { trimTrailingBreaks } from './domText';
import { forgetIntake } from './mediaIntake';
import { commit, isMediaFailure, makeTextBlock, removeBlock, replaceText, useSheet } from './sheetStore';
import type { DraftBlock } from './sheetStore';

// Structural operations of the sheet: levels, order and deletion. They return
// outcomes; the UI layer (useBlockActions) owns the toasts and "Desfazer".

/** Order and levels before a move: what "Desfazer" brings back (D1). */
export type OrderSnapshot = { key: string; depth: number }[];

export interface MoveResult {
  snapshot: OrderSnapshot;
  /** 1-based position of the moved block after the move. */
  position: number;
  total: number;
}

export type ShiftOutcome = 'shifted' | 'unchanged' | IndentRefusal;

function snapshotOf(blocks: DraftBlock[]): OrderSnapshot {
  return blocks.map((block) => ({ key: block.key, depth: block.depth }));
}

/** Indenting a text moves it one size down, outdenting one size up; the fine adjustment resets. */
function restyleForLevel(delta: 1 | -1) {
  return (block: DraftBlock): DraftBlock => {
    if (block.kind !== 'text') return block;
    const size = stepSize(block.size, delta);
    return { ...block, size, fontPx: defaultFontPx(size) };
  };
}

/** The nearest earlier item at `depth` under the same topic. */
function previousSibling(blocks: DraftBlock[], index: number, depth: number): DraftBlock | null {
  for (let position = index - 1; position >= 0; position -= 1) {
    if (blocks[position].depth < depth) return null;
    if (blocks[position].depth === depth) return blocks[position];
  }
  return null;
}

/**
 * A sub-item looks like the items of its list: it takes the size of the item
 * above it at its level, so going down and back up never leaves two sizes in
 * one list. Topics keep the one-size-per-level rule.
 */
function matchSiblings(blocks: DraftBlock[], index: number): DraftBlock[] {
  const block = blocks[index];
  if (!block || block.kind !== 'text' || block.depth === 0) return blocks;
  const sibling = previousSibling(blocks, index, block.depth);
  if (!sibling || sibling.kind !== 'text') return blocks;
  if (sibling.size === block.size && sibling.fontPx === block.fontPx) return blocks;
  return blocks.map((entry, position) => (position === index ? { ...entry, size: sibling.size, fontPx: sibling.fontPx } : entry));
}

/**
 * Tab / Shift+Tab (or Alt+→ / Alt+←) on a block of any kind, with its
 * sub-items (AC-pauta-revelavel-40). A refusal leaves the sheet untouched.
 */
export function shiftBlock(key: string, delta: 1 | -1): ShiftOutcome {
  const { blocks } = useSheet.getState();
  const index = blocks.findIndex((block) => block.key === key);
  if (index < 0) return 'unchanged';
  if (delta > 0) {
    const refusal = indentRefusal(blocks, index);
    if (refusal) return refusal;
  }
  const next = shiftSubtree(blocks, index, delta, restyleForLevel(delta));
  if (!next) return 'unchanged';
  commit(matchSiblings(next, index), { selectedKey: key });
  return 'shifted';
}

/**
 * Cuts a text at `offset`: the block keeps its level, its size and the text
 * before; the text from `offset` on goes into a new block right below, `delta`
 * levels away (one size per level), focused with the caret at `caret`.
 */
function splitText(key: string, runs: TextRun[], offset: number, caret: number, delta: -1 | 0 | 1): ShiftOutcome {
  const current = useSheet.getState().blocks.find((block) => block.key === key);
  if (!current || current.kind !== 'text') return 'unchanged';
  const depth = current.depth + delta;
  if (depth > MAX_DEPTH) return 'too-deep';
  if (depth < 0) return 'unchanged';
  replaceText(key, trimTrailingBreaks(sliceRuns(runs, 0, offset)));
  const { blocks } = useSheet.getState();
  const index = blocks.findIndex((block) => block.key === key);
  const size = delta === 0 ? current.size : stepSize(current.size, delta);
  const created = makeTextBlock(blocks, { depth, size, content: sliceRuns(runs, offset) });
  // A collapsed topic opens to show the sub-item being written.
  const kept = delta > 0 && current.collapsed ? { ...blocks[index], collapsed: false } : blocks[index];
  const next = normalizeDepths([...blocks.slice(0, index), kept, created, ...blocks.slice(index + 1)]);
  commit(matchSiblings(next, index + 1), {
    selectedKey: created.key,
    focusRequest: { key: created.key, selection: { start: caret - offset, end: caret - offset } }
  });
  return 'shifted';
}

/**
 * Tab / Shift+Tab with the caret on a later line of a text (Enter, then Tab,
 * before or after typing the line): the block stays as it is with the lines
 * above; the caret's line and the ones below become its first sub-item (Tab)
 * or an item one level up (Shift+Tab), with the caret where it was in the
 * line. Past level 2 a refusal leaves the sheet untouched.
 */
export function branchLine(key: string, runs: TextRun[], offset: number, caret: number, delta: 1 | -1): ShiftOutcome {
  return splitText(key, runs, offset, caret, delta);
}

/**
 * Enter in a sub-item, as in a list: the text after the caret becomes the next
 * item at the same level (the first sub-item when the item has sub-items), and
 * Enter on an empty item takes it one level up.
 */
export function nextListItem(key: string, runs: TextRun[], caret: number): ShiftOutcome {
  const { blocks } = useSheet.getState();
  const index = blocks.findIndex((block) => block.key === key);
  if (index < 0) return 'unchanged';
  if (trimTrailingBreaks(runs).length === 0) return shiftBlock(key, -1);
  return splitText(key, runs, caret, caret, hasChildren(blocks, index) ? 1 : 0);
}

function applyMove(key: string, previous: DraftBlock[], next: DraftBlock[] | null): MoveResult | null {
  if (!next) return null;
  commit(next, { selectedKey: key });
  return {
    snapshot: snapshotOf(previous),
    position: next.findIndex((block) => block.key === key) + 1,
    total: next.length
  };
}

/** Alt+↑ / Alt+↓: the block jumps over the neighbouring group with its sub-items (AC-pauta-revelavel-44). */
export function moveBlockBy(key: string, direction: -1 | 1): MoveResult | null {
  const { blocks } = useSheet.getState();
  const index = blocks.findIndex((block) => block.key === key);
  return applyMove(key, blocks, moveSubtree(blocks, index, direction));
}

/** Drop: the block and its sub-items land before `beforeKey` (null = the end of the sheet). */
export function moveBlockBefore(key: string, beforeKey: string | null): MoveResult | null {
  const { blocks } = useSheet.getState();
  const index = blocks.findIndex((block) => block.key === key);
  const target = beforeKey === null ? blocks.length : blocks.findIndex((block) => block.key === beforeKey);
  if (index < 0 || target < 0) return null;
  return applyMove(key, blocks, moveSubtreeBefore(blocks, index, target));
}

/**
 * "Desfazer": the order and levels of the snapshot come back. Text typed in
 * the meantime stays; a block created after the move keeps going at the end.
 */
export function restoreOrder(snapshot: OrderSnapshot): void {
  const { blocks } = useSheet.getState();
  const byKey = new Map(blocks.map((block) => [block.key, block]));
  const restored: DraftBlock[] = [];
  for (const entry of snapshot) {
    const block = byKey.get(entry.key);
    if (!block) continue;
    restored.push(block.depth === entry.depth ? block : { ...block, depth: entry.depth });
    byKey.delete(entry.key);
  }
  commit(normalizeDepths([...restored, ...byKey.values()]));
}

/**
 * Trash or Delete: the "Apagar bloco?" modal decides (AC-pauta-revelavel-45).
 * A media failure leaves at once: there is nothing in it to lose
 * (BR-pauta-revelavel-10).
 */
export function requestDelete(key: string): void {
  const block = useSheet.getState().blocks.find((entry) => entry.key === key);
  if (!block) return;
  if (isMediaFailure(block)) {
    forgetIntake(key);
    removeBlock(key);
    return;
  }
  useSheet.setState({ pendingDeleteKey: key, selectedKey: key });
}

export function cancelDelete(): void {
  if (useSheet.getState().pendingDeleteKey) useSheet.setState({ pendingDeleteKey: null });
}

/** "Apagar bloco": the block goes and its sub-items move one level up. */
export function confirmDelete(key: string): void {
  cancelDelete();
  forgetIntake(key);
  removeBlock(key);
}
