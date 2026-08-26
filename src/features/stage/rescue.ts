import type { Block, Run } from '../../../shared/types';

/**
 * Deck de resgate: as cartas fora da pauta. Sacar não repete carta já usada
 * nesta execução, e o estado de "usada" é reconstruído do próprio trajeto —
 * retomar uma execução em aberto não devolve cartas ao sorteio.
 */

export function usedRescueIds(run: Run | null): Set<string> {
  const used = new Set<string>();
  for (const step of run?.steps ?? []) {
    if (step.wasRescue && step.blockId) used.add(step.blockId);
  }
  return used;
}

export function availableRescues(deck: Block[], used: Set<string>): Block[] {
  return deck.filter((card) => !used.has(card.id));
}

/**
 * Saque aleatório de `R`. A fonte de aleatoriedade entra por parâmetro para o
 * teste poder fixá-la.
 */
export function drawRescue(
  deck: Block[],
  used: Set<string>,
  random: () => number = Math.random
): Block | null {
  const available = availableRescues(deck, used);
  if (!available.length) return null;
  const index = Math.min(available.length - 1, Math.floor(random() * available.length));
  return available[index];
}

/**
 * Posição da pauta para onde a live volta ao sair do resgate: o último bloco
 * da pauta que esteve no ar. Sem nenhum, volta ao começo.
 */
export function trackIndexToResume(run: Run | null, track: Block[]): number {
  const steps = run?.steps ?? [];
  for (let i = steps.length - 1; i >= 0; i -= 1) {
    const step = steps[i];
    if (step.wasRescue || !step.blockId) continue;
    const index = track.findIndex((block) => block.id === step.blockId);
    if (index >= 0) return index;
  }
  return 0;
}

/** Verdadeiro quando o último passo do trajeto ainda é um resgate no ar. */
export function isInRescue(run: Run | null): boolean {
  const last = run?.steps[run.steps.length - 1];
  return Boolean(last?.wasRescue);
}
