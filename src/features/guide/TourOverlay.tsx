import { useCallback, useId, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, RefObject } from 'react';
import { COPY } from '../../core/vocabulary';
import { useFocusTrap } from '../../ui/useFocusTrap';
import { TOUR_STEPS } from './guideContent';
import type { TourStep } from './guideContent';
import { richText } from './richText';

/** Room around the framed control, and the card's distance to it and to the window edge. */
const PAD = 8;
const GAP = 16;
const EDGE = 12;
const TALL_TARGET = 0.6;
const TALL_CARD_TOP = 72;

interface Layout {
  /** `null` when the anchor is not on screen: the card shows centered over the veil. */
  spotlight: CSSProperties | null;
  card: CSSProperties | null;
}

function anchorOf(step: TourStep): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-aioson-tour="${step.anchor}"]`);
}

/**
 * The spotlight frames the real control, and the card sits below it when it
 * fits, above it otherwise. A target taller than most of the window (the
 * sheet) keeps the card mid-height, on its right side.
 */
function layoutFor(target: HTMLElement, card: HTMLElement): Layout {
  const rect = target.getBoundingClientRect();
  const width = window.innerWidth;
  const height = window.innerHeight;
  const top = Math.max(PAD, rect.top - PAD);
  const spotlight = {
    left: rect.left - PAD,
    top,
    width: rect.width + PAD * 2,
    height: Math.max(0, Math.min(height - top - PAD, rect.height + PAD * 2))
  };

  const cardWidth = card.offsetWidth;
  const cardHeight = card.offsetHeight;
  let x = Math.min(width - cardWidth - EDGE, Math.max(EDGE, rect.left));
  let y = rect.bottom + GAP + cardHeight < height ? rect.bottom + GAP : Math.max(EDGE, rect.top - cardHeight - GAP);
  if (rect.height > height * TALL_TARGET) {
    y = Math.max(TALL_CARD_TOP, height / 2 - cardHeight / 2);
    x = Math.max(EDGE, Math.min(width - cardWidth - EDGE, rect.right - cardWidth - GAP));
  }
  return { spotlight, card: { left: x, top: y } };
}

/** Measures again when the window, the scroll or the fonts move the anchor. */
function useStepLayout(step: TourStep, cardRef: RefObject<HTMLDivElement | null>): Layout {
  const [layout, setLayout] = useState<Layout>({ spotlight: null, card: null });

  const measure = useCallback(() => {
    const target = anchorOf(step);
    const card = cardRef.current;
    setLayout(target && card ? layoutFor(target, card) : { spotlight: null, card: null });
  }, [step, cardRef]);

  useLayoutEffect(() => {
    anchorOf(step)?.scrollIntoView({ block: 'nearest' });
    measure();
    let alive = true;
    void document.fonts?.ready.then(() => {
      if (alive) measure();
    });
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      alive = false;
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [step, measure]);

  return layout;
}

interface TourOverlayProps {
  step: number;
  onStep(next: number): void;
  onClose(): void;
}

/**
 * The 5-step tour (AC-pauta-revelavel-50). The spotlight is a hole in the veil
 * (a huge `box-shadow`), so what it explains is the real control on screen.
 * The veil takes the clicks, the card keeps the focus (AC-pauta-revelavel-53)
 * and Esc closes it.
 */
export function TourOverlay({ step, onStep, onClose }: TourOverlayProps) {
  const current = TOUR_STEPS[step] ?? TOUR_STEPS[0];
  const last = step >= TOUR_STEPS.length - 1;
  const titleId = useId();
  const cardRef = useRef<HTMLDivElement>(null);
  const layout = useStepLayout(current, cardRef);
  useFocusTrap(cardRef, onClose);

  return (
    <div className={`tour-veil${layout.spotlight ? '' : ' no-target'}`} data-aioson-tour="overlay" data-testid="tour">
      {layout.spotlight ? <div className="tour-spotlight" data-testid="tour-spotlight" style={layout.spotlight} /> : null}
      <div
        ref={cardRef}
        className={`tour-card${layout.card ? '' : ' centered'}`}
        style={layout.card ?? undefined}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-step={current.anchor}
        data-testid="tour-card"
      >
        <div className="tour-step">{COPY.tour.stepCounter(step + 1, TOUR_STEPS.length)}</div>
        <h2 id={titleId}>{current.title}</h2>
        <p>{richText(current.body)}</p>
        <footer>
          <button type="button" className="btn" data-testid="tour-skip" onClick={onClose}>
            {COPY.tour.skip}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            data-autofocus="true"
            data-testid="tour-next"
            onClick={() => (last ? onClose() : onStep(step + 1))}
          >
            {last ? COPY.tour.start : COPY.tour.next}
          </button>
        </footer>
      </div>
    </div>
  );
}
