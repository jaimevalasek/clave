import {
  hideLast,
  mountedFlags,
  newTake,
  revealNext,
  revealNextTopic,
  shownFlags,
  toggleEye
} from '../../../shared/reveal';
import type { RevealChange, RevealRefusal } from '../../../shared/reveal';
import { hasChildren } from '../../../shared/sheetTree';
import { commit, useSheet } from './sheetStore';
import type { DraftBlock, SheetState } from './sheetStore';

// Reveal, hide, preparation and take (CAP-pauta-revelavel-revelar). Every
// command changes the screen first and saves after (RULE-pauta-revelavel-11):
// the state is local, `commit` marks it urgent and the autosave queue sends it.
// The operations return outcomes; the UI layer (useRevealActions) owns toasts.

/** The ink settles in 460 ms; the mark comes off a little later so a move never replays it. */
const INK_MS = 600;
/** Hidden blocks fade out in 180 ms before leaving the page. */
const LEAVE_MS = 180;

let revealSerial = 0;
let inkTimer: number | undefined;
let leaveTimer: number | undefined;

/** The selection never stays on a block that is not in the page. */
function mountedSelection(blocks: DraftBlock[], preparing: boolean, selectedKey: string | null): string | null {
  if (!selectedKey) return null;
  const index = blocks.findIndex((block) => block.key === selectedKey);
  return index >= 0 && mountedFlags(blocks, preparing)[index] ? selectedKey : null;
}

/** Keys of the blocks that came onto (`entered`) or left the screen between two lists. */
function screenDiff(before: DraftBlock[], after: DraftBlock[]): { entered: string[]; left: string[] } {
  const was = shownFlags(before);
  const is = shownFlags(after);
  const entered: string[] = [];
  const left: string[] = [];
  after.forEach((block, index) => {
    if (is[index] && !was[index]) entered.push(block.key);
    if (!is[index] && was[index]) left.push(block.key);
  });
  return { entered, left };
}

/** What a reveal or hide did: the blocks whose take changed and those that reached or left the screen. */
export interface TakeChange {
  keys: string[];
  onScreen: string[];
}

/** The mark that makes entering blocks settle in ink, cleared once the ink is done. */
function inkMark(keys: string[]): SheetState['lastReveal'] {
  revealSerial += 1;
  const serial = revealSerial;
  window.clearTimeout(inkTimer);
  inkTimer = window.setTimeout(() => {
    if (useSheet.getState().lastReveal?.serial === serial) useSheet.setState({ lastReveal: null });
  }, INK_MS);
  return { keys, serial };
}

function applyReveal(change: RevealChange<DraftBlock>): TakeChange {
  const { blocks, leavingKeys } = useSheet.getState();
  const { entered } = screenDiff(blocks, change.nodes);
  commit(change.nodes, {
    lastReveal: inkMark(entered),
    leavingKeys: leavingKeys.filter((key) => !entered.includes(key))
  });
  return { keys: change.changed.map((index) => change.nodes[index].key), onScreen: entered };
}

/**
 * Blocks just pasted or dropped while recording settle in ink and the sheet
 * follows them, like a reveal. Blocks born dimmed in preparation do not.
 */
export function markEntered(keys: string[]): void {
  const { blocks } = useSheet.getState();
  const shown = shownFlags(blocks);
  const entered = keys.filter((key) => shown[blocks.findIndex((block) => block.key === key)]);
  if (entered.length) useSheet.setState({ lastReveal: inkMark(entered) });
}

/** `fade`: the blocks leaving the screen fade out first (never in preparation or with reduced motion). */
function applyHide(change: RevealChange<DraftBlock>, fade: boolean): TakeChange {
  const { blocks, preparing, selectedKey, lastReveal } = useSheet.getState();
  const { left } = screenDiff(blocks, change.nodes);
  const leaving = fade && !preparing ? left : [];
  commit(change.nodes, {
    leavingKeys: leaving,
    lastReveal: lastReveal && { ...lastReveal, keys: lastReveal.keys.filter((key) => !left.includes(key)) },
    selectedKey: mountedSelection(change.nodes, preparing, selectedKey)
  });
  window.clearTimeout(leaveTimer);
  if (leaving.length) leaveTimer = window.setTimeout(() => useSheet.setState({ leavingKeys: [] }), LEAVE_MS);
  return { keys: change.changed.map((index) => change.nodes[index].key), onScreen: left };
}

/** PageDown / "Revelar próximo" (AC-pauta-revelavel-22). */
export function revealNextBlock(): TakeChange | RevealRefusal {
  const result = revealNext(useSheet.getState().blocks);
  return typeof result === 'string' ? result : applyReveal(result);
}

/** Shift+PageDown: the next topic with its sub-items (AC-pauta-revelavel-24). */
export function revealNextTopicBlocks(): TakeChange | RevealRefusal {
  const result = revealNextTopic(useSheet.getState().blocks);
  return typeof result === 'string' ? result : applyReveal(result);
}

/** PageUp / "Ocultar último" (AC-pauta-revelavel-23). */
export function hideLastStep(fade: boolean): TakeChange | RevealRefusal {
  const result = hideLast(useSheet.getState().blocks);
  return typeof result === 'string' ? result : applyHide(result, fade);
}

export interface EyeOutcome extends TakeChange {
  hidden: boolean;
  /** A topic hidden with its sub-items. */
  withSubItems: boolean;
}

/** The eye of one block (AC-pauta-revelavel-25). */
export function toggleBlockEye(key: string, fade: boolean): EyeOutcome | null {
  const { blocks } = useSheet.getState();
  const index = blocks.findIndex((block) => block.key === key);
  const result = toggleEye(blocks, index);
  if (!result) return null;
  const hidden = !result.nodes[index].takeVisible;
  const change = hidden ? applyHide(result, fade) : applyReveal(result);
  return { ...change, hidden, withSubItems: hidden && hasChildren(blocks, index) };
}

/** F2 / "Preparo": the preparation view goes on or off (AC-pauta-revelavel-28). Returns the new state. */
export function togglePreparation(): boolean {
  const { preparing, blocks, selectedKey } = useSheet.getState();
  const next = !preparing;
  window.clearTimeout(leaveTimer);
  useSheet.setState({
    preparing: next,
    leavingKeys: [],
    selectedKey: mountedSelection(blocks, next, selectedKey)
  });
  return next;
}

/** "começa oculto" ⇄ "começa visível": how the block starts in every take; the current take does not change. */
export function togglePlanned(key: string): void {
  const { blocks } = useSheet.getState();
  commit(blocks.map((block) => (block.key === key ? { ...block, plannedVisible: !block.plannedVisible } : block)));
}

/** "recolher" / "expandir" a topic in the preparation view (AC-pauta-revelavel-43). */
export function toggleCollapsed(key: string): void {
  const { blocks, preparing, selectedKey } = useSheet.getState();
  const next = blocks.map((block) => (block.key === key ? { ...block, collapsed: !block.collapsed } : block));
  commit(next, { selectedKey: mountedSelection(next, preparing, selectedKey) });
}

/** "Nova tomada": everything back to the plan, from the top (AC-pauta-revelavel-29). */
export function startNewTake(): void {
  window.clearTimeout(leaveTimer);
  commit(newTake(useSheet.getState().blocks), { selectedKey: null, lastReveal: null, leavingKeys: [] });
}
