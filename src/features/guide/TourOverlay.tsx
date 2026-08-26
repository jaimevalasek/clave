import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { GUIDE_COPY, TOUR_STEPS } from './guideContent';
import { richText } from './richText';

interface Spotlight {
  left: number;
  top: number;
  width: number;
  height: number;
  /** Caixa acima ou abaixo do recorte, para não cobrir o que está sendo explicado. */
  placement: 'no-topo' | 'na-base' | '';
}

interface TourOverlayProps {
  step: number;
  onStep(next: number): void;
  onFinish(): void;
  onOpenGuide(): void;
}

const MARGIN = 8;

function measure(anchor: string | null): Spotlight | null {
  if (!anchor) return null;
  const target = document.querySelector(`[data-testid="${anchor}"]`);
  if (!target) return null;

  target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  const rect = target.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const left = Math.max(MARGIN, rect.left);
  const top = Math.max(MARGIN, rect.top);
  const width = Math.max(0, Math.min(rect.right, viewportWidth - MARGIN) - left);
  const height = Math.max(0, Math.min(rect.bottom, viewportHeight - MARGIN) - top);
  if (width === 0 || height === 0) return null;

  const placement =
    height < viewportHeight * 0.65
      ? top + height / 2 > viewportHeight * 0.52
        ? 'no-topo'
        : 'na-base'
      : '';

  return { left, top, width, height, placement };
}

/**
 * Tour de 5 passos. O holofote é um recorte no escuro (`box-shadow` gigante):
 * nada da aplicação muda de camada, então a região explicada continua sendo o
 * elemento real da tela e não uma cópia desenhada por cima.
 */
export function TourOverlay({ step, onStep, onFinish, onOpenGuide }: TourOverlayProps) {
  const current = TOUR_STEPS[step];
  const [spotlight, setSpotlight] = useState<Spotlight | null>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    if (!current) return undefined;
    const update = () => setSpotlight(measure(current.anchor));
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [current]);

  useEffect(() => {
    primaryRef.current?.focus();
  }, [step]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      onFinish();
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [onFinish]);

  if (!current) return null;
  const last = step === TOUR_STEPS.length - 1;

  return (
    <>
      <div className={`tour-fundo${spotlight ? '' : ' sem-alvo'}`} data-testid="tour-fundo">
        {spotlight ? (
          <div
            className="tour-foco"
            data-testid="tour-foco"
            style={{
              left: spotlight.left,
              top: spotlight.top,
              width: spotlight.width,
              height: spotlight.height
            }}
          />
        ) : null}
      </div>

      <div className={`tour-caixa-wrap ${spotlight?.placement ?? ''}`}>
        <div
          className="tour-caixa"
          role="dialog"
          aria-modal="true"
          aria-label={GUIDE_COPY.dialogLabel}
          data-testid="tour"
        >
          <div className="passo-num">{GUIDE_COPY.stepCounter(step + 1, TOUR_STEPS.length)}</div>
          <h2>
            {current.title} <em>{current.emphasis}</em>
          </h2>
          {current.paragraphs.map((paragraph, index) => (
            <p key={index}>{richText(paragraph)}</p>
          ))}
          <div className="acoes-modal">
            <div className="acoes-secundarias">
              <button type="button" className="btn btn-fantasma" onClick={onFinish}>
                {GUIDE_COPY.skipTour}
              </button>
              <button type="button" className="btn btn-fantasma" onClick={onOpenGuide}>
                {GUIDE_COPY.fullGuide}
              </button>
            </div>
            <button
              type="button"
              className="btn btn-ar"
              ref={primaryRef}
              data-testid="tour-avancar"
              onClick={() => (last ? onFinish() : onStep(step + 1))}
            >
              {last ? GUIDE_COPY.start : GUIDE_COPY.next}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
