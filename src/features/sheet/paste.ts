import { MAX_DEPTH } from '../../../shared/sheetTree';
import { MAX_BLOCK_TEXT_LENGTH } from '../../../shared/validation/sheet';

// Pasted text becomes blocks (CAP-pauta-revelavel-entrada). Pure: no DOM, no
// store. Only `text/plain` ever reaches here, so the formatting of the source
// is already gone (AC-pauta-revelavel-13, -14). A URL is plain text too: it
// becomes a text block with the URL (AC-pauta-revelavel-19).

/** One line of a pasted list: its text without the marker, and its level 0..2. */
export interface PastedListItem {
  text: string;
  level: number;
}

export type PastedText =
  | { kind: 'list'; items: PastedListItem[] }
  | { kind: 'paragraphs'; paragraphs: string[] };

/** "-", "*", "+", "•", "◦", "–", "1." or "1)" followed by a space opens a list item. */
const LIST_MARKER = /^\s*(?:[-*+•◦–]|\d+[.)])\s+/;
/** A line indented by a tab or by two spaces or more. */
const INDENTED = /^(?:\t| {2,})\S/;
/** A blank line (spaces allowed) between two paragraphs; Windows breaks are already `\n`. */
const BLANK_LINE = /\n(?:[ \t]*\n)+/;

export function normalizeLineBreaks(text: string): string {
  return text.replace(/\r\n?/g, '\n');
}

/** Splits a paragraph that would not fit in one block, at a space when there is one. */
function fitInBlocks(paragraph: string, limit = MAX_BLOCK_TEXT_LENGTH): string[] {
  const parts: string[] = [];
  let rest = paragraph;
  while (rest.length > limit) {
    const space = rest.lastIndexOf(' ', limit);
    const cut = space > limit / 2 ? space : limit;
    parts.push(rest.slice(0, cut).trimEnd());
    rest = rest.slice(cut).trimStart();
  }
  if (rest) parts.push(rest);
  return parts;
}

/** One block per paragraph; a blank line separates paragraphs, a single break stays inside the block. */
export function splitParagraphs(text: string): string[] {
  return normalizeLineBreaks(text)
    .split(BLANK_LINE)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .flatMap((paragraph) => fitInBlocks(paragraph));
}

/** At least two lines and one of them with a list marker or an indent. */
export function looksLikeList(text: string): boolean {
  const lines = normalizeLineBreaks(text)
    .split('\n')
    .filter((line) => line.trim());
  return lines.length >= 2 && lines.some((line) => LIST_MARKER.test(line) || INDENTED.test(line));
}

function indentWidth(line: string): number {
  return (/^[ \t]*/.exec(line)?.[0] ?? '').replace(/\t/g, '    ').length;
}

/**
 * One item per non-blank line. The level comes from the order of the indents
 * found in the list: the smallest indent is level 0, the next one level 1, and
 * anything deeper stays at level 2 (AC-pauta-revelavel-15).
 */
export function listItems(text: string): PastedListItem[] {
  const lines = normalizeLineBreaks(text)
    .split('\n')
    .filter((line) => line.trim());
  const indents = lines.map(indentWidth);
  const steps = [...new Set(indents)].sort((a, b) => a - b);
  return lines
    .map((line, index) => ({
      text: line.replace(LIST_MARKER, '').trim(),
      level: Math.min(MAX_DEPTH, steps.indexOf(indents[index]))
    }))
    .filter((item) => item.text);
}

/** What a paste of plain text becomes, or null when it holds nothing but blanks. */
export function parsePastedText(text: string): PastedText | null {
  if (looksLikeList(text)) {
    const items = listItems(text);
    return items.length ? { kind: 'list', items } : null;
  }
  const paragraphs = splitParagraphs(text);
  return paragraphs.length ? { kind: 'paragraphs', paragraphs } : null;
}

/**
 * A paste with the caret inside a block (AC-pauta-revelavel-14): what comes
 * before the first blank line goes in at the caret, as it is; every paragraph
 * after it becomes a block of its own.
 */
export function splitAtCaret(text: string): { atCaret: string; after: string[] } {
  const normalized = normalizeLineBreaks(text);
  const match = BLANK_LINE.exec(normalized);
  if (!match) return { atCaret: normalized.replace(/\n+$/, ''), after: [] };
  return {
    atCaret: normalized.slice(0, match.index),
    after: splitParagraphs(normalized.slice(match.index + match[0].length))
  };
}
