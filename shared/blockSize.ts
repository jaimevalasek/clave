// Text size of a block (RULE-pauta-revelavel-05). Four preset sizes, each with
// its own range; fine adjustment moves in 4 px steps from the default and never
// leaves the range.

export const BLOCK_SIZES = ['small', 'medium', 'large', 'title'] as const;
export type BlockSize = (typeof BLOCK_SIZES)[number];

export interface SizeSpec {
  defaultPx: number;
  minPx: number;
  maxPx: number;
}

export const FONT_STEP_PX = 4;

export const SIZE_SPECS: Record<BlockSize, SizeSpec> = {
  small: { defaultPx: 22, minPx: 18, maxPx: 26 },
  medium: { defaultPx: 30, minPx: 26, maxPx: 34 },
  large: { defaultPx: 38, minPx: 34, maxPx: 42 },
  title: { defaultPx: 52, minPx: 44, maxPx: 72 }
};

export const DEFAULT_BLOCK_SIZE: BlockSize = 'medium';

export function isBlockSize(value: unknown): value is BlockSize {
  return typeof value === 'string' && (BLOCK_SIZES as readonly string[]).includes(value);
}

export function defaultFontPx(size: BlockSize): number {
  return SIZE_SPECS[size].defaultPx;
}

/** Valid value: inside the range and a whole number of steps away from the default. */
export function isValidFontPx(size: BlockSize, px: unknown): px is number {
  const spec = SIZE_SPECS[size];
  return (
    typeof px === 'number' &&
    Number.isInteger(px) &&
    px >= spec.minPx &&
    px <= spec.maxPx &&
    (px - spec.defaultPx) % FONT_STEP_PX === 0
  );
}

/** Snaps any number to the nearest valid step inside the range. */
export function clampFontPx(size: BlockSize, px: number): number {
  const spec = SIZE_SPECS[size];
  if (!Number.isFinite(px)) return spec.defaultPx;
  const steps = Math.round((px - spec.defaultPx) / FONT_STEP_PX);
  const minSteps = Math.ceil((spec.minPx - spec.defaultPx) / FONT_STEP_PX);
  const maxSteps = Math.floor((spec.maxPx - spec.defaultPx) / FONT_STEP_PX);
  return spec.defaultPx + Math.min(maxSteps, Math.max(minSteps, steps)) * FONT_STEP_PX;
}

/** A− / A+: one 4 px step; at the limit the same value comes back. */
export function adjustFontPx(size: BlockSize, px: number, direction: 1 | -1): number {
  return clampFontPx(size, clampFontPx(size, px) + direction * FONT_STEP_PX);
}

export function canAdjustFontPx(size: BlockSize, px: number, direction: 1 | -1): boolean {
  return adjustFontPx(size, px, direction) !== clampFontPx(size, px);
}

/**
 * Indenting a block moves it one size down (`delta = 1`); outdenting moves it
 * one size up (`delta = -1`). Small is the floor and title the ceiling.
 */
export function stepSize(size: BlockSize, delta: number): BlockSize {
  const index = BLOCK_SIZES.indexOf(size);
  const next = Math.max(0, Math.min(BLOCK_SIZES.length - 1, index - delta));
  return BLOCK_SIZES[next];
}
