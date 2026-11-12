import { mediaUrl } from '../../core/api';
import type { Background, Preferences, ThemeId } from '../../../shared/types';
import { DEFAULT_SHEET_OPACITY, DEFAULT_THEME } from '../../../shared/types';
import { inkOn } from './contrast';
import { frameOf } from './imageFrame';
import { GRADIENTS, THEMES } from './themes';
import type { ThemePalette } from './themes';

/** The appearance part of the preferences. */
export type Appearance = Pick<Preferences, 'theme' | 'accent' | 'background' | 'sheetOpacity'>;

/** What the palette depends on: the theme and the free accent. */
type Palette = Pick<Appearance, 'theme' | 'accent'>;

export const DEFAULT_APPEARANCE: Appearance = {
  theme: DEFAULT_THEME,
  accent: null,
  background: { kind: 'theme' },
  sheetOpacity: DEFAULT_SHEET_OPACITY
};

/** CSS variable of every palette role; the stylesheets only read these. */
const ROLE_VARIABLES: [keyof Omit<ThemePalette, 'scheme' | 'text'>, string][] = [
  ['bg', '--bg'],
  ['sheet', '--sheet'],
  ['surface', '--surface'],
  ['surface2', '--surface-2'],
  ['solid', '--solid'],
  ['ink', '--ink'],
  ['ink2', '--ink-2'],
  ['smoke', '--smoke'],
  ['rule', '--rule'],
  ['line', '--line'],
  ['line2', '--line-2'],
  ['accent', '--accent'],
  ['accentInk', '--accent-ink'],
  ['ok', '--ok'],
  ['danger', '--danger'],
  ['copper', '--copper'],
  ['marginLine', '--margin-line']
];

/** The accent in use: the free one, or the one of the theme. */
export function accentOf(appearance: Palette): string {
  return appearance.accent ?? THEMES[appearance.theme].accent;
}

/**
 * Every variable for one appearance. The free accent replaces only the
 * accent role (and the "Destaque" text color, which is the accent).
 */
export function appearanceVariables(appearance: Palette): Record<string, string> {
  const palette = THEMES[appearance.theme] ?? THEMES[DEFAULT_THEME];
  const variables: Record<string, string> = {};
  for (const [role, name] of ROLE_VARIABLES) variables[name] = palette[role];
  for (const [color, value] of Object.entries(palette.text)) variables[`--color-${color}`] = value;
  if (appearance.accent) {
    variables['--accent'] = appearance.accent;
    variables['--accent-ink'] = inkOn(appearance.accent);
    variables['--color-accent'] = appearance.accent;
  }
  return variables;
}

/** What paints the desk behind the sheet; `null` is the theme background. */
export function backdropOf(background: Background): string | null {
  switch (background.kind) {
    case 'color':
      return background.value;
    case 'gradient':
      return GRADIENTS[background.value] ?? null;
    case 'image':
      return `url("${mediaUrl(background.value)}")`;
    default:
      return null;
  }
}

/**
 * Writes the appearance on the document: the palette variables and
 * `data-theme` on `:root`, the free background on the body and the veil of
 * the sheet over it (sheet.css), as opaque as the presenter chose. Called at
 * boot, before the first ready render, and on every change in the Appearance
 * panel.
 */
export function applyAppearance(appearance: Appearance): void {
  const root = document.documentElement;
  const theme: ThemeId = THEMES[appearance.theme] ? appearance.theme : DEFAULT_THEME;
  for (const [name, value] of Object.entries(appearanceVariables(appearance))) root.style.setProperty(name, value);
  root.dataset.theme = theme;
  root.style.colorScheme = THEMES[theme].scheme;
  // How much the sheet covers the background (sheet.css); the rest shows through.
  root.style.setProperty('--sheet-veil', `${appearance.sheetOpacity}%`);

  const backdrop = backdropOf(appearance.background);
  const body = document.body;
  body.classList.toggle('free-backdrop', backdrop !== null);
  if (backdrop) body.style.setProperty('--backdrop', backdrop);
  else body.style.removeProperty('--backdrop');

  // An image sits on its own layer, placed and zoomed by its frame (tokens.css).
  const image = appearance.background.kind === 'image' ? appearance.background : null;
  body.classList.toggle('image-backdrop', image !== null);
  const frame = frameOf(image?.frame);
  for (const [name, value] of [
    ['--backdrop-x', `${frame.x}%`],
    ['--backdrop-y', `${frame.y}%`],
    ['--backdrop-zoom', String(frame.zoom / 100)]
  ]) {
    if (image) body.style.setProperty(name, value);
    else body.style.removeProperty(name);
  }
}
