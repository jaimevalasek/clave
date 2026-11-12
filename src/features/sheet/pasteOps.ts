import { DEFAULT_BLOCK_SIZE } from '../../../shared/blockSize';
import type { BlockSize } from '../../../shared/blockSize';
import { MAX_DEPTH, subtreeEnd } from '../../../shared/sheetTree';
import { runsFromPlainText } from '../../../shared/textMarks';
import type { PastedListItem } from './paste';
import { insertBlocks, makeTextBlock, useSheet } from './sheetStore';
import type { DraftBlock } from './sheetStore';
import { markEntered } from './takeOps';

// Pasted text into the store (CAP-pauta-revelavel-entrada). The operations
// return how many blocks they created; the UI layer (useSheetInput) owns the
// toasts. New blocks come from the same factory as typed ones, so they are born
// dimmed in preparation and on screen while recording.

/** Where new blocks land, at which level and in which size. */
export interface InsertionPoint {
  index: number;
  depth: number;
  size: BlockSize;
}

/** Sub-items paste in the small size (AC-pauta-revelavel-15). */
function sizeForDepth(depth: number): BlockSize {
  return depth > 0 ? 'small' : DEFAULT_BLOCK_SIZE;
}

function sizeBeside(block: DraftBlock): BlockSize {
  return block.kind === 'text' ? block.size : sizeForDepth(block.depth);
}

/** Right after a block and its sub-items, at its level (AC-pauta-revelavel-13). */
function pointAfter(blocks: DraftBlock[], index: number): InsertionPoint {
  const block = blocks[index];
  return { index: subtreeEnd(blocks, index), depth: block.depth, size: sizeBeside(block) };
}

/** After the selected block and its sub-items; without a selection, at the end of the sheet. */
export function insertionAfterSelected(): InsertionPoint {
  const { blocks, selectedKey } = useSheet.getState();
  const index = blocks.findIndex((block) => block.key === selectedKey);
  return index < 0 ? { index: blocks.length, depth: 0, size: DEFAULT_BLOCK_SIZE } : pointAfter(blocks, index);
}

/** Before the block with `beforeKey` and at its level (a drop), or at the end of the sheet. */
export function insertionBefore(beforeKey: string | null): InsertionPoint {
  const { blocks } = useSheet.getState();
  const index = beforeKey === null ? -1 : blocks.findIndex((block) => block.key === beforeKey);
  if (index < 0) return { index: blocks.length, depth: 0, size: DEFAULT_BLOCK_SIZE };
  return { index, depth: blocks[index].depth, size: sizeBeside(blocks[index]) };
}

function insertText(at: InsertionPoint, created: DraftBlock[], selectKey?: string): number {
  insertBlocks(at.index, created, null, selectKey);
  markEntered(created.map((block) => block.key));
  return created.length;
}

/** One block per paragraph, all at the level of the insertion point (AC-pauta-revelavel-13, -19). */
export function pasteParagraphs(paragraphs: string[], at: InsertionPoint = insertionAfterSelected()): number {
  if (!paragraphs.length) return 0;
  const { blocks } = useSheet.getState();
  const created = paragraphs.map((text) =>
    makeTextBlock(blocks, { depth: at.depth, size: at.size, content: runsFromPlainText(text) })
  );
  return insertText(at, created);
}

/** One block per list item, each list level one sheet level deeper, up to 3 (AC-pauta-revelavel-15). */
export function pasteList(items: PastedListItem[], at: InsertionPoint = insertionAfterSelected()): number {
  if (!items.length) return 0;
  const { blocks } = useSheet.getState();
  const created = items.map((item) => {
    const depth = Math.min(MAX_DEPTH, at.depth + item.level);
    return makeTextBlock(blocks, { depth, size: sizeForDepth(depth), content: runsFromPlainText(item.text) });
  });
  return insertText(at, created);
}

/**
 * The paragraphs that follow a paste at the caret become the next blocks
 * (AC-pauta-revelavel-14). The edited block stays selected: its caret is
 * where the presenter is still writing.
 */
export function pasteAfterBlock(key: string, paragraphs: string[]): number {
  const { blocks } = useSheet.getState();
  const index = blocks.findIndex((block) => block.key === key);
  if (index < 0 || !paragraphs.length) return 0;
  const at = pointAfter(blocks, index);
  const created = paragraphs.map((text) =>
    makeTextBlock(blocks, { depth: at.depth, size: at.size, content: runsFromPlainText(text) })
  );
  return insertText(at, created, key);
}
