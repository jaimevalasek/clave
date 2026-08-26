import { Fragment, useEffect, useRef } from 'react';
import { GUIDE_COPY, GUIDE_MOVEMENTS, STAGE_KEYS } from './guideContent';
import { richText } from './richText';

interface GuidePanelProps {
  onClose(): void;
  onOpenTour(): void;
}

/**
 * Guia completo: o produto explicado em quatro movimentos, na ordem de uma live
 * real, mais a tabela das seis teclas do Palco. Cada movimento é ancorado pelo
 * metal do seu momento, então a cor ordena a leitura em vez de decorar.
 */
export function GuidePanel({ onClose, onOpenTour }: GuidePanelProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      onClose();
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [onClose]);

  return (
    <div
      className="guia-fundo"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="guia"
        role="dialog"
        aria-modal="true"
        aria-label={GUIDE_COPY.dialogLabel}
        data-testid="guia-como-usar"
      >
        <div className="guia-topo">
          <div>
            <div className="eyebrow batuta">{GUIDE_COPY.eyebrow}</div>
            <h1>{GUIDE_COPY.heading}</h1>
          </div>
          <button
            type="button"
            className="fechar"
            ref={closeRef}
            data-testid="fechar-guia"
            onClick={onClose}
          >
            {GUIDE_COPY.close}
          </button>
        </div>

        <p className="abertura">{GUIDE_COPY.opening}</p>

        {GUIDE_MOVEMENTS.map((movement) => (
          <section
            className="mov"
            key={movement.measure}
            style={{ ['--metal' as string]: movement.metal }}
          >
            <div className="compasso">{movement.measure}</div>
            <h2>{movement.title}</h2>
            <ol>
              {movement.steps.map((step, index) => (
                <li key={index}>
                  <div>{richText(step)}</div>
                </li>
              ))}
            </ol>
          </section>
        ))}

        <section className="mov" style={{ ['--metal' as string]: 'var(--ouro)' }}>
          <div className="compasso">{GUIDE_COPY.keysMeasure}</div>
          <h2>{GUIDE_COPY.keysTitle}</h2>
          <div className="teclas" data-testid="teclas-do-palco">
            {STAGE_KEYS.map(([key, meaning]) => (
              <Fragment key={key}>
                <span className="tecla">{key}</span>
                <span>{meaning}</span>
              </Fragment>
            ))}
          </div>
        </section>

        <div className="limite">
          <div className="r">{GUIDE_COPY.storageTitle}</div>
          {GUIDE_COPY.storageBody}
        </div>

        <div className="rodape-guia">
          <button type="button" className="btn btn-ar" onClick={onClose}>
            {GUIDE_COPY.understood}
          </button>
          <button type="button" className="btn btn-fantasma" onClick={onOpenTour}>
            {GUIDE_COPY.seeTour}
          </button>
        </div>
      </div>
    </div>
  );
}
