// Text marks of a block (RULE-pauta-revelavel-06): only bold, the six theme
// colors and the line break (`\n`). Any other markup, pasted HTML included, has
// no way into this model.

export const TEXT_COLORS = ['text', 'accent', 'red', 'green', 'copper', 'lilac'] as const;
export type TextColor = (typeof TEXT_COLORS)[number];

export interface TextRun {
  text: string;
  bold?: boolean;
  color?: TextColor;
}

export function isTextColor(value: unknown): value is TextColor {
  return typeof value === 'string' && (TEXT_COLORS as readonly string[]).includes(value);
}

function sameMarks(a: TextRun, b: TextRun): boolean {
  return Boolean(a.bold) === Boolean(b.bold) && (a.color ?? null) === (b.color ?? null);
}

function cleanRun(text: string, bold: boolean, color: TextColor | undefined): TextRun {
  const run: TextRun = { text };
  if (bold) run.bold = true;
  if (color) run.color = color;
  return run;
}

/** Merges neighbouring runs with the same marks and drops empty runs. */
export function normalizeRuns(runs: TextRun[]): TextRun[] {
  const out: TextRun[] = [];
  for (const run of runs) {
    if (!run.text) continue;
    const previous = out[out.length - 1];
    if (previous && sameMarks(previous, run)) {
      previous.text += run.text;
    } else {
      out.push(cleanRun(run.text, Boolean(run.bold), run.color));
    }
  }
  return out;
}

/**
 * Accepts anything and returns only what the model keeps: text, bold and one of
 * the six colors. Unknown colors and any other property are dropped; `\r\n`
 * becomes `\n`.
 */
export function sanitizeRuns(raw: unknown): TextRun[] {
  if (!Array.isArray(raw)) return [];
  const runs: TextRun[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const item = entry as Record<string, unknown>;
    if (typeof item.text !== 'string') continue;
    const text = item.text.replace(/\r\n?/g, '\n');
    runs.push(cleanRun(text, item.bold === true, isTextColor(item.color) ? item.color : undefined));
  }
  return normalizeRuns(runs);
}

export function runsFromPlainText(text: string): TextRun[] {
  return normalizeRuns([{ text: text.replace(/\r\n?/g, '\n') }]);
}

export function plainText(runs: TextRun[]): string {
  return runs.map((run) => run.text).join('');
}

export function runsEqual(a: TextRun[], b: TextRun[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((run, index) => run.text === b[index].text && sameMarks(run, b[index]));
}

/** A mark the presenter applies to a passage: bold on or off, or one of the six colors. */
export type MarkChange = { bold: boolean } | { color: TextColor };

/**
 * Rewrites the characters between the plain-text offsets `start` and `end`
 * (in any order); the text outside keeps its marks.
 */
function mapRange(runs: TextRun[], start: number, end: number, change: (run: TextRun) => TextRun): TextRun[] {
  const from = Math.max(0, Math.min(start, end));
  const to = Math.max(start, end);
  const out: TextRun[] = [];
  let offset = 0;
  for (const run of runs) {
    const runStart = offset;
    const runEnd = offset + run.text.length;
    offset = runEnd;
    const cuts = [runStart, Math.min(Math.max(from, runStart), runEnd), Math.min(Math.max(to, runStart), runEnd), runEnd];
    for (let index = 0; index < 3; index += 1) {
      if (cuts[index + 1] <= cuts[index]) continue;
      const piece = { ...run, text: run.text.slice(cuts[index] - runStart, cuts[index + 1] - runStart) };
      out.push(index === 1 ? change(piece) : piece);
    }
  }
  return normalizeRuns(out);
}

/** The characters between two plain-text offsets, with their marks. */
export function sliceRuns(runs: TextRun[], start: number, end = Number.POSITIVE_INFINITY): TextRun[] {
  const from = Math.max(0, start);
  const out: TextRun[] = [];
  let offset = 0;
  for (const run of runs) {
    const runStart = offset;
    offset += run.text.length;
    const text = run.text.slice(Math.max(0, from - runStart), Math.max(0, end - runStart));
    if (text) out.push({ ...run, text });
  }
  return normalizeRuns(out);
}

/** Bold or a color on the passage only (AC-pauta-revelavel-37). */
export function applyMark(runs: TextRun[], start: number, end: number, mark: MarkChange): TextRun[] {
  return mapRange(runs, start, end, (run) => ('bold' in mark ? { ...run, bold: mark.bold } : { ...run, color: mark.color }));
}

/** "Normal": the passage loses bold and color. */
export function clearMarks(runs: TextRun[], start: number, end: number): TextRun[] {
  return mapRange(runs, start, end, (run) => ({ text: run.text }));
}

/** Every character of a non-empty passage is bold: Ctrl+B then takes bold away. */
export function isRangeBold(runs: TextRun[], start: number, end: number): boolean {
  const from = Math.max(0, Math.min(start, end));
  const to = Math.max(start, end);
  if (to <= from) return false;
  let offset = 0;
  for (const run of runs) {
    const runEnd = offset + run.text.length;
    if (runEnd > from && offset < to && !run.bold) return false;
    offset = runEnd;
  }
  return offset >= to;
}
