import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { COPY } from '../../core/vocabulary';
import { useToast } from '../../ui/Toast';
import { insertTextAtCaret, readRuns } from './domText';
import { intakeFiles } from './mediaIntake';
import { parsePastedText, splitAtCaret } from './paste';
import { insertionAfterSelected, insertionBefore, pasteAfterBlock, pasteList, pasteParagraphs } from './pasteOps';
import { updateText, useSheet } from './sheetStore';
import { BLOCK_SELECTOR, EDITOR_SELECTOR } from './useSheetShortcuts';

/** The sheet takes no paste or drop while a modal holds the screen or a form field has the focus. */
function blocked(target: EventTarget | null): boolean {
  if (useSheet.getState().status !== 'ready' || document.querySelector('[role="dialog"]')) return true;
  return target instanceof HTMLElement && Boolean(target.closest('input, textarea, select'));
}

function filesOf(data: DataTransfer | null): File[] {
  if (!data) return [];
  if (data.files.length) return [...data.files];
  return [...data.items].flatMap((item) => {
    const file = item.kind === 'file' ? item.getAsFile() : null;
    return file ? [file] : [];
  });
}

function hasFiles(event: DragEvent): boolean {
  return [...(event.dataTransfer?.types ?? [])].includes('Files');
}

/**
 * Text pasted with the caret in a block (AC-pauta-revelavel-14): the first
 * paragraph goes in at the caret, without the source formatting; the
 * paragraphs after a blank line become the next blocks.
 */
function pasteAtCaret(editor: HTMLElement, text: string): void {
  const key = editor.closest<HTMLElement>(BLOCK_SELECTOR)?.dataset.key;
  if (!key) return;
  const { atCaret, after } = splitAtCaret(text);
  if (atCaret) {
    insertTextAtCaret(atCaret);
    updateText(key, readRuns(editor));
  }
  pasteAfterBlock(key, after);
}

/** Ctrl+V on the sheet (CAP-pauta-revelavel-entrada); returns the toast to show, if any. */
function handlePaste(event: ClipboardEvent): string | null {
  const files = filesOf(event.clipboardData);
  if (files.length) {
    event.preventDefault();
    intakeFiles(files, insertionAfterSelected());
    return null;
  }
  const text = event.clipboardData?.getData('text/plain') ?? '';
  const parsed = parsePastedText(text);
  if (parsed?.kind === 'list') {
    event.preventDefault();
    return COPY.sheet.pastedList(pasteList(parsed.items));
  }
  const editor = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>(EDITOR_SELECTOR) : null;
  if (editor) {
    // Only plain text ever enters a block: the source formatting stays out.
    event.preventDefault();
    if (text) pasteAtCaret(editor, text);
    return null;
  }
  if (!parsed) return null;
  event.preventDefault();
  const count = pasteParagraphs(parsed.paragraphs);
  return count > 1 ? COPY.sheet.pastedBlocks(count) : null;
}

/** The block a drop at `clientY` lands before: the first one on the page whose middle is below it. */
function dropTarget(column: HTMLElement | null, clientY: number): string | null {
  const blocks = column ? [...column.querySelectorAll<HTMLElement>(`${BLOCK_SELECTOR}:not(.leaving)`)] : [];
  const before = blocks.find((block) => {
    const rect = block.getBoundingClientRect();
    return clientY < rect.top + rect.height / 2;
  });
  return before?.dataset.key ?? null;
}

/**
 * Files dragged over the window show "Solte para criar blocos aqui"; the drop
 * creates the blocks where it happened (AC-pauta-revelavel-17). Every file
 * drag is taken, so a dropped file never makes the window leave the app.
 */
function useFileDrop(columnRef: RefObject<HTMLElement | null>): boolean {
  const [dropping, setDropping] = useState(false);
  const depth = useRef(0);
  useEffect(() => {
    const onEnter = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      depth.current += 1;
      setDropping(true);
    };
    const onLeave = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setDropping(false);
    };
    const onOver = (event: DragEvent) => {
      if (hasFiles(event)) event.preventDefault();
    };
    const onDrop = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      depth.current = 0;
      setDropping(false);
      if (blocked(null)) return;
      intakeFiles(filesOf(event.dataTransfer), insertionBefore(dropTarget(columnRef.current, event.clientY)));
    };
    window.addEventListener('dragenter', onEnter);
    window.addEventListener('dragleave', onLeave);
    window.addEventListener('dragover', onOver);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onEnter);
      window.removeEventListener('dragleave', onLeave);
      window.removeEventListener('dragover', onOver);
      window.removeEventListener('drop', onDrop);
    };
  }, [columnRef]);
  return dropping;
}

/**
 * Everything that enters the sheet without typing: paste and drop. Returns
 * whether files are being dragged over the window, for the drop overlay.
 */
export function useSheetInput(columnRef: RefObject<HTMLElement | null>): boolean {
  const toast = useToast();
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (event.defaultPrevented || blocked(event.target)) return;
      const message = handlePaste(event);
      if (message) toast.push(message);
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [toast]);
  return useFileDrop(columnRef);
}
