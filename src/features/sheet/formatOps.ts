import { SIZE_SPECS, adjustFontPx, canAdjustFontPx, defaultFontPx } from '../../../shared/blockSize';
import type { BlockSize } from '../../../shared/blockSize';
import { applyMark, clearMarks, isRangeBold, runsEqual } from '../../../shared/textMarks';
import type { TextColor, TextRun } from '../../../shared/textMarks';
import { commit, replaceText, useSheet } from './sheetStore';
import type { DraftBlock } from './sheetStore';

// Formatting of a text block (CAP-pauta-revelavel-formatacao): its size with
// the 4 px fine adjustment (RULE-pauta-revelavel-05) and the marks of a
// passage (RULE-pauta-revelavel-06). Every change goes through the model and
// is saved; the feedback (toasts, announcements) lives in useBlockActions.

function textBlock(key: string): DraftBlock | null {
  const block = useSheet.getState().blocks.find((entry) => entry.key === key);
  return block && block.kind === 'text' ? block : null;
}

function patchBlock(key: string, patch: Partial<DraftBlock>): void {
  const { blocks } = useSheet.getState();
  commit(blocks.map((entry) => (entry.key === key ? { ...entry, ...patch } : entry)));
}

/** P, M, G or Título: a new size starts at its default, so the fine adjustment goes back to zero. */
export function setBlockSize(key: string, size: BlockSize): boolean {
  const block = textBlock(key);
  if (!block) return false;
  const fontPx = defaultFontPx(size);
  if (block.size !== size || block.fontPx !== fontPx) patchBlock(key, { size, fontPx });
  return true;
}

export type AdjustOutcome =
  | { kind: 'changed'; size: BlockSize; fontPx: number }
  | { kind: 'limit'; size: BlockSize; minPx: number; maxPx: number };

/** A− / A+: 4 px inside the range of the size; at the limit nothing changes. */
export function adjustBlockFont(key: string, direction: 1 | -1): AdjustOutcome | null {
  const block = textBlock(key);
  if (!block) return null;
  const spec = SIZE_SPECS[block.size];
  if (!canAdjustFontPx(block.size, block.fontPx, direction)) {
    return { kind: 'limit', size: block.size, minPx: spec.minPx, maxPx: spec.maxPx };
  }
  const fontPx = adjustFontPx(block.size, block.fontPx, direction);
  patchBlock(key, { fontPx });
  return { kind: 'changed', size: block.size, fontPx };
}

/** What the format bar or Ctrl+B does to the selected passage. */
export type PassageFormat = { kind: 'toggle-bold' } | { kind: 'color'; color: TextColor } | { kind: 'clear' };

/**
 * Applies a mark to the passage between two plain-text offsets of `runs` (the
 * text as the editor shows it now). The editor is rebuilt from the model and
 * the same passage comes back selected.
 */
export function formatPassage(key: string, runs: TextRun[], start: number, end: number, format: PassageFormat): boolean {
  if (!textBlock(key) || start === end) return false;
  const from = Math.min(start, end);
  const to = Math.max(start, end);
  let next: TextRun[];
  if (format.kind === 'clear') next = clearMarks(runs, from, to);
  else if (format.kind === 'color') next = applyMark(runs, from, to, { color: format.color });
  else next = applyMark(runs, from, to, { bold: !isRangeBold(runs, from, to) });
  if (runsEqual(next, runs) && runsEqual(next, textBlock(key)?.content ?? [])) return false;
  replaceText(key, next, { focusRequest: { key, selection: { start: from, end: to } } });
  return true;
}
