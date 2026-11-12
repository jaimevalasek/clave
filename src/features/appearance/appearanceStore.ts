import { create } from 'zustand';
import { api } from '../../core/api';
import type { Preferences } from '../../../shared/types';
import { RETRY_DELAY_MS } from '../sheet/useAutosave';
import { DEFAULT_APPEARANCE, applyAppearance } from './applyAppearance';
import type { Appearance } from './applyAppearance';

const SAVE_DELAY_MS = 250;

interface AppearanceState extends Appearance {
  panelOpen: boolean;
  /** `failed`: the choice is on screen but not on disk yet; a new attempt follows in 5 s. */
  save: 'idle' | 'saving' | 'failed';
}

export const useAppearance = create<AppearanceState>(() => ({ ...DEFAULT_APPEARANCE, panelOpen: false, save: 'idle' }));

function current(): Appearance {
  const { theme, accent, background, sheetOpacity } = useAppearance.getState();
  return { theme, accent, background, sheetOpacity };
}

/**
 * Boot: the appearance stored on disk is on screen before the first ready
 * render (RULE-pauta-revelavel-10). Without an answer the app opens in the
 * default theme; the screen that needs the server says what failed.
 */
export async function loadAppearance(): Promise<void> {
  try {
    const { preferences } = await api.get<{ preferences: Preferences }>('/api/preferences');
    useAppearance.setState({
      theme: preferences.theme,
      accent: preferences.accent,
      background: preferences.background,
      sheetOpacity: preferences.sheetOpacity
    });
  } catch {
    useAppearance.setState({ ...DEFAULT_APPEARANCE });
  }
  applyAppearance(current());
}

let timer: number | undefined;
let inFlight = false;
let queued = false;

/** One write at a time, always with the latest choice. */
async function send(): Promise<void> {
  if (inFlight) {
    queued = true;
    return;
  }
  inFlight = true;
  useAppearance.setState({ save: 'saving' });
  try {
    await api.put('/api/preferences', current());
    useAppearance.setState({ save: queued ? 'saving' : 'idle' });
  } catch {
    useAppearance.setState({ save: 'failed' });
    window.clearTimeout(timer);
    timer = window.setTimeout(() => void send(), RETRY_DELAY_MS);
  } finally {
    inFlight = false;
    if (queued) {
      queued = false;
      void send();
    }
  }
}

/** Applies a change at once, for every rundown, and stores it after a short pause (a color picker fires many). */
export function changeAppearance(patch: Partial<Appearance>): void {
  useAppearance.setState(patch);
  applyAppearance(current());
  window.clearTimeout(timer);
  timer = window.setTimeout(() => void send(), SAVE_DELAY_MS);
}

export function setPanelOpen(panelOpen: boolean): void {
  useAppearance.setState({ panelOpen });
}

export function togglePanel(): void {
  setPanelOpen(!useAppearance.getState().panelOpen);
}
