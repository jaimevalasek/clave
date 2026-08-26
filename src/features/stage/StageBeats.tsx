import type { Beat } from '../../../shared/types';
import { resolveFileSource } from '../attachments/videoSource';

interface StageBeatsProps {
  /** Só os pontos já revelados: os falados mais o que está em foco agora. */
  beats: Beat[];
  /** Quantos já foram falados — o de índice `spoken` é o que está em foco. */
  spoken: number;
  /** Ids de mídia local que a checagem pré-live não encontrou no disco. */
  brokenIds: Set<string>;
  onToggle(beat: Beat): void;
}

/**
 * Os pontos do bloco no ar, revelados um a um. Esta é a camada pública: o que
 * aparece aqui vai para a tela capturada, então nada de nota privada e nada de
 * ponto que ainda não chegou.
 */
export function StageBeats({ beats, spoken, brokenIds, onToggle }: StageBeatsProps) {
  if (!beats.length) return null;

  return (
    <ol className="pontos-palco" data-testid="pontos-palco">
      {beats.map((beat, index) => {
        const focused = index === spoken;
        const image = beat.imagePath ? resolveFileSource(beat.imagePath) : null;
        const broken = brokenIds.has(beat.id);
        return (
          <li
            key={beat.id}
            className={`ponto-palco${beat.done ? ' falado' : ''}${focused ? ' foco' : ''}`}
            data-nivel={beat.depth}
            aria-level={beat.depth + 1}
            data-testid={`ponto-palco-${beat.id}`}
          >
            <button
              type="button"
              className="marca-ponto"
              aria-pressed={beat.done}
              aria-label={`${beat.done ? 'Desmarcar' : 'Marcar'} o ponto ${beat.text}`}
              onClick={() => onToggle(beat)}
            >
              <span aria-hidden="true">{beat.done ? '✓' : ''}</span>
            </button>
            <div className="corpo-ponto">
              <span className="texto-ponto">{beat.text}</span>
              {broken ? (
                <span className="marca-erro" data-testid={`ponto-quebrado-${beat.id}`}>
                  imagem não encontrada
                </span>
              ) : null}
              {!broken && image && image.kind !== 'unknown' ? (
                <img
                  className="imagem-ponto"
                  src={image.url}
                  alt=""
                  data-testid={`imagem-ponto-${beat.id}`}
                />
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
