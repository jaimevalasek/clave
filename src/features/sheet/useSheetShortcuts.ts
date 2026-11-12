import { useEffect } from 'react';
import { BLOCK_SIZES } from '../../../shared/blockSize';
import type { BlockSize } from '../../../shared/blockSize';
import { caretOnLaterLine, readRuns } from './domText';
import { useSheet } from './sheetStore';
import { requestDelete } from './structureOps';
import type { BlockActions } from './useBlockActions';
import type { RevealActions } from './useRevealActions';

export const BLOCK_SELECTOR = '[data-testid="sheet-block"]';
export const EDITOR_SELECTOR = '[data-testid="block-text"]';

/** The block whose text holds the caret, or whose own element holds the focus ("foco na folha"). */
function blockKeyUnderFocus(target: HTMLElement): string | null {
  const editor = target.closest(EDITOR_SELECTOR);
  if (editor) return editor.closest<HTMLElement>(BLOCK_SELECTOR)?.dataset.key ?? null;
  return target.matches(BLOCK_SELECTOR) ? (target.dataset.key ?? null) : null;
}

function isFormField(target: HTMLElement): boolean {
  return Boolean(target.closest('input, textarea, select'));
}

/**
 * The take keys run in the capture phase, before any editor or field sees
 * them, so they work with the caret inside a text and never insert anything
 * there (AC-pauta-revelavel-26). A presenter remote sends the same PageDown
 * and PageUp. Ctrl+Enter plays or pauses the media (AC-pauta-revelavel-33).
 * While a modal is open, the modal owns the keyboard.
 */
function useTakeKeys(reveal: RevealActions): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (document.querySelector('[role="dialog"]')) return;
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && !event.altKey && !event.shiftKey) {
        event.preventDefault();
        reveal.toggleMedia();
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === 'PageDown') {
        event.preventDefault();
        if (event.shiftKey) reveal.revealTopic();
        else reveal.revealNext();
      } else if (event.key === 'PageUp') {
        event.preventDefault();
        reveal.hideLast();
      } else if (event.key === 'F2' && !event.shiftKey) {
        event.preventDefault();
        reveal.togglePreparation();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [reveal]);
}

/** Ctrl+Alt+1 to 4 (top row or keypad), by physical key: AltGr layouts type ¹²³ there. */
function sizeForKey(code: string): BlockSize | null {
  const match = /^(?:Digit|Numpad)([1-4])$/.exec(code);
  return match ? BLOCK_SIZES[Number(match[1]) - 1] : null;
}

function stepForKey(code: string): 1 | -1 | 0 {
  if (code === 'Equal' || code === 'NumpadAdd') return 1;
  if (code === 'Minus' || code === 'NumpadSubtract') return -1;
  return 0;
}

/**
 * Size keys (AC-pauta-revelavel-35, -36): Ctrl+Alt+1 to 4 pick P, M, G or
 * Título and Ctrl+Alt+− / Ctrl+Alt+= adjust 4 px, on the text holding the
 * caret or the selected text block. They run in the capture phase so nothing
 * is typed into the text.
 */
function useSizeKeys(actions: BlockActions): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.ctrlKey || !event.altKey || event.metaKey || event.shiftKey) return;
      if (document.querySelector('[role="dialog"]')) return;
      const size = sizeForKey(event.code);
      const step = stepForKey(event.code);
      if (!size && !step) return;
      const target = event.target instanceof HTMLElement ? event.target : document.body;
      if (isFormField(target)) return;
      const key = blockKeyUnderFocus(target) ?? useSheet.getState().selectedKey;
      const block = useSheet.getState().blocks.find((entry) => entry.key === key);
      if (!key || block?.kind !== 'text') return;
      event.preventDefault();
      if (size) actions.resize(key, size);
      else actions.adjustFont(key, step as 1 | -1);
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [actions]);
}

/**
 * Keyboard of the sheet (BR-pauta-revelavel-12):
 * - PageDown reveals the next block, Shift+PageDown the next topic, PageUp
 *   hides the last step and F2 toggles the preparation view.
 * - Tab / Shift+Tab indent and outdent the block in edition, or the block
 *   whose element holds the focus; on a button or field Tab navigates as usual.
 *   With the caret on a later line of a text (Enter, then Tab), the block
 *   stays where it is and that line and the ones below become its sub-item
 *   (Tab) or, in a sub-item, an item one level up (Shift+Tab).
 * - Alt+→ / Alt+← do the same for the selected block, Alt+↑ / Alt+↓ move it.
 * - Delete asks to delete the selected block when no text is being edited.
 * - Ctrl+Alt+1 to 4 and Ctrl+Alt+− / = size the text block.
 * Nothing here runs while a modal is open: the modal owns the keyboard.
 */
export function useSheetShortcuts(actions: BlockActions, reveal: RevealActions): void {
  useTakeKeys(reveal);
  useSizeKeys(actions);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey) return;
      const target = event.target instanceof HTMLElement ? event.target : document.body;
      const { selectedKey, pendingDeleteKey } = useSheet.getState();
      if (pendingDeleteKey || target.closest('[role="dialog"]')) return;

      if (event.key === 'Tab' && !event.altKey) {
        const key = blockKeyUnderFocus(target);
        if (!key) return;
        event.preventDefault();
        const delta = event.shiftKey ? -1 : 1;
        const editor = target.closest<HTMLElement>(EDITOR_SELECTOR);
        const depth = Number(editor?.closest<HTMLElement>(BLOCK_SELECTOR)?.dataset.depth ?? 0);
        // On a topic, Shift+Tab on a later line has no level to go up to.
        const line = editor && (delta > 0 || depth > 0) ? caretOnLaterLine(editor) : null;
        if (editor && line) actions.branch(key, readRuns(editor), line.lineStart, line.caret, delta);
        else actions.shift(key, delta);
        return;
      }
      if (!selectedKey || isFormField(target)) return;

      if (event.altKey && !event.shiftKey) {
        const shift = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
        const move = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
        if (shift) {
          event.preventDefault();
          actions.shift(selectedKey, shift);
        } else if (move) {
          event.preventDefault();
          actions.moveBy(selectedKey, move);
        }
        return;
      }
      if (event.key === 'Delete' && !event.altKey && !event.shiftKey && !target.closest(EDITOR_SELECTOR)) {
        event.preventDefault();
        requestDelete(selectedKey);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [actions]);
}
