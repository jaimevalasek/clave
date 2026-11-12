import { describe, expect, it } from 'vitest';
import {
  SIZE_SPECS,
  adjustFontPx,
  canAdjustFontPx,
  clampFontPx,
  defaultFontPx,
  isValidFontPx,
  stepSize
} from '../../shared/blockSize';

describe('RULE-pauta-revelavel-05 — block size stays inside its range in 4 px steps', () => {
  it('uses 22, 30, 38 and 52 px as the defaults of P, M, G and Título', () => {
    expect(['small', 'medium', 'large', 'title'].map((size) => defaultFontPx(size as never))).toEqual([
      22, 30, 38, 52
    ]);
  });

  it('declares the ranges P 18–26, M 26–34, G 34–42 and Título 44–72', () => {
    expect(SIZE_SPECS).toEqual({
      small: { defaultPx: 22, minPx: 18, maxPx: 26 },
      medium: { defaultPx: 30, minPx: 26, maxPx: 34 },
      large: { defaultPx: 38, minPx: 34, maxPx: 42 },
      title: { defaultPx: 52, minPx: 44, maxPx: 72 }
    });
  });

  it('accepts only values a whole number of steps from the default', () => {
    expect(isValidFontPx('title', 44)).toBe(true);
    expect(isValidFontPx('title', 72)).toBe(true);
    expect(isValidFontPx('title', 50)).toBe(false);
    expect(isValidFontPx('title', 40)).toBe(false);
    expect(isValidFontPx('small', 26)).toBe(true);
    expect(isValidFontPx('small', 30)).toBe(false);
    expect(isValidFontPx('medium', 30.5)).toBe(false);
  });

  it('A+ and A− move 4 px and stop at the limits', () => {
    expect(adjustFontPx('title', 52, 1)).toBe(56);
    expect(adjustFontPx('title', 72, 1)).toBe(72);
    expect(adjustFontPx('title', 48, -1)).toBe(44);
    expect(adjustFontPx('title', 44, -1)).toBe(44);
    expect(canAdjustFontPx('title', 44, -1)).toBe(false);
    expect(canAdjustFontPx('title', 44, 1)).toBe(true);
  });

  it('snaps arbitrary numbers onto a valid step', () => {
    expect(clampFontPx('medium', 100)).toBe(34);
    expect(clampFontPx('medium', 0)).toBe(26);
    expect(clampFontPx('medium', 31)).toBe(30);
    expect(clampFontPx('medium', Number.NaN)).toBe(30);
  });

  it('indenting moves one size down and outdenting one size up, with floor and ceiling', () => {
    expect(stepSize('medium', 1)).toBe('small');
    expect(stepSize('small', 1)).toBe('small');
    expect(stepSize('small', -1)).toBe('medium');
    expect(stepSize('title', -1)).toBe('title');
  });
});
