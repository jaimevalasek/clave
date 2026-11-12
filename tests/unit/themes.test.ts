import { describe, expect, it } from 'vitest';
import { accentOf, appearanceVariables, backdropOf } from '../../src/features/appearance/applyAppearance';
import { MIN_CONTRAST, contrastRatio, formatRatio, inkOn } from '../../src/features/appearance/contrast';
import { GRADIENTS, THEMES } from '../../src/features/appearance/themes';
import { TEXT_COLORS } from '../../shared/textMarks';
import { GRADIENT_IDS, THEME_IDS } from '../../shared/types';

describe('WCAG contrast ratio', () => {
  it('measures the known extremes and is symmetric', () => {
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 5);
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1, 5);
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(contrastRatio('#FFFFFF', '#000000'), 10);
  });

  it('shows the ratio with one decimal and a comma, never rounding a failing value up to 4,5', () => {
    expect(formatRatio(4.49)).toBe('4,4');
    expect(formatRatio(10.62)).toBe('10,6');
  });

  it('picks the readable ink on top of an accent', () => {
    expect(inkOn('#E8BA52')).toBe('#1A1408');
    expect(inkOn('#1D3557')).toBe('#FFFDF7');
  });
});

describe('AC-pauta-revelavel-38 — the six text colors follow the theme and stay readable on the sheet', () => {
  it('there are exactly the five themes of the panel and the three gradients', () => {
    expect(Object.keys(THEMES).sort()).toEqual([...THEME_IDS].sort());
    expect(Object.keys(GRADIENTS).sort()).toEqual([...GRADIENT_IDS].sort());
  });

  for (const theme of THEME_IDS) {
    it(`AC-pauta-revelavel-38 in theme ${theme}, every text color has at least 4.5:1 on the sheet`, () => {
      const palette = THEMES[theme];
      for (const color of TEXT_COLORS) {
        const ratio = contrastRatio(palette.text[color], palette.sheet);
        expect(ratio, `${theme}/${color} ${palette.text[color]} on ${palette.sheet}`).toBeGreaterThanOrEqual(MIN_CONTRAST);
      }
    });
  }

  it('AC-pauta-revelavel-38 each color changes with the theme (dark and light themes never share the red)', () => {
    for (const color of ['red', 'green', 'lilac', 'accent'] as const) {
      expect(THEMES['ink-gold'].text[color]).not.toBe(THEMES.porcelain.text[color]);
    }
  });

  it('the primary action text is readable on the accent of every theme', () => {
    for (const theme of THEME_IDS) {
      const palette = THEMES[theme];
      expect(contrastRatio(palette.accentInk, palette.accent), theme).toBeGreaterThanOrEqual(MIN_CONTRAST);
    }
  });
});

describe('AC-pauta-revelavel-46 — the appearance becomes the variables of the app', () => {
  it('writes every palette role and the six text colors of the theme', () => {
    const variables = appearanceVariables({ theme: 'slate', accent: null });
    expect(variables['--sheet']).toBe(THEMES.slate.sheet);
    expect(variables['--accent']).toBe(THEMES.slate.accent);
    expect(variables['--color-red']).toBe(THEMES.slate.text.red);
    expect(variables['--color-accent']).toBe(THEMES.slate.text.accent);
    expect(variables['--margin-line']).toBe('transparent');
    expect(appearanceVariables({ theme: 'notebook', accent: null })['--margin-line']).toBe(
      THEMES.notebook.marginLine
    );
  });

  it('a free accent replaces only the accent role and the "Destaque" color', () => {
    const variables = appearanceVariables({ theme: 'ink-gold', accent: '#3A7BD5' });
    expect(variables['--accent']).toBe('#3A7BD5');
    expect(variables['--color-accent']).toBe('#3A7BD5');
    expect(variables['--color-red']).toBe(THEMES['ink-gold'].text.red);
    expect(variables['--ink']).toBe(THEMES['ink-gold'].ink);
    expect(accentOf({ theme: 'porcelain', accent: null })).toBe(THEMES.porcelain.accent);
  });

  it('paints the background from the theme, a color, a gradient or an image of the media folder', () => {
    expect(backdropOf({ kind: 'theme' })).toBeNull();
    expect(backdropOf({ kind: 'color', value: '#2A2118' })).toBe('#2A2118');
    expect(backdropOf({ kind: 'gradient', value: 'halo' })).toBe(GRADIENTS.halo);
    expect(backdropOf({ kind: 'image', value: 'fundos/meu fundo.png' })).toBe('url("/api/media/fundos/meu%20fundo.png")');
  });
});
