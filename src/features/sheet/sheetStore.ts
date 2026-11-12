import { create } from 'zustand';
import { ApiError, api } from '../../core/api';
import { DEFAULT_BLOCK_SIZE, defaultFontPx, stepSize } from '../../../shared/blockSize';
import type { BlockSize } from '../../../shared/blockSize';
import { mountedFlags, nextRevealStep } from '../../../shared/reveal';
import { hasChildren, normalizeDepths, removeAndPromote, subtreeEnd } from '../../../shared/sheetTree';
import { runsEqual } from '../../../shared/textMarks';
import type { TextRun } from '../../../shared/textMarks';
import type { RundownSummary, SheetBlock, SheetBlockKind, SheetPayload, SheetSaveResult } from '../../../shared/types';

/** Why a pasted or dropped file did not become media. */
export type IntakeFailure = 'unsupported' | 'too-large' | 'write-failed';

/**
 * A file on its way to the media folder, or the reason it could not get
 * there. It exists only on this screen: it is never saved and never counted.
 */
export type MediaIntake =
  | { state: 'uploading'; fileName: string; progress: number }
  | { state: 'failed'; reason: IntakeFailure; fileName: string; bytes: number };

/**
 * A block on the client: `key` is its identity here, `id` arrives from the
 * server. Kind `intake` is a pasted or dropped file that is not media yet
 * (AC-pauta-revelavel-16, -18): it stays out of the save and of the counter.
 */
export interface DraftBlock extends Omit<SheetBlock, 'id' | 'kind'> {
  key: string;
  id: string | null;
  kind: SheetBlockKind | 'intake';
  /** Upload in progress or failed; on a saved block it is the file chosen by "Procurar o arquivo". */
  intake?: MediaIntake;
}

/** A block the server holds or will hold, as opposed to a client-only `intake` block. */
export function isSavable(block: DraftBlock): block is DraftBlock & { kind: SheetBlockKind } {
  return block.kind !== 'intake';
}

/** A media block that shows a failure: it leaves without the "Apagar bloco?" modal (BR-pauta-revelavel-10). */
export function isMediaFailure(block: DraftBlock): boolean {
  if (block.intake) return block.intake.state === 'failed';
  return block.kind !== 'text' && Boolean(block.mediaMissing);
}

/** A passage of a block text, as plain-text offsets. */
export interface TextSelection {
  start: number;
  end: number;
}

export type SaveState =
  | { phase: 'idle' }
  | { phase: 'saving' }
  | { phase: 'saved'; at: string }
  | { phase: 'failed' };

export interface SheetState {
  rundownId: string | null;
  rundown: RundownSummary | null;
  blocks: DraftBlock[];
  status: 'idle' | 'loading' | 'ready' | 'error' | 'missing';
  error: unknown;
  /** Bumps on every change that must reach the server. */
  revision: number;
  savedRevision: number;
  /** The last change asks to be saved at once instead of after the typing pause. */
  urgent: boolean;
  save: SaveState;
  selectedKey: string | null;
  /** Focus a block text: caret at the end, or the passage that was just formatted selected again. */
  focusRequest: { key: string; selection?: TextSelection } | null;
  /** Bumped per block when its text changes from outside the editor, to re-render it. */
  editorVersions: Record<string, number>;
  /** The block waiting for the "Apagar bloco?" confirmation. */
  pendingDeleteKey: string | null;
  /** Last structural change, read by the screen-reader live region. */
  announcement: string;
  /**
   * Preparation view (F2): hidden blocks show dimmed for the presenter only.
   * A view of this window, never saved: every sheet opens ready to record.
   */
  preparing: boolean;
  /** Blocks that just came onto the screen: they settle in ink and the sheet scrolls to them. */
  lastReveal: { keys: string[]; serial: number } | null;
  /** Blocks that just left the screen, still fading out (inert, gone in 180 ms). */
  leavingKeys: string[];
}

const initialState: SheetState = {
  rundownId: null,
  rundown: null,
  blocks: [],
  status: 'idle',
  error: null,
  revision: 0,
  savedRevision: 0,
  urgent: false,
  save: { phase: 'idle' },
  selectedKey: null,
  focusRequest: null,
  editorVersions: {},
  pendingDeleteKey: null,
  announcement: '',
  preparing: false,
  lastReveal: null,
  leavingKeys: []
};

export const useSheet = create<SheetState>(() => initialState);

