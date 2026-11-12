import { Fragment, useEffect, useMemo, useRef } from 'react';
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import { COPY } from '../../core/vocabulary';
import type { TextRun } from '../../../shared/textMarks';
import {
  caretAtEnd,
  needsTrailingBreak,
  placeCaretAtEnd,
  readRuns,
  selectOffsets,
  selectionOffsets,
  trimTrailingBreaks
} from './domText';
import { formatPassage } from './formatOps';
import { clearFocusRequest, continueAfter, removeBlock, selectBlock, updateText, useSheet } from './sheetStore';
import type { DraftBlock } from './sheetStore';
import { nextListItem } from './structureOps';

function renderRuns(runs: TextRun[]): ReactNode[] {
  const nodes: ReactNode[] = runs.map((run, index) => {
    let node: ReactNode = run.text;
    if (run.color) node = <span data-color={run.color}>{node}</span>;
    if (run.bold) node = <b>{node}</b>;
    return <Fragment key={index}>{node}</Fragment>;
  });
  if (needsTrailingBreak(runs)) nodes.push(<br key="end" />);
  return nodes;
}

interface TextBlockEditorProps {
  block: DraftBlock;
  /** Bumped when the text changed outside the editor: the editable element is rebuilt. */
  version: number;
}

/**
 * Ctrl+B bolds the selected passage, or takes the bold away when all of it is
 * bold (AC-pauta-revelavel-37). Italic and underline are not marks of the
 * sheet (RULE-pauta-revelavel-06): the browser never gets to apply them.
 */
function onMarkKey(event: KeyboardEvent<HTMLDivElement>, block: DraftBlock): boolean {
  if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return false;
  const key = event.key.toLowerCase();
  if (key !== 'b' && key !== 'i' && key !== 'u') return false;
  event.preventDefault();
  if (key !== 'b') return true;
  const editor = event.currentTarget;
  const passage = selectionOffsets(editor);
  if (passage) formatPassage(block.key, readRuns(editor), passage.start, passage.end, { kind: 'toggle-bold' });
  return true;
}

/**
 * Enter in a sub-item works as in a list: the next item at the same level, or
 * one level up on an empty item. Shift+Enter breaks the line inside the item.
 */
function onListEnter(editor: HTMLDivElement, block: DraftBlock, shiftKey: boolean): void {
  if (shiftKey) {
    document.execCommand('insertLineBreak');
    return;
  }
  const selected = selectionOffsets(editor);
  if (selected && selected.start !== selected.end) document.execCommand('delete');
  const caret = selectionOffsets(editor)?.start ?? Number.POSITIVE_INFINITY;
  nextListItem(block.key, readRuns(editor), caret);
}

function onEditorKeyDown(event: KeyboardEvent<HTMLDivElement>, block: DraftBlock, enterAtEnd: { current: boolean }) {
  const editor = event.currentTarget;
  if (onMarkKey(event, block)) return;
  if (event.key === 'Enter' && !event.ctrlKey && !event.metaKey && !event.altKey) {
    event.preventDefault();
    if (block.depth > 0) {
      onListEnter(editor, block, event.shiftKey);
      return;
    }
    const atEnd = caretAtEnd(editor);
    if (atEnd && enterAtEnd.current) {
      enterAtEnd.current = false;
      continueAfter(block.key, trimTrailingBreaks(readRuns(editor)));
      return;
    }
    document.execCommand('insertLineBreak');
    enterAtEnd.current = atEnd;
    return;
  }
  if (event.key === 'Backspace' && readRuns(editor).length === 0) {
    event.preventDefault();
    removeBlock(block.key, { focusPrevious: true });
    return;
  }
  if (event.key === 'Escape') {
    editor.blur();
  }
}

/**
 * In-place text editing of a block: on a topic Enter breaks the line and Enter
 * twice at the end opens the next block; in a sub-item Enter opens the next
 * item, as in a list. Backspace on an empty block removes it and Esc
 * leaves the text (AC-pauta-revelavel-11, AC-pauta-revelavel-53). A paste in
 * the text goes in at the caret as plain text through the sheet's paste
 * handler (useSheetInput, AC-pauta-revelavel-14). Ctrl+B bolds the selected
 * passage (AC-pauta-revelavel-37). Spell check is off so no squiggle ever
 * reaches the capture (RULE-pauta-revelavel-01).
 */
export function TextBlockEditor({ block, version }: TextBlockEditorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const enterAtEnd = useRef(false);
  const focusRequest = useSheet((state) => (state.focusRequest?.key === block.key ? state.focusRequest : null));
  // The editable children are built from the model only when `version` changes;
  // while typing, the browser owns the DOM and the model follows it.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const children = useMemo(() => renderRuns(block.content), [version]);

  useEffect(() => {
    if (!focusRequest || !ref.current) return;
    const { selection } = focusRequest;
    if (selection) selectOffsets(ref.current, selection.start, selection.end);
    else placeCaretAtEnd(ref.current);
    ref.current.scrollIntoView({ block: 'nearest' });
    clearFocusRequest();
  }, [focusRequest, version]);

  const style = { '--font-size': `${block.fontPx}px` } as CSSProperties;
  return (
    <div
      key={version}
      ref={ref}
      className={`text size-${block.size}${block.content.length ? '' : ' is-empty'}`}
      style={style}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      role="textbox"
      aria-multiline="true"
      aria-label={COPY.sheet.textLabel}
      data-placeholder={COPY.sheet.textPlaceholder}
      data-testid="block-text"
      onFocus={() => {
        // "Enter twice" means two presses in a row: coming back to the text starts over.
        enterAtEnd.current = false;
        selectBlock(block.key);
      }}
      onInput={(event) => {
        if ((event.nativeEvent as InputEvent).inputType !== 'insertLineBreak') enterAtEnd.current = false;
        updateText(block.key, readRuns(event.currentTarget));
      }}
      onKeyDown={(event) => onEditorKeyDown(event, block, enterAtEnd)}
    >
      {children}
    </div>
  );
}
