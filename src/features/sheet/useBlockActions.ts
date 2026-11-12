import { useMemo, useRef } from 'react';
import { COPY } from '../../core/vocabulary';
import { useToast } from '../../ui/Toast';
import { placeCaretAtEnd } from './domText';
import type { BlockSize } from '../../../shared/blockSize';
import { adjustBlockFont, setBlockSize } from './formatOps';
import { setAnnouncement, useSheet } from './sheetStore';
import { branchLine, moveBlockBefore, moveBlockBy, restoreOrder, shiftBlock } from './structureOps';
import type { MoveResult, OrderSnapshot, ShiftOutcome } from './structureOps';
import type { TextRun } from '../../../shared/textMarks';

/** A burst of moves of the same block shares one "Desfazer", back to the order before the burst. */
const BURST_MS = 5000;

export interface BlockActions {
  shift(key: string, delta: 1 | -1): void;
  /**
   * Tab / Shift+Tab on a later line: the lines from `offset` on become the
   * first sub-item (`delta` 1) or an item one level up (-1), the caret kept at `caret`.
   */
  branch(key: string, runs: TextRun[], offset: number, caret: number, delta: 1 | -1): void;
  moveBy(key: string, direction: -1 | 1): void;
  moveBefore(key: string, beforeKey: string | null): void;
  resize(key: string, size: BlockSize): void;
  adjustFont(key: string, direction: 1 | -1): void;
}

function announceSize(key: string): void {
  const block = useSheet.getState().blocks.find((entry) => entry.key === key);
  if (block && block.kind === 'text') setAnnouncement(COPY.format.sizeAnnounced(COPY.format.sizes[block.size].name, block.fontPx));
}

/**
 * Moving a block re-inserts its element: the focus it held (text or handle)
 * comes back once the sheet has re-rendered.
 */
function keepFocus(): void {
  const active = document.activeElement as HTMLElement | null;
  if (!active || active === document.body) return;
  requestAnimationFrame(() => {
    if (!active.isConnected) return;
    if (document.activeElement !== active) {
      if (active.isContentEditable) placeCaretAtEnd(active);
      else active.focus({ preventScroll: true });
    }
    active.scrollIntoView({ block: 'nearest' });
  });
}

/**
 * The sheet's structural commands with their feedback: the refusal toast of
 * Tab (BR-pauta-revelavel-08), the "Desfazer" toast of a move (D1), the range
 * limit of A−/A+ (AC-pauta-revelavel-36) and the live-region announcement for
 * screen readers (AC-pauta-revelavel-44).
 */
export function useBlockActions(): BlockActions {
  const toast = useToast();
  const lastMove = useRef<{ key: string; snapshot: OrderSnapshot; at: number } | null>(null);

  return useMemo(() => {
    const report = (key: string, result: MoveResult | null) => {
      if (!result) return;
      const now = Date.now();
      const previous = lastMove.current;
      const snapshot = previous && previous.key === key && now - previous.at < BURST_MS ? previous.snapshot : result.snapshot;
      lastMove.current = { key, snapshot, at: now };
      setAnnouncement(COPY.sheet.movedTo(result.position, result.total));
      toast.clear();
      toast.push(COPY.sheet.moved, {
        label: COPY.sheet.undo,
        onSelect: () => {
          lastMove.current = null;
          restoreOrder(snapshot);
          setAnnouncement(COPY.sheet.orderRestored);
        }
      });
    };

    const refuse = (outcome: ShiftOutcome) => {
      if (outcome === 'no-parent') toast.push(COPY.sheet.indentNoParent);
      if (outcome === 'too-deep') toast.push(COPY.sheet.indentTooDeep);
    };

    return {
      shift(key, delta) {
        refuse(shiftBlock(key, delta));
      },
      branch(key, runs, offset, caret, delta) {
        refuse(branchLine(key, runs, offset, caret, delta));
      },
      moveBy(key, direction) {
        keepFocus();
        report(key, moveBlockBy(key, direction));
      },
      moveBefore(key, beforeKey) {
        report(key, moveBlockBefore(key, beforeKey));
      },
      resize(key, size) {
        if (setBlockSize(key, size)) announceSize(key);
      },
      adjustFont(key, direction) {
        const outcome = adjustBlockFont(key, direction);
        if (outcome?.kind === 'changed') announceSize(key);
        if (outcome?.kind === 'limit') {
          toast.push(COPY.format.rangeLimit(COPY.format.sizes[outcome.size].name, outcome.minPx, outcome.maxPx));
        }
      }
    };
  }, [toast]);
}
