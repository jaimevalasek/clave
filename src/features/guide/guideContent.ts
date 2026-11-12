import { COPY } from '../../core/vocabulary';

/**
 * The five steps of the first-open tour, in the order of the approved
 * prototype (`.aioson/briefings/pauta-revelavel/prototype.html`, `PASSOS`):
 * the sheet, reveal, paste and format, preparation, appearance.
 *
 * Each step points its spotlight at a `data-aioson-tour` anchor of the ruler
 * or the sheet. The copy lives in `src/core/vocabulary.ts`.
 */

export type TourAnchor = keyof typeof COPY.tour.steps;

export interface TourStep {
  /** Value of the `data-aioson-tour` attribute the spotlight frames. */
  anchor: TourAnchor;
  title: string;
  /** May mark keys with `<span class="tecla">`; rendered by `richText`. */
  body: string;
}

const ORDER: TourAnchor[] = ['sheet', 'reveal', 'paste', 'preparation', 'appearance'];

export const TOUR_STEPS: TourStep[] = ORDER.map((anchor) => ({ anchor, ...COPY.tour.steps[anchor] }));
