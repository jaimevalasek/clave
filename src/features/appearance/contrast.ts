/**
 * WCAG contrast ratio between two `#RRGGBB` colors. The sheet asks for at
 * least 4.5:1 (AC-pauta-revelavel-38, -46): below it, a color can vanish in a
 * compressed video.
 */
export const MIN_CONTRAST = 4.5;

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const match = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  if (!match) return 0;
  const [r, g, b] = match.slice(1).map((part) => channel(parseInt(part, 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** "4,5": the ratio the way the presenter reads it, one decimal, comma. */
export function formatRatio(ratio: number): string {
  return (Math.floor(ratio * 10) / 10).toFixed(1).replace('.', ',');
}

/** The text that reads better on top of `background`: a warm near-black or a warm near-white. */
export function inkOn(background: string, dark = '#1A1408', light = '#FFFDF7'): string {
  return contrastRatio(background, dark) >= contrastRatio(background, light) ? dark : light;
}
