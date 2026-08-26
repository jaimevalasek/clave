import { describe, expect, it } from 'vitest';
import {
  beatToAdvance,
  beatToRewind,
  currentBeat,
  doneCount,
  remainingSeconds,
  revealedBeats
} from '../../src/features/stage/beats';
import type { Beat, Block, BlockType } from '../../shared/types';

function beat(id: string, done: boolean, position: number, depth = 0): Beat {
  return { id, text: `ponto ${id}`, imagePath: '', done, depth, position };
}

function block(id: string, beats: Beat[], durationMinutes = 10, type: BlockType = 'topic'): Block {
  return {
    id,
    rundownId: 'r1',
    type,
    title: id,
    note: '',
    durationMinutes,
    position: type === 'rescue' ? null : 0,
    libraryItemId: null,
    attachments: [],
    beats
  };
}

describe('AC-clave-50 — os pontos aparecem um a um, na ordem', () => {
  it('bloco novo revela só o primeiro ponto', () => {
    const target = block('b', [beat('p1', false, 0), beat('p2', false, 1), beat('p3', false, 2)]);
    expect(doneCount(target)).toBe(0);
    expect(revealedBeats(target).map((entry) => entry.id)).toEqual(['p1']);
    expect(currentBeat(target)?.id).toBe('p1');
  });

  it('cada ponto falado revela o seguinte', () => {
    const target = block('b', [beat('p1', true, 0), beat('p2', false, 1), beat('p3', false, 2)]);
    expect(revealedBeats(target).map((entry) => entry.id)).toEqual(['p1', 'p2']);
    expect(currentBeat(target)?.id).toBe('p2');
  });

  it('com todos falados, a lista inteira está na tela e não há ponto em foco', () => {
    const target = block('b', [beat('p1', true, 0), beat('p2', true, 1)]);
    expect(revealedBeats(target)).toHaveLength(2);
    expect(currentBeat(target)).toBeNull();
  });

  it('marcar um ponto do meio na gaveta não faz o Palco pular os anteriores', () => {
    const target = block('b', [beat('p1', false, 0), beat('p2', true, 1), beat('p3', false, 2)]);
    expect(doneCount(target)).toBe(0);
    expect(revealedBeats(target).map((entry) => entry.id)).toEqual(['p1']);
  });

  it('bloco sem pontos não revela nada', () => {
    expect(revealedBeats(block('b', []))).toEqual([]);
    expect(revealedBeats(null)).toEqual([]);
    expect(currentBeat(null)).toBeNull();
  });
});

describe('AC-clave-51 — avançar percorre os pontos antes de trocar de bloco', () => {
  it('avançar marca o ponto em foco', () => {
    const target = block('b', [beat('p1', false, 0), beat('p2', false, 1)]);
    expect(beatToAdvance(target)?.id).toBe('p1');
  });

  it('sem ponto por revelar, o avanço é do bloco', () => {
    expect(beatToAdvance(block('b', [beat('p1', true, 0)]))).toBeNull();
    expect(beatToAdvance(block('b', []))).toBeNull();
  });

  it('voltar desmarca o último ponto falado', () => {
    const target = block('b', [beat('p1', true, 0), beat('p2', true, 1), beat('p3', false, 2)]);
    expect(beatToRewind(target)?.id).toBe('p2');
  });

  it('no começo do bloco, voltar é voltar de bloco', () => {
    expect(beatToRewind(block('b', [beat('p1', false, 0)]))).toBeNull();
    expect(beatToRewind(block('b', []))).toBeNull();
  });

  it('avançar e voltar são simétricos no mesmo ponto', () => {
    const target = block('b', [beat('p1', true, 0), beat('p2', false, 1)]);
    expect(beatToAdvance(target)?.id).toBe('p2');
    expect(beatToRewind(target)?.id).toBe('p1');
  });
});

describe('AC-clave-52 — "falta para fechar a pauta" conta o previsto que ainda não passou', () => {
  const track = [block('a', [], 10), block('b', [], 20), block('c', [], 5)];

  it('soma o que resta do bloco no ar com os blocos seguintes', () => {
    // 3 min do bloco de 10 já correram: 7 restantes + 20 + 5 = 32 min.
    expect(remainingSeconds(track, 0, false, 180, 600)).toBe(32 * 60);
  });

  it('o estouro do bloco no ar não vira tempo negativo', () => {
    // O bloco de 10 min já passou de 12: só os 25 min seguintes contam.
    expect(remainingSeconds(track, 0, false, 720, 600)).toBe(25 * 60);
  });

  it('no último bloco, o que falta é só o resto dele', () => {
    expect(remainingSeconds(track, 2, false, 60, 300)).toBe(240);
  });

  it('dentro de um resgate, a pauta inteira a partir do ponto de retorno ainda conta', () => {
    // O resgate tem 5 min previstos e correu 1; a pauta volta no bloco de índice 1.
    expect(remainingSeconds(track, 1, true, 60, 300)).toBe(240 + 25 * 60);
  });

  it('pauta vazia devolve só o resto do bloco no ar', () => {
    expect(remainingSeconds([], 0, false, 0, 300)).toBe(300);
  });
});

describe('sub-ponto é passo igual: o nível não muda a ordem de revelação', () => {
  // Os mesmos três pontos, um deles como sub-ponto do primeiro. O Palco tem de
  // enxergar exatamente a sequência plana que enxergava antes de existir nível.
  const flat = [beat('p1', false, 0), beat('p2', false, 1), beat('p3', false, 2)];
  const nested = [beat('p1', false, 0), beat('p2', false, 1, 1), beat('p3', false, 2, 2)];

  it('revela um por vez, atravessando níveis', () => {
    expect(revealedBeats(block('b', nested)).map((entry) => entry.id)).toEqual(
      revealedBeats(block('b', flat)).map((entry) => entry.id)
    );
    expect(currentBeat(block('b', nested))?.id).toBe('p1');
    expect(beatToAdvance(block('b', nested))?.id).toBe('p1');
  });

  it('com o pai falado, o sub-ponto é o próximo passo — não um item revelado junto', () => {
    const target = block('b', [
      beat('p1', true, 0),
      beat('p2', false, 1, 1),
      beat('p3', false, 2, 2)
    ]);
    expect(doneCount(target)).toBe(1);
    expect(revealedBeats(target).map((entry) => entry.id)).toEqual(['p1', 'p2']);
    expect(beatToAdvance(target)?.id).toBe('p2');
    expect(beatToRewind(target)?.id).toBe('p1');
  });
});
