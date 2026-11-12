import type { GradientId, ThemeId } from '../../../shared/types';
import type { TextColor } from '../../../shared/textMarks';

/**
 * The palettes of the five ready themes and the three gradients: the single
 * source of the colors in `.aioson/briefings/pauta-revelavel/identity.md`
 * ("Tinta & Ouro" and the themes of F8, the six text colors of F16). Every
 * theme fills the same roles; scale, voice and motion never change.
 * `applyAppearance` writes these roles as the CSS variables of the app.
 */
export interface ThemePalette {
  scheme: 'dark' | 'light';
  /** The desk behind the sheet. */
  bg: string;
  /** The sheet (column) itself: every text color is measured against it. */
  sheet: string;
  surface: string;
  surface2: string;
  /** Opaque surface of modals and panels. */
  solid: string;
  ink: string;
  ink2: string;
  smoke: string;
  /** The ruled-paper line, every 44 px. */
  rule: string;
  line: string;
  line2: string;
  /** Brand, primary action and gates; the free accent replaces only this role. */
  accent: string;
  /** Text on top of the accent (the primary button). */
  accentInk: string;
  ok: string;
  danger: string;
  copper: string;
  /** The red margin of the "Caderno" theme; transparent elsewhere. */
  marginLine: string;
  /** The six text colors the presenter applies to a passage. */
  text: Record<TextColor, string>;
}

const BASE_DARK = {
  scheme: 'dark',
  ok: '#6EC6A2',
  danger: '#E25D5D',
  copper: '#D8895B',
  marginLine: 'transparent'
} as const;

export const THEMES: Record<ThemeId, ThemePalette> = {
  'ink-gold': {
    ...BASE_DARK,
    bg: '#0B0A08',
    sheet: '#100E0B',
    surface: '#161310',
    surface2: '#1D1914',
    solid: '#242019',
    ink: '#F5F1E8',
    ink2: '#CDC5B4',
    smoke: '#8F8674',
    rule: 'rgba(224, 203, 163, 0.07)',
    line: 'rgba(224, 203, 163, 0.14)',
    line2: 'rgba(233, 214, 177, 0.28)',
    accent: '#E8BA52',
    accentInk: '#1A1408',
    text: { text: '#F5F1E8', accent: '#E8BA52', red: '#EF6F6F', green: '#6EC6A2', copper: '#D8895B', lilac: '#B49BD8' }
  },
  porcelain: {
    scheme: 'light',
    bg: '#F1EDE3',
    sheet: '#F9F6EE',
    surface: '#FFFDF7',
    surface2: '#EFE9DC',
    solid: '#FFFDF7',
    ink: '#1C1710',
    ink2: '#4C4436',
    smoke: '#6F6656',
    rule: 'rgba(60, 45, 20, 0.085)',
    line: 'rgba(60, 45, 20, 0.16)',
    line2: 'rgba(60, 45, 20, 0.32)',
    accent: '#8A6512',
    accentInk: '#FFF8E6',
    ok: '#177A58',
    danger: '#BF3D47',
    copper: '#A55A30',
    marginLine: 'transparent',
    text: { text: '#1C1710', accent: '#8A6512', red: '#BF3D47', green: '#177A58', copper: '#A55A30', lilac: '#6C4E9B' }
  },
  notebook: {
    scheme: 'light',
    bg: '#ECE6D6',
    sheet: '#FBF8EF',
    surface: '#FFFDF6',
    surface2: '#EFE9DA',
    solid: '#FFFDF6',
    ink: '#22201B',
    ink2: '#4A463C',
    smoke: '#6E6757',
    rule: 'rgba(60, 90, 140, 0.16)',
    line: 'rgba(40, 40, 30, 0.16)',
    line2: 'rgba(40, 40, 30, 0.32)',
    accent: '#9C6400',
    accentInk: '#FFF8E6',
    ok: '#177A58',
    danger: '#9E2B48',
    copper: '#A55A30',
    marginLine: 'rgba(178, 58, 58, 0.5)',
    text: { text: '#22201B', accent: '#9C6400', red: '#B23A3A', green: '#1F7A4F', copper: '#A55A30', lilac: '#6C4E9B' }
  },
  slate: {
    ...BASE_DARK,
    bg: '#14201B',
    sheet: '#182821',
    surface: '#1C2E26',
    surface2: '#22362D',
    solid: '#223A30',
    ink: '#EEF2E8',
    ink2: '#C9D3C3',
    smoke: '#8FA092',
    rule: 'rgba(238, 242, 232, 0.075)',
    line: 'rgba(238, 242, 232, 0.14)',
    line2: 'rgba(238, 242, 232, 0.28)',
    accent: '#E8D27A',
    accentInk: '#1B1A0C',
    text: { text: '#EEF2E8', accent: '#E8D27A', red: '#F2938A', green: '#9ED9A0', copper: '#E8A86B', lilac: '#C9B3F0' }
  },
  'high-contrast': {
    ...BASE_DARK,
    bg: '#0B0A08',
    sheet: '#0B0A08',
    surface: '#151311',
    surface2: '#1E1B17',
    solid: '#1E1B17',
    ink: '#FFFFFF',
    ink2: '#ECE8DE',
    smoke: '#BDB6A7',
    rule: 'rgba(255, 255, 255, 0.1)',
    line: 'rgba(255, 255, 255, 0.3)',
    line2: 'rgba(255, 255, 255, 0.55)',
    accent: '#FFD34D',
    accentInk: '#14110A',
    text: { text: '#FFFFFF', accent: '#FFD34D', red: '#FF7A7A', green: '#7CF0B8', copper: '#FFB27A', lilac: '#D2B8FF' }
  }
};

/** The three ready gradients of the background (warm dusk, gold halo, green grove). */
export const GRADIENTS: Record<GradientId, string> = {
  dusk: 'linear-gradient(160deg, #2b1d10 0%, #0b0a08 60%)',
  halo: 'radial-gradient(120% 90% at 20% 0%, #3a2a12 0%, #0b0a08 70%)',
  grove: 'linear-gradient(180deg, #1b2a24 0%, #0e1512 100%)'
};

/** The first color offered when the presenter switches the background to "Cor". */
export const DEFAULT_BACKGROUND_COLOR = '#2A2118';
