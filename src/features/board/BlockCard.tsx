import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { metalOf } from '../../ui/typeColors';
import type { Block } from '../../../shared/types';

const CLIP_ICON = (
  <svg
    width="10"
    height="10"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M21.4 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.2-9.19a4 4 0 015.65 5.66L9.4 17.4a2 2 0 01-2.83-2.83l8.49-8.48" />
  </svg>
);

interface BlockCardProps {
  block: Block;
  /** Blocos com mídia local inexistente ganham o alerta antes de entrar no ar. */
  broken?: boolean;
  onEdit(): void;
}

/**
 * Cartão de uma linha da pauta. A chave é sempre o id persistido: reordenar ou
 * salvar nunca vaza gaveta aberta nem valor digitado para o vizinho.
 */
export function BlockCard({ block, broken = false, onEdit }: BlockCardProps) {
  const metal = metalOf(block.type);
  // O resgate fica fora da ordem: a carta não arrasta e, por isso, não recebe
  // os atributos de arraste — `aria-disabled` num cartão clicável mentiria.
  const draggableTrack = block.type !== 'rescue';
  const draggable = useDraggable({ id: block.id, disabled: !draggableTrack });
  const beats = block.beats.length;

  return (
    <div
      ref={draggableTrack ? draggable.setNodeRef : undefined}
      className={`cartao${draggable.isDragging ? ' arrastando' : ''}`}
      data-metal={block.type}
      data-testid={`bloco-${block.id}`}
      style={{ transform: CSS.Translate.toString(draggable.transform) }}
      {...(draggableTrack ? draggable.attributes : {})}
      {...(draggableTrack ? draggable.listeners : {})}
      role="button"
      tabIndex={0}
      aria-label={`Editar bloco ${block.title}`}
      onClick={onEdit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          onEdit();
        }
      }}
    >
      {broken ? (
        <span className="alerta-anexo" title="Mídia com problema" data-testid="alerta-anexo">
          !
        </span>
      ) : null}
      <div className="titulo">{block.title}</div>
      <div className="rodape">
        <span className="etiqueta" style={{ color: metal.token }}>
          {metal.label}
        </span>
        <span className="dur">{block.durationMinutes}min</span>
        {beats ? (
          <span className="pontos-conta" data-testid={`pontos-de-${block.id}`}>
            {beats} ponto{beats === 1 ? '' : 's'}
          </span>
        ) : null}
        {block.attachments.length ? (
          <span className="clipe" style={{ color: metal.token }}>
            {CLIP_ICON}
            {block.attachments.length}
          </span>
        ) : null}
      </div>
    </div>
  );
}
