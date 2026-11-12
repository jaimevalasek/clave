import { useEffect } from 'react';
import { useSheet } from '../sheet/sheetStore';
import { closeTour, loadTourSeen, openFirstTour, showStep, useTour } from './tourStore';
import { TourOverlay } from './TourOverlay';
import './guide.css';

/**
 * The first-open tour (AC-pauta-revelavel-50). Its anchors live on the ruler
 * and the sheet, so it waits for a rundown to be on screen: on a fresh install
 * that is the first rundown the presenter creates. "Já vi o tour" is stored on
 * disk (`tourSeen`), never in the browser; "Como usar" on the ruler reopens it.
 */
export function GuideLayer() {
  const step = useTour((state) => state.step);
  const seen = useTour((state) => state.seen);
  const sheetOnScreen = useSheet((state) => state.status === 'ready' && state.rundown !== null);

  useEffect(() => {
    void loadTourSeen();
  }, []);

  useEffect(() => {
    if (!sheetOnScreen || seen !== false) return undefined;
    // One frame for the ruler and the sheet to be laid out before the spotlight measures them.
    const frame = window.requestAnimationFrame(openFirstTour);
    return () => window.cancelAnimationFrame(frame);
  }, [sheetOnScreen, seen]);

  if (step === null || !sheetOnScreen) return null;
  return <TourOverlay step={step} onStep={showStep} onClose={closeTour} />;
}
