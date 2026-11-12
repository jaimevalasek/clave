import { create } from 'zustand';
import { api } from '../../core/api';
import type { Preferences } from '../../../shared/types';

interface TourState {
  /** Step on screen, or `null` when the tour is closed. */
  step: number | null;
  /** `tourSeen` from disk; `null` until the preference arrives (or when it cannot be read). */
  seen: boolean | null;
}

export const useTour = create<TourState>(() => ({ step: null, seen: null }));

/**
 * Reads `tourSeen` once. Without an answer the tour stays quiet: it is help,
 * and a tour that pops up on every boot would be worse than none.
 */
export async function loadTourSeen(): Promise<void> {
  try {
    const { preferences } = await api.get<{ preferences: Preferences }>('/api/preferences');
    useTour.setState({ seen: preferences.tourSeen });
  } catch {
    useTour.setState({ seen: null });
  }
}

/** "Como usar" reopens the tour from the first step (AC-pauta-revelavel-50). */
export function openTour(): void {
  useTour.setState({ step: 0 });
}

/** The first open shows the tour by itself, once. */
export function openFirstTour(): void {
  if (useTour.getState().seen !== false) return;
  useTour.setState({ step: 0, seen: true });
}

export function showStep(step: number): void {
  useTour.setState({ step });
}

/**
 * Any way out ("Pular", "Começar", Esc) marks the tour as seen on disk, so it
 * never comes back by itself; only "Como usar" brings it back.
 */
export function closeTour(): void {
  useTour.setState({ step: null, seen: true });
  void api.put('/api/preferences', { tourSeen: true }).catch(() => undefined);
}
