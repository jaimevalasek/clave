import { describe, expect, it } from 'vitest';
import {
  availableRescues,
  drawRescue,
  isInRescue,
  trackIndexToResume,
  usedRescueIds
} from '../../src/features/stage/rescue';
import type { Block, BlockType, Run, RunStep } from '../../shared/types';

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

function step(blockId: string, wasRescue: boolean, sequence: number): RunStep {
  return {
    id: `s${sequence}`,
    runId: 'run1',
    blockId,
    blockTitle: blockId,
    blockType: wasRescue ? 'rescue' : 'topic',
    libraryItemId: null,
    startOffsetSeconds: sequence * 60,
    actualSeconds: 60,
    plannedSeconds: 300,
    wasRescue,
    sequence
  };
}

function run(steps: RunStep[]): Run {
  return {
    id: 'run1',
    rundownId: 'r1',
    rundownTitle: 'Pauta',
    startedAt: '2026-08-18T20:00:00.000Z',
    endedAt: null,
    steps
  };
}

const track = [block('a', 'topic', 0), block('b', 'media', 1), block('c', 'topic', 2)];
const deck = [block('r1', 'rescue', null), block('r2', 'rescue', null), block('r3', 'rescue', null)];

describe('AC-clave-21 — a carta sacada sai do sorteio', () => {
  it('sem execução, o deck inteiro está disponível', () => {
    expect(availableRescues(deck, usedRescueIds(null))).toHaveLength(3);
  });

  it('reconstrói as cartas usadas a partir dos passos com foiResgate', () => {
    const used = usedRescueIds(run([step('a', false, 0), step('r2', true, 1), step('a', false, 2)]));
    expect([...used]).toEqual(['r2']);
    expect(availableRescues(deck, used).map((card) => card.id)).toEqual(['r1', 'r3']);
  });

  it('o saque aleatório nunca devolve carta já usada', () => {
    const used = new Set(['r1', 'r3']);
    for (const chance of [0, 0.5, 0.99]) {
      expect(drawRescue(deck, used, () => chance)?.id).toBe('r2');
    }
  });

  it('deck sem carta disponível não saca nada', () => {
    expect(drawRescue(deck, new Set(['r1', 'r2', 'r3']), () => 0.5)).toBeNull();
  });

  it('pauta sem resgate nenhum não saca nada', () => {
    expect(drawRescue([], new Set(), () => 0.5)).toBeNull();
  });

  it('sorteio no limite superior não estoura o fim da lista', () => {
    expect(drawRescue(deck, new Set(), () => 0.999999)?.id).toBe('r3');
  });
});

describe('AC-clave-21 — sair do resgate volta ao ponto exato do trilho', () => {
  it('volta ao último bloco do trilho que esteve no ar', () => {
    const current = run([step('a', false, 0), step('b', false, 1), step('r2', true, 2)]);
    expect(trackIndexToResume(current, track)).toBe(1);
    expect(isInRescue(current)).toBe(true);
  });

  it('sem execução, o ponto de retomada é o começo do trilho', () => {
    expect(trackIndexToResume(null, track)).toBe(0);
    expect(isInRescue(null)).toBe(false);
  });

  it('execução que só tocou resgate volta ao começo', () => {
    const current = run([step('r1', true, 0)]);
    expect(trackIndexToResume(current, track)).toBe(0);
  });

  it('bloco excluído do trilho não vira ponto de retomada', () => {
    const current = run([step('b', false, 0), step('excluido', false, 1), step('r1', true, 2)]);
    expect(trackIndexToResume(current, track)).toBe(1);
  });

  it('depois de voltar ao trilho, a execução não está mais em resgate', () => {
    const current = run([step('a', false, 0), step('r1', true, 1), step('a', false, 2)]);
    expect(isInRescue(current)).toBe(false);
    expect(trackIndexToResume(current, track)).toBe(0);
  });
});
