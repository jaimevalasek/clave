import type { BlockSize } from './blockSize.js';
import type { TextRun } from './textMarks.js';

export type { BlockSize } from './blockSize.js';
export type { TextColor, TextRun } from './textMarks.js';

// Shared domain model of the revealable sheet (server and interface).
// Product vocabulary (pt-BR) → identifiers (en): Pauta=Rundown · Bloco=SheetBlock.

/** Kept by the API as an optional field; the interface no longer asks for it. */
export const RUNDOWN_KINDS = ['rundown', 'presentation', 'event'] as const;
export type RundownKind = (typeof RUNDOWN_KINDS)[number];

export interface Rundown {
  id: string;
  title: string;
  kind: RundownKind;
  pinned: boolean;
  /** Created by the previous version of the app and converted by migration v6. */
  legacyImported: boolean;
  /** Date of the rundown in short ISO (`YYYY-MM-DD`). */
  date: string;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string;
}

export interface RundownSummary extends Rundown {
  /** Blocks in the sheet. */
  blockCount: number;
  /** Blocks planned to start visible in every take. */
  initiallyVisibleCount: number;
}

/**
 * Interface preferences. They are not product data, but they live in the same
 * database on disk: nothing is kept in the browser (RULE-pauta-revelavel-08).
 */
export interface Preferences {
  /** The first-open tour was seen; from then on it opens only through "Como usar" (AC-pauta-revelavel-50). */
  tourSeen: boolean;
  /** Appearance of the whole app (RULE-pauta-revelavel-10): one choice for every rundown. */
  theme: ThemeId;
  /** Free accent color `#RRGGBB`; `null` uses the accent of the theme. */
  accent: string | null;
  background: Background;
  /**
   * How much the sheet covers the background, 0 to 100 %: 100 hides it, 0
   * leaves only the lines and the text over it. Appearance shows it as
   * "Transparência da folha" (100 − this).
   */
  sheetOpacity: number;
}

export const DEFAULT_SHEET_OPACITY = 90;

/** The five ready themes (AC-pauta-revelavel-46); the first is the default. */
export const THEME_IDS = ['ink-gold', 'porcelain', 'notebook', 'slate', 'high-contrast'] as const;
export type ThemeId = (typeof THEME_IDS)[number];
export const DEFAULT_THEME: ThemeId = 'ink-gold';

/** The three ready gradients of the background. */
export const GRADIENT_IDS = ['dusk', 'halo', 'grove'] as const;
export type GradientId = (typeof GRADIENT_IDS)[number];

/**
 * What paints behind the sheet: the theme background, a color, a gradient or
 * an image stored in the media folder (path relative to it).
 */
export type Background =
  | { kind: 'theme' }
  | { kind: 'color'; value: string }
  | { kind: 'gradient'; value: GradientId }
  | ImageBackground;

/**
 * How an image sits behind the sheet: the point of the image (`x`, `y`, 0 to
 * 100 %) that stays at the same point of the screen, and the zoom over "fill
 * the screen" (100 to 300 %). Without it the image is centered at 100 %.
 */
export interface ImageFrame {
  x: number;
  y: number;
  zoom: number;
}

export interface ImageBackground {
  kind: 'image';
  value: string;
  frame?: ImageFrame;
}

export const DEFAULT_IMAGE_FRAME: ImageFrame = { x: 50, y: 50, zoom: 100 };
export const MIN_IMAGE_ZOOM = 100;
export const MAX_IMAGE_ZOOM = 300;

export const BACKGROUND_KINDS = ['theme', 'color', 'gradient', 'image'] as const;
export type BackgroundKind = (typeof BACKGROUND_KINDS)[number];

/** `#RRGGBB`, the only color format the appearance stores. */
export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
}

/** Kinds of block in the revealable sheet. */
export const SHEET_BLOCK_KINDS = ['text', 'image', 'video', 'audio'] as const;
export type SheetBlockKind = (typeof SHEET_BLOCK_KINDS)[number];

/**
 * One block of the revealable sheet. The tree lives in the flat list: `depth`
 * is 0..2 and the parent is the nearest previous block with a smaller depth.
 * `plannedVisible` is how the block starts in every take; `takeVisible` and
 * `revealStep` are the progress of the current take.
 */
export interface SheetBlock {
  id: string;
  kind: SheetBlockKind;
  depth: number;
  /** Text runs; always empty for media blocks. */
  content: TextRun[];
  /** Path relative to the media folder; empty for text blocks. */
  mediaPath: string;
  mediaName: string;
  size: BlockSize;
  fontPx: number;
  plannedVisible: boolean;
  takeVisible: boolean;
  revealStep: number | null;
  /** Collapsed in the preparation view only. */
  collapsed: boolean;
  /** Read only: set by the server when the file of a media block left the media folder. */
  mediaMissing?: boolean;
}

export interface SheetPayload {
  rundown: RundownSummary;
  blocks: SheetBlock[];
}

export interface SheetSaveResult extends SheetPayload {
  /** Server id for every client key sent in the request. */
  ids: Record<string, string>;
  savedAt: string;
}
