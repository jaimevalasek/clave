import { describe, expect, it } from 'vitest';
import {
  applyMark,
  clearMarks,
  isRangeBold,
  normalizeRuns,
  plainText,
  runsFromPlainText,
  sanitizeRuns,
  sliceRuns
} from '../../shared/textMarks';

describe('AC-pauta-revelavel-39 — text keeps only bold, the six colors and line breaks', () => {
  it('keeps bold and the six theme colors', () => {
    const runs = sanitizeRuns([
      { text: 'a', color: 'text' },
      { text: 'b', color: 'accent' },
      { text: 'c', color: 'red' },
      { text: 'd', color: 'green' },
      { text: 'e', color: 'copper' },
      { text: 'f', color: 'lilac', bold: true }
    ]);
    expect(runs.map((run) => run.color)).toEqual(['text', 'accent', 'red', 'green', 'copper', 'lilac']);
    expect(runs[5].bold).toBe(true);
  });

  it('AC-pauta-revelavel-39 discards every other mark, including HTML that came from a paste', () => {
    expect(
      sanitizeRuns([
        { text: '<b>não é negrito</b>', html: '<b>x</b>', italic: true, underline: true, font: 'Arial' },
        { text: ' e', color: '#FF0000', bold: 'yes' },
        { text: ' fim', color: 'magenta', link: 'https://exemplo.com' }
      ])
    ).toEqual([{ text: '<b>não é negrito</b> e fim' }]);
  });

  it('turns Windows line breaks into a single line break', () => {
    expect(sanitizeRuns([{ text: 'um\r\ndois\rtrês' }])).toEqual([{ text: 'um\ndois\ntrês' }]);
  });

  it('ignores entries that are not runs', () => {
    expect(sanitizeRuns('texto solto')).toEqual([]);
    expect(sanitizeRuns([null, 3, 'x', { text: 7 }, { text: 'ok' }])).toEqual([{ text: 'ok' }]);
  });

  it('merges neighbouring runs with equal marks and drops empty ones', () => {
    expect(
      normalizeRuns([
        { text: 'a', bold: true },
        { text: '' },
        { text: 'b', bold: true },
        { text: 'c' }
      ])
    ).toEqual([{ text: 'ab', bold: true }, { text: 'c' }]);
  });

  it('converts between runs and plain text', () => {
    expect(runsFromPlainText('linha\r\noutra')).toEqual([{ text: 'linha\noutra' }]);
    expect(runsFromPlainText('')).toEqual([]);
    expect(plainText([{ text: 'a' }, { text: 'b', bold: true }])).toBe('ab');
  });
});

describe('AC-pauta-revelavel-37 — bold and color apply to the passage only', () => {
  const sentence = [{ text: 'Hoje vamos falar de filas' }];

  it('bolds only the selected characters', () => {
    expect(applyMark(sentence, 5, 10, { bold: true })).toEqual([
      { text: 'Hoje ' },
      { text: 'vamos', bold: true },
      { text: ' falar de filas' }
    ]);
  });

  it('colors a passage that crosses runs and keeps the bold it had', () => {
    const runs = [{ text: 'Hoje ' }, { text: 'vamos', bold: true }, { text: ' falar' }];
    expect(applyMark(runs, 7, 14, { color: 'red' })).toEqual([
      { text: 'Hoje ' },
      { text: 'va', bold: true },
      { text: 'mos', bold: true, color: 'red' },
      { text: ' fal', color: 'red' },
      { text: 'ar' }
    ]);
  });

  it('accepts the offsets in either order and clamps them to the text', () => {
    expect(applyMark(sentence, 25, 20, { color: 'accent' })).toEqual([
      { text: 'Hoje vamos falar de ' },
      { text: 'filas', color: 'accent' }
    ]);
    expect(applyMark([{ text: 'ab' }], -3, 99, { bold: true })).toEqual([{ text: 'ab', bold: true }]);
  });

  it('a new color replaces the previous one on the passage', () => {
    const red = applyMark(sentence, 0, 4, { color: 'red' });
    expect(applyMark(red, 0, 4, { color: 'lilac' })[0]).toEqual({ text: 'Hoje', color: 'lilac' });
  });

  it('"Normal" removes bold and color from the passage only', () => {
    const marked = [{ text: 'Hoje vamos', bold: true, color: 'green' as const }];
    expect(clearMarks(marked, 0, 4)).toEqual([{ text: 'Hoje' }, { text: ' vamos', bold: true, color: 'green' }]);
  });

  it('an empty passage changes nothing', () => {
    expect(applyMark(sentence, 3, 3, { bold: true })).toEqual(sentence);
  });

  it('Ctrl+B takes bold away only when the whole passage is already bold', () => {
    const runs = [{ text: 'ab', bold: true }, { text: 'cd' }];
    expect(isRangeBold(runs, 0, 2)).toBe(true);
    expect(isRangeBold(runs, 1, 3)).toBe(false);
    expect(isRangeBold(runs, 2, 2)).toBe(false);
    expect(isRangeBold(runs, 0, 5)).toBe(false);
  });
});

describe('sliceRuns — Enter then Tab splits a text at the caret, keeping the marks', () => {
  const runs = [{ text: 'Tópico ' }, { text: '01', bold: true }, { text: '\nteste', color: 'accent' as const }];

  it('takes the passage between two offsets with its marks', () => {
    expect(sliceRuns(runs, 0, 10)).toEqual([{ text: 'Tópico ' }, { text: '01', bold: true }, { text: '\n', color: 'accent' }]);
    expect(sliceRuns(runs, 10)).toEqual([{ text: 'teste', color: 'accent' }]);
  });

  it('gives nothing past the end and everything from the start', () => {
    expect(sliceRuns(runs, 15)).toEqual([]);
    expect(plainText(sliceRuns(runs, 0))).toBe('Tópico 01\nteste');
  });
});