let keySequence = 0;
export function newKey(): string {
  keySequence += 1;
  return `new-${Date.now().toString(36)}-${keySequence}`;
}

function fromServer(block: SheetBlock): DraftBlock {
  return { ...block, key: block.id, id: block.id };
}

export async function loadSheet(rundownId: string): Promise<void> {
  useSheet.setState({ ...initialState, rundownId, status: 'loading' });
  try {
    await api.post(`/api/rundowns/${encodeURIComponent(rundownId)}/open`);
    const payload = await api.get<SheetPayload>(`/api/rundowns/${encodeURIComponent(rundownId)}/sheet`);
    if (useSheet.getState().rundownId !== rundownId) return;
    useSheet.setState({ rundown: payload.rundown, blocks: payload.blocks.map(fromServer), status: 'ready' });
  } catch (error) {
    if (useSheet.getState().rundownId !== rundownId) return;
    const missing = error instanceof ApiError && error.status === 404;
    useSheet.setState({ status: missing ? 'missing' : 'error', error });
  }
}

export function resetSheet(): void {
  useSheet.setState(initialState);
}

/** Applies a change to the block list and marks it for saving. */
export function commit(blocks: DraftBlock[], extra: Partial<SheetState> = {}, urgent = true): void {
  const state = useSheet.getState();
  useSheet.setState({ blocks, revision: state.revision + 1, urgent, ...extra });
}

function bumpEditor(key: string): Record<string, number> {
  const versions = useSheet.getState().editorVersions;
  return { ...versions, [key]: (versions[key] ?? 0) + 1 };
}

/** Typing: the editor already shows the text, only the model follows. */
export function updateText(key: string, content: TextRun[]): void {
  const { blocks } = useSheet.getState();
  const block = blocks.find((entry) => entry.key === key);
  if (!block || runsEqual(block.content, content)) return;
  commit(
    blocks.map((entry) => (entry.key === key ? { ...entry, content } : entry)),
    {},
    false
  );
}

/** A text change made outside the editor (trim, paste, marks): the editor re-renders. */
export function replaceText(key: string, content: TextRun[], extra: Partial<SheetState> = {}): void {
  const { blocks } = useSheet.getState();
  commit(
    blocks.map((entry) => (entry.key === key ? { ...entry, content } : entry)),
    { editorVersions: bumpEditor(key), ...extra }
  );
}

export interface NewTextOptions {
  depth: number;
  size?: BlockSize;
  content?: TextRun[];
}

/**
 * A new block starts planned "começa oculto" (AC-pauta-revelavel-21). With the
 * preparation view off it enters the screen at once, as a step of the take:
 * the presenter is writing live (BR-pauta-revelavel-01). With the preparation
 * view on it is born dimmed (BR-pauta-revelavel-02). Blocks created by one
 * action (a paste, a drop) share one step, so PageUp takes them back together.
 */
export function newBlock(blocks: DraftBlock[], fields: Partial<DraftBlock> & Pick<DraftBlock, 'kind' | 'depth'>): DraftBlock {
  const live = !useSheet.getState().preparing;
  return {
    key: newKey(),
    id: null,
    content: [],
    mediaPath: '',
    mediaName: '',
    size: DEFAULT_BLOCK_SIZE,
    fontPx: defaultFontPx(DEFAULT_BLOCK_SIZE),
    plannedVisible: false,
    takeVisible: live,
    revealStep: live ? nextRevealStep(blocks) : null,
    collapsed: false,
    ...fields
  };
}

export function makeTextBlock(blocks: DraftBlock[], options: NewTextOptions): DraftBlock {
  const size = options.size ?? DEFAULT_BLOCK_SIZE;
  return newBlock(blocks, { kind: 'text', depth: options.depth, content: options.content ?? [], size, fontPx: defaultFontPx(size) });
}

/** Inserts new blocks at `index`; the last one is selected unless `selectKey` says otherwise. */
export function insertBlocks(index: number, created: DraftBlock[], focusKey: string | null, selectKey?: string | null): void {
  const { blocks } = useSheet.getState();
  const next = normalizeDepths([...blocks.slice(0, index), ...created, ...blocks.slice(index)]);
  const last = created[created.length - 1];
  commit(next, {
    selectedKey: selectKey === undefined ? (last?.key ?? null) : selectKey,
    focusRequest: focusKey ? { key: focusKey } : null
  });
}

