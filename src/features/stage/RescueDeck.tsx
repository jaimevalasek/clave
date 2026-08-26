import { metalOf } from '../../ui/typeColors';
import { VOCABULARY } from '../../core/vocabulary';
import type { Block, BlockType } from '../../../shared/types';

interface RescueDeckProps {
  deck: Block[];
  usedIds: Set<string>;
  /** Metal do bloco no ar: pinta o compasso do dispositivo D-02 no rodapé. */
  currentType: BlockType;
  onDraw(card: Block): void;
}

/**
 * O deck fica sempre à mão no rodapé do Palco, sobre o dispositivo da pauta.
 * Pauta sem resgates mostra estado vazio explícito, nunca um rodapé mudo.
 */
export function RescueDeck({ deck, usedIds, currentType, onDraw }: RescueDeckProps) {
  return (
    <div className="deck-pauta" style={{ ['--compasso' as string]: metalOf(currentType).token }}>
      <div className="deck" data-testid="deck-resgate">
        <span className="rot-deck">{VOCABULARY.deck.toUpperCase()}</span>
        {deck.length ? (
          deck.map((card) => {
            const used = usedIds.has(card.id);
            return (
              <button
                type="button"
                key={card.id}
                className={`carta-resgate${used ? ' usada' : ''}`}
                data-testid={`carta-${card.id}`}
                title={used ? 'Já foi ao ar nesta live' : undefined}
                onClick={() => onDraw(card)}
              >
                <div className="t">{card.title}</div>
                <div className="d">{card.durationMinutes}min</div>
              </button>
            );
          })
        ) : (
          <span className="deck-vazio" data-testid="estado-deck-vazio">
            Deck vazio. Crie resgates na reserva da Bancada.
          </span>
        )}
      </div>
    </div>
  );
}
