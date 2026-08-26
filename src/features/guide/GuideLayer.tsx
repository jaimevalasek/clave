import { useEffect, useState } from 'react';
import { api } from '../../core/api';
import type { Preferences } from '../../../shared/types';
import { GUIDE_COPY } from './guideContent';
import { GuidePanel } from './GuidePanel';
import { TourOverlay } from './TourOverlay';
import './guide.css';

type Layer = { kind: 'nenhuma' } | { kind: 'tour'; step: number } | { kind: 'guia' };

/**
 * Camada didática do Clave, em dois níveis: o tour de 5 passos que abre sozinho
 * na primeira vez e o guia completo, sempre alcançável pelo `? Como usar`.
 *
 * "Já vi o tour" é preferência de interface, não dado de produto, mas mesmo
 * assim mora no disco: AC-clave-40 proíbe `localStorage` e o produto não abre
 * exceção. Enquanto a preferência não chega do backend a camada fica quieta —
 * um tour que pisca no boot é pior que um tour que aparece meio segundo depois.
 */
export function GuideLayer() {
  const [layer, setLayer] = useState<Layer>({ kind: 'nenhuma' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const payload = await api.get<{ preferences: Preferences }>('/api/preferences');
        if (cancelled || payload.preferences.tourSeen) return;
        setLayer({ kind: 'tour', step: 0 });
      } catch {
        // O guia é apoio: se a preferência não carrega, o produto segue sem ele.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Fechar o tour por qualquer saída (Pular, último passo, Esc) marca como visto. */
  const finishTour = () => {
    setLayer({ kind: 'nenhuma' });
    void api.put('/api/preferences', { tourSeen: true }).catch(() => undefined);
  };

  return (
    <>
      <button
        type="button"
        id="btn-tour"
        data-testid="acao-como-usar"
        title={GUIDE_COPY.openTitle}
        aria-label={GUIDE_COPY.dialogLabel}
        onClick={() => setLayer({ kind: 'guia' })}
      >
        <span className="interr" aria-hidden="true">
          ?
        </span>
        {GUIDE_COPY.openLabel}
      </button>

      {layer.kind === 'tour' ? (
        <TourOverlay
          step={layer.step}
          onStep={(step) => setLayer({ kind: 'tour', step })}
          onFinish={finishTour}
          onOpenGuide={() => {
            setLayer({ kind: 'guia' });
            void api.put('/api/preferences', { tourSeen: true }).catch(() => undefined);
          }}
        />
      ) : null}

      {layer.kind === 'guia' ? (
        <GuidePanel
          onClose={() => setLayer({ kind: 'nenhuma' })}
          onOpenTour={() => setLayer({ kind: 'tour', step: 0 })}
        />
      ) : null}
    </>
  );
}