/** Changes one block without a save: upload progress and failures live only on this screen. */
export function patchLocal(key: string, patch: Partial<DraftBlock>): void {
  const { blocks } = useSheet.getState();
  if (!blocks.some((block) => block.key === key)) return;
  useSheet.setState({ blocks: blocks.map((block) => (block.key === key ? { ...block, ...patch } : block)) });
}

/**
 * "Clique para escrever…": a new text block at the end, focused
 * (AC-pauta-revelavel-10). It takes the level of the selected block, but never
 * lands under a hidden or collapsed topic, where it could not be seen.
 */
export function appendTextBlock(): void {
  const { blocks, selectedKey, preparing } = useSheet.getState();
  const selected = blocks.find((block) => block.key === selectedKey);
  const block = makeTextBlock(blocks, { depth: selected?.depth ?? 0 });
  block.depth = Math.min(block.depth, (blocks[blocks.length - 1]?.depth ?? -1) + 1);
  while (block.depth > 0 && !mountedFlags([...blocks, block], preparing)[blocks.length]) block.depth -= 1;
  insertBlocks(blocks.length, [block], block.key);
}

/**
 * Enter twice at the end: the next block at the same level, or the first
 * sub-item when the current block has sub-items (AC-pauta-revelavel-11).
 */
export function continueAfter(key: string, trimmed: TextRun[]): void {
  replaceText(key, trimmed);
  const { blocks } = useSheet.getState();
  const index = blocks.findIndex((block) => block.key === key);
  if (index < 0) return;
  const current = blocks[index];
  const child = hasChildren(blocks, index);
  const currentSize = current.kind === 'text' ? current.size : DEFAULT_BLOCK_SIZE;
  // A first sub-item is one size below its topic, as Tab would make it.
  const block = makeTextBlock(blocks, {
    depth: child ? current.depth + 1 : current.depth,
    size: child ? stepSize(currentSize, 1) : currentSize
  });
  // A collapsed topic opens to show the sub-item being written.
  if (child && current.collapsed) {
    useSheet.setState({ blocks: blocks.map((entry) => (entry.key === key ? { ...entry, collapsed: false } : entry)) });
  }
  insertBlocks(index + 1, [block], block.key);
}

/** Removes a block; its sub-items move one level up. */
export function removeBlock(key: string, { focusPrevious = false } = {}): void {
  const { blocks, selectedKey } = useSheet.getState();
  const index = blocks.findIndex((block) => block.key === key);
  if (index < 0) return;
  const next = removeAndPromote(blocks, index);
  const mounted = mountedFlags(next, useSheet.getState().preparing);
  const previous = next.slice(0, index).findLast((block, position) => block.kind === 'text' && mounted[position]);
  commit(next, {
    selectedKey: selectedKey === key ? (previous?.key ?? null) : selectedKey,
    focusRequest: focusPrevious && previous ? { key: previous.key } : null
  });
}

export function selectBlock(key: string | null): void {
  if (useSheet.getState().selectedKey !== key) useSheet.setState({ selectedKey: key });
}

export function clearFocusRequest(): void {
  if (useSheet.getState().focusRequest) useSheet.setState({ focusRequest: null });
}

export function insertionIndexAfterSelected(): number {
  const { blocks, selectedKey } = useSheet.getState();
  const index = blocks.findIndex((block) => block.key === selectedKey);
  return index < 0 ? blocks.length : subtreeEnd(blocks, index);
}

export function setRundownTitle(title: string): void {
  const { rundown } = useSheet.getState();
  if (rundown) useSheet.setState({ rundown: { ...rundown, title } });
}

/** Merges a save answer: server ids by key, saved revision and edit time. */
export function applySaved(rundownId: string, result: SheetSaveResult, revision: number): void {
  const state = useSheet.getState();
  if (state.rundownId !== rundownId) return;
  const blocks = state.blocks.map((block) => {
    const id = result.ids[block.key];
    return id && block.id !== id ? { ...block, id } : block;
  });
  useSheet.setState({
    blocks,
    savedRevision: Math.max(state.savedRevision, revision),
    save: { phase: 'saved', at: result.savedAt },
    rundown: state.rundown ? { ...result.rundown, title: state.rundown.title } : result.rundown
  });
}

export function setSaveState(rundownId: string, save: SaveState): void {
  if (useSheet.getState().rundownId === rundownId) useSheet.setState({ save });
}

export function setAnnouncement(announcement: string): void {
  useSheet.setState({ announcement });
}
