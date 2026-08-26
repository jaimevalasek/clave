import { useDroppable } from '@dnd-kit/core';
import type { Block, BlockType } from '../../../shared/types';
import { COPY } from '../../core/vocabulary';
import { BlockCard } from './BlockCard';

interface TrackCanvasProps {
  track: Block[];
  deck: Block[];
  brokenBlockIds?: Set<string>;
  onCreate(type: BlockType): void;
  onEdit(block: Block): void;
}

/**
 * Alvo de soltar: a linha da pauta. Como a pauta é uma lista só, o índice da
 * linha é a posição na ordem da live — não existe mais coordenada de pista.
 */
function TrackRow({
  index,
  children
}: {
  index: number;
  children: React.ReactNode;
}) {
  const droppable = useDroppable({ id: `linha-${index}`, data: { index } });
  return (
    <li
      ref={droppable.setNodeRef}
      className={`linha-bloco${droppable.isOver ? ' alvo-drop' : ''}`}
      data-testid={`linha-${index}`}
    >
      <span className="ordem mono" aria-hidden="true">
        {String(index + 1).padStart(2, '0')}
      </span>
      {children}
    </li>
  );
}

/**
 * A pauta é uma lista só, de cima para baixo: a ordem visual é a ordem da live.
 * A etiqueta de cor viaja na borda do cartão — ela informa o tipo do assunto,
 * não organiza a tela. A reserva de resgates fica embaixo, fora da ordem.
 */
export function TrackCanvas({
  track,
  deck,
  brokenBlockIds = new Set(),
  onCreate,
  onEdit
}: TrackCanvasProps) {
  return (
    <>
      <ol className="pauta-lista" data-testid="pauta-lista">
        {track.map((block, index) => (
          <TrackRow index={index} key={block.id}>
            <BlockCard
              block={block}
              broken={brokenBlockIds.has(block.id)}
              onEdit={() => onEdit(block)}
            />
          </TrackRow>
        ))}
      </ol>

      <button
        type="button"
        className="add-bloco"
        data-testid="novo-bloco"
        onClick={() => onCreate('topic')}
      >
        + {COPY.board.addBlock}
      </button>

      <section className="reserva" data-testid="reserva" aria-label={COPY.board.rescueHeading}>
        <h2 className="batuta">{COPY.board.rescueHeading}</h2>
        <p className="dica-resgate">{COPY.board.rescueLaneHint}</p>
        <div className="reserva-cartas">
          {deck.map((block) => (
            <BlockCard
              key={block.id}
              block={block}
              broken={brokenBlockIds.has(block.id)}
              onEdit={() => onEdit(block)}
            />
          ))}
          <button
            type="button"
            className="add-bloco add-resgate"
            data-testid="novo-bloco-rescue"
            onClick={() => onCreate('rescue')}
          >
            + {COPY.board.addRescue}
          </button>
        </div>
      </section>
    </>
  );
}
