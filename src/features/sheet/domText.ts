import { isTextColor, normalizeRuns, plainText } from '../../../shared/textMarks';
import type { TextColor, TextRun } from '../../../shared/textMarks';

/**
 * DOM ↔ text runs for the block editor. The editor renders runs as `<b>` and
 * `<span data-color>`; whatever the browser does while typing is read back
 * here, keeping only bold, the six colors and line breaks.
 *
 * Line breaks: the editor uses `white-space: pre-wrap`, so a break may be a
 * `\n` in a text node or a `<br>`. The last line terminator of a block never
 * shows on screen, so it is not part of the text: rendering adds one `<br>`
 * after a trailing `\n`, and reading drops one trailing terminator.
 */

interface Marks {
  bold?: boolean;
  color?: TextColor;
}

function isBoldElement(element: HTMLElement): boolean {
  if (element.tagName === 'B' || element.tagName === 'STRONG') return true;
  const weight = element.style.fontWeight;
  return weight === 'bold' || Number(weight) >= 600;
}

function endsWithBreak(runs: TextRun[]): boolean {
  const last = runs[runs.length - 1];
  return !last || last.text.endsWith('\n');
}

function walk(node: Node, marks: Marks, out: TextRun[]): void {
  if (node.nodeType === Node.TEXT_NODE) {
    out.push({ text: node.nodeValue ?? '', ...marks });
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const element = node as HTMLElement;
  if (element.tagName === 'BR') {
    out.push({ text: '\n', ...marks });
    return;
  }
  const next: Marks = { ...marks };
  if (isBoldElement(element)) next.bold = true;
  const color = element.dataset.color;
  if (isTextColor(color)) next.color = color;
  if ((element.tagName === 'DIV' || element.tagName === 'P') && !endsWithBreak(out)) {
    out.push({ text: '\n', ...marks });
  }
  element.childNodes.forEach((child) => walk(child, next, out));
}

function lastLeaf(root: Node): Node | null {
  let node: Node | null = root.lastChild;
  while (node && node.lastChild) node = node.lastChild;
  return node;
}

function dropTrailingTerminator(runs: TextRun[]): TextRun[] {
  const last = runs[runs.length - 1];
  if (!last || !last.text.endsWith('\n')) return runs;
  const trimmed = last.text.slice(0, -1);
  return trimmed ? [...runs.slice(0, -1), { ...last, text: trimmed }] : runs.slice(0, -1);
}

export function readRuns(root: HTMLElement): TextRun[] {
  const out: TextRun[] = [];
  root.childNodes.forEach((child) => walk(child, {}, out));
  const leaf = lastLeaf(root);
  const terminated =
    leaf !== null &&
    ((leaf.nodeType === Node.ELEMENT_NODE && (leaf as HTMLElement).tagName === 'BR') ||
      (leaf.nodeType === Node.TEXT_NODE && (leaf.nodeValue ?? '').endsWith('\n')));
  const runs = normalizeRuns(out.map((run) => ({ ...run, text: run.text.replace(/ /g, ' ') })));
  return terminated ? normalizeRuns(dropTrailingTerminator(runs)) : runs;
}

/** Whether the rendered text needs the extra `<br>` that makes a trailing break visible. */
export function needsTrailingBreak(runs: TextRun[]): boolean {
  return plainText(runs).endsWith('\n');
}

/** Removes trailing line breaks and spaces (Enter twice at the end). */
export function trimTrailingBreaks(runs: TextRun[]): TextRun[] {
  const out = runs.map((run) => ({ ...run }));
  while (out.length) {
    const last = out[out.length - 1];
    last.text = last.text.replace(/[\s ]+$/, '');
    if (last.text) break;
    out.pop();
  }
  return normalizeRuns(out);
}

/** Collapsed caret with only whitespace or line breaks after it. */
export function caretAtEnd(root: HTMLElement): boolean {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount || !selection.isCollapsed) return false;
  const focus = selection.focusNode;
  if (!focus || !root.contains(focus)) return false;
  const range = document.createRange();
  range.selectNodeContents(root);
  range.setStart(focus, selection.focusOffset);
  return range.toString().replace(/[\s ]/g, '').length === 0;
}

export function placeCaretAtEnd(root: HTMLElement): void {
  root.focus({ preventScroll: true });
  const range = document.createRange();
  range.selectNodeContents(root);
  range.collapse(false);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

/**
 * Plain text in at the caret of the focused editor, line by line, the same
 * way Enter breaks a line. The browser fires `input`, so undo keeps working.
 */
export function insertTextAtCaret(text: string): void {
  text.split('\n').forEach((line, index) => {
    if (index > 0) document.execCommand('insertLineBreak');
    if (line) document.execCommand('insertText', false, line);
  });
}

/**
 * Plain-text offset of a boundary point, counted the way `readRuns` reads the
 * editor: a `<br>` is one line break. The trailing terminator is not dropped
 * here: inside a text a line break before the point is real.
 */
function textBefore(root: HTMLElement, node: Node, offset: number): string {
  const range = document.createRange();
  range.selectNodeContents(root);
  range.setEnd(node, offset);
  const holder = document.createElement('div');
  holder.append(range.cloneContents());
  const out: TextRun[] = [];
  holder.childNodes.forEach((child) => walk(child, {}, out));
  return out.map((run) => run.text).join('');
}

function offsetOf(root: HTMLElement, node: Node, offset: number): number {
  return textBefore(root, node, offset).length;
}

/** Where the caret's line starts and where the caret is, as plain-text offsets. */
export interface CaretLine {
  lineStart: number;
  caret: number;
}

/**
 * The line of a collapsed caret when it is not the first line of the text
 * (some line break comes before it), or `null` on the first line or with a
 * passage selected.
 */
export function caretOnLaterLine(root: HTMLElement): CaretLine | null {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount || !selection.isCollapsed) return null;
  const focus = selection.focusNode;
  if (!focus || !root.contains(focus)) return null;
  const before = textBefore(root, focus, selection.focusOffset);
  const lineStart = before.lastIndexOf('\n') + 1;
  return lineStart > 0 ? { lineStart, caret: before.length } : null;
}

/** The selected passage of an editor as plain-text offsets, or `null` when the selection is elsewhere. */
export function selectionOffsets(root: HTMLElement): { start: number; end: number } | null {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) return null;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null;
  return {
    start: offsetOf(root, range.startContainer, range.startOffset),
    end: offsetOf(root, range.endContainer, range.endOffset)
  };
}

/** The DOM point of a plain-text offset in an editor rendered from runs (text, `<b>`, `<span>`, `<br>`). */
function pointAt(root: HTMLElement, target: number): [Node, number] {
  let remaining = Math.max(0, target);
  let last: [Node, number] = [root, 0];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.nodeType === Node.TEXT_NODE) {
      const length = node.nodeValue?.length ?? 0;
      if (remaining <= length) return [node, remaining];
      remaining -= length;
      last = [node, length];
    } else if ((node as HTMLElement).tagName === 'BR' && node.parentNode) {
      const index = Array.prototype.indexOf.call(node.parentNode.childNodes, node) as number;
      if (remaining === 0) return [node.parentNode, index];
      remaining -= 1;
      last = [node.parentNode, index + 1];
    }
  }
  return last;
}

/** Focuses the editor with the passage between two plain-text offsets selected. */
export function selectOffsets(root: HTMLElement, start: number, end: number): void {
  root.focus({ preventScroll: true });
  const range = document.createRange();
  range.setStart(...pointAt(root, start));
  range.setEnd(...pointAt(root, end));
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}
