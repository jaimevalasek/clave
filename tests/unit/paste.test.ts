import { describe, expect, it } from 'vitest';
import { listItems, looksLikeList, parsePastedText, splitAtCaret, splitParagraphs } from '../../src/features/sheet/paste';
import { MAX_BLOCK_TEXT_LENGTH } from '../../shared/validation/sheet';

describe('AC-pauta-revelavel-13 — plain text splits into one block per paragraph', () => {
  it('splits on blank lines and keeps a single break inside the block', () => {
    expect(splitParagraphs('Abertura\nsegunda linha\n\nDesenvolvimento\n\n\nFecho')).toEqual([
      'Abertura\nsegunda linha',
      'Desenvolvimento',
      'Fecho'
    ]);
  });

  it('treats Windows breaks (CRLF) and blank lines with spaces like plain breaks', () => {
    expect(splitParagraphs('Um\r\nainda um\r\n\r\nDois\r\n   \r\nTrês\r\n')).toEqual(['Um\nainda um', 'Dois', 'Três']);
  });

  it('turns a ten-paragraph script into ten paragraphs', () => {
    const script = Array.from({ length: 10 }, (_, index) => `Parágrafo ${index + 1} do roteiro.`).join('\n\n');
    const parsed = parsePastedText(script);
    expect(parsed).toEqual({ kind: 'paragraphs', paragraphs: script.split('\n\n') });
  });

  it('ignores a paste of blanks only', () => {
    expect(parsePastedText('  \n\n \r\n')).toBeNull();
  });

  it('splits a paragraph longer than a block holds, at a space, without losing text', () => {
    const word = 'palavra ';
    const long = word.repeat(Math.ceil((MAX_BLOCK_TEXT_LENGTH * 1.5) / word.length)).trim();
    const parts = splitParagraphs(long);
    expect(parts.length).toBe(2);
    parts.forEach((part) => expect(part.length).toBeLessThanOrEqual(MAX_BLOCK_TEXT_LENGTH));
    expect(parts.join(' ')).toBe(long);
  });
});

describe('AC-pauta-revelavel-14 — a paste at the caret', () => {
  it('keeps the first paragraph for the caret, untrimmed, and the rest as blocks', () => {
    expect(splitAtCaret(' e mais isto\n\nDepois\n\nFim')).toEqual({ atCaret: ' e mais isto', after: ['Depois', 'Fim'] });
  });

  it('puts everything at the caret when there is no blank line', () => {
    expect(splitAtCaret('linha 1\r\nlinha 2\r\n')).toEqual({ atCaret: 'linha 1\nlinha 2', after: [] });
  });
});

describe('AC-pauta-revelavel-15 — a pasted list becomes topics and sub-items', () => {
  it('reads "-", "*", "•" and "1." markers and levels by the order of the indents', () => {
    const list = ['- Abertura', '  * Gancho', '    • Pergunta ao chat', '1. Desenvolvimento', '  2. Exemplo'].join('\n');
    expect(looksLikeList(list)).toBe(true);
    expect(listItems(list)).toEqual([
      { text: 'Abertura', level: 0 },
      { text: 'Gancho', level: 1 },
      { text: 'Pergunta ao chat', level: 2 },
      { text: 'Desenvolvimento', level: 0 },
      { text: 'Exemplo', level: 1 }
    ]);
  });

  it('reads tab and space indents without markers', () => {
    const list = 'Tópico\n\tSub-item\n\t\tNeto\nOutro tópico';
    expect(parsePastedText(list)).toEqual({
      kind: 'list',
      items: [
        { text: 'Tópico', level: 0 },
        { text: 'Sub-item', level: 1 },
        { text: 'Neto', level: 2 },
        { text: 'Outro tópico', level: 0 }
      ]
    });
  });

  it('keeps anything deeper than three levels at level 2 and skips blank lines', () => {
    const list = '- a\n  - b\n\n    - c\n      - d';
    expect(listItems(list).map((item) => item.level)).toEqual([0, 1, 2, 2]);
  });

  it('treats CRLF lists like plain ones', () => {
    expect(listItems('- um\r\n  - dois\r\n').map((item) => `${item.level}:${item.text}`)).toEqual(['0:um', '1:dois']);
  });

  it('does not take a single marked line, or plain paragraphs, for a list', () => {
    expect(looksLikeList('- só uma linha')).toBe(false);
    expect(looksLikeList('Primeiro parágrafo.\n\nSegundo parágrafo.')).toBe(false);
  });
});

describe('AC-pauta-revelavel-19 — a pasted URL becomes text', () => {
  it('becomes one text paragraph holding the URL', () => {
    expect(parsePastedText('https://aioson.com/docs?x=1\r\n')).toEqual({
      kind: 'paragraphs',
      paragraphs: ['https://aioson.com/docs?x=1']
    });
  });
});
