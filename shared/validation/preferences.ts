import { isSafeMediaPath, mediaKindForName } from '../media.js';
import { GRADIENT_IDS, MAX_IMAGE_ZOOM, MIN_IMAGE_ZOOM, THEME_IDS, isHexColor } from '../types.js';
import type { Background, GradientId, ImageFrame, ThemeId } from '../types.js';

// Shape of the appearance preferences (AC-pauta-revelavel-46). The server
// validates a write with these and reads the stored values through them, so a
// row edited by hand falls back to the default instead of breaking the app.

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && (THEME_IDS as readonly string[]).includes(value);
}

export function isGradientId(value: unknown): value is GradientId {
  return typeof value === 'string' && (GRADIENT_IDS as readonly string[]).includes(value);
}

/** How much the sheet covers the background: a whole number of percent, 0 to 100. */
export function isSheetOpacity(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 100;
}

/** An image background: a relative path inside the media folder, of an image. */
export function isBackgroundImagePath(value: unknown): value is string {
  return typeof value === 'string' && isSafeMediaPath(value) && mediaKindForName(value) === 'image';
}

function inRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

/** The framing of an image: x and y 0–100 (one decimal), zoom 100–300 (whole). */
export function parseImageFrame(raw: unknown): ImageFrame | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const { x, y, zoom } = raw as { x?: unknown; y?: unknown; zoom?: unknown };
  if (!inRange(x, 0, 100) || !inRange(y, 0, 100) || !inRange(zoom, MIN_IMAGE_ZOOM, MAX_IMAGE_ZOOM)) return null;
  return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, zoom: Math.round(zoom) };
}

function parseImage(value: unknown, frame: unknown): Background | null {
  if (!isBackgroundImagePath(value)) return null;
  if (frame === undefined) return { kind: 'image', value: value.trim() };
  const parsed = parseImageFrame(frame);
  return parsed ? { kind: 'image', value: value.trim(), frame: parsed } : null;
}

/** The background in its closed shape, or `null` when anything is off. */
export function parseBackground(raw: unknown): Background | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const { kind, value, frame } = raw as { kind?: unknown; value?: unknown; frame?: unknown };
  if (kind === 'theme') return { kind };
  if (kind === 'color' && isHexColor(value)) return { kind, value: value.toUpperCase() };
  if (kind === 'gradient' && isGradientId(value)) return { kind, value };
  if (kind === 'image') return parseImage(value, frame);
  return null;
}
