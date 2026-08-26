import { describe, expect, it } from 'vitest';
import {
  compactPositions,
  moveWithinTrack,
  normalizeTrackOrder,
  positionAfterTypeChange,
  rescueDeck,
  satisfiesTrackInvariant,
  trackOrder
} from '../../shared/track';
import type { Block, BlockType } from '../../shared/types';

function block(id: string, type: BlockType, position: number | null): Block {
  return {
    id,
    rundownId: 'r1',
    type,
    title: id,
    note: '',
    durationMinutes: 5,
    position,
    libraryItemId: null,
    attachments: [],
    beats: []
  };
}

const sample = [
  block('a', 'topic', 0),
  block('b', 'interaction', 1),
  block('c', 'media', 2),
  block('r1', 'rescue', null),
  block('r2', 'rescue', null)
];

describe('AC-clave-09 — invariante resgate ⇒ ordem null', () => {
  it('aceita resgate sem posição e bloco do trilho com posição', () => {
    expect(satisfiesTrackInvariant('rescue', null)).toBe(true);
    expect(satisfiesTrackInvariant('topic', 0)).toBe(true);
  });

  it('recusa resgate com posição e bloco do trilho sem posição', () => {
    expect(satisfiesTrackInvariant('rescue', 2)).toBe(false);
    expect(satisfiesTrackInvariant('media', null)).toBe(false);
  });

  it('virar resgate tira do trilho', () => {
    expect(positionAfterTypeChange(sample, 'b', 'rescue', 1)).toBeNull();
  });

  it('sair de resgate entra no fim do trilho', () => {
    expect(positionAfterTypeChange(sample, 'r1', 'topic', null)).toBe(3);
  });

  it('trocar entre pistas do trilho mantém a posição', () => {
    expect(positionAfterTypeChange(sample, 'b', 'guest', 1)).toBe(1);
  });
});

describe('AC-clave-07 — o trilho é a ordem da live, o deck fica fora dele', () => {
  it('ordena o trilho pela posição e mantém o resgate fora', () => {
    expect(trackOrder(sample).map((entry) => entry.id)).toEqual(['a', 'b', 'c']);
    expect(rescueDeck(sample).map((entry) => entry.id)).toEqual(['r1', 'r2']);
  });

  it('recompacta posições com buracos', () => {
    const gapped = [block('a', 'topic', 0), block('b', 'topic', 4), block('c', 'topic', 9)];
    expect(compactPositions(gapped)).toEqual([
      { id: 'b', position: 1 },
      { id: 'c', position: 2 }
    ]);
  });

  it('não gera escrita quando o trilho já está compacto', () => {
    expect(compactPositions(sample)).toEqual([]);
  });
});

describe('AC-clave-10 — mover no trilho', () => {
  it('move para o início', () => {
    expect(moveWithinTrack(sample, 'c', 0)).toEqual(['c', 'a', 'b']);
  });

  it('move para o fim', () => {
    expect(moveWithinTrack(sample, 'a', 2)).toEqual(['b', 'c', 'a']);
  });

  it('índice além do fim vai para a última posição', () => {
    expect(moveWithinTrack(sample, 'a', 99)).toEqual(['b', 'c', 'a']);
  });

  it('bloco de resgate não entra no trilho pelo arraste', () => {
    expect(moveWithinTrack(sample, 'r1', 0)).toEqual(['a', 'b', 'c']);
  });
});

describe('reordenação idempotente', () => {
  it('mantém a ordem pedida', () => {
    expect(normalizeTrackOrder(sample, ['c', 'a', 'b'])).toEqual(['c', 'a', 'b']);
  });

  it('ignora id desconhecido e id repetido', () => {
    expect(normalizeTrackOrder(sample, ['c', 'c', 'fantasma', 'a', 'b'])).toEqual(['c', 'a', 'b']);
  });

  it('acrescenta no fim quem ficou de fora da lista', () => {
    expect(normalizeTrackOrder(sample, ['c'])).toEqual(['c', 'a', 'b']);
  });

  it('ignora resgate enviado na lista do trilho', () => {
    expect(normalizeTrackOrder(sample, ['r1', 'c', 'a', 'b'])).toEqual(['c', 'a', 'b']);
  });
});
