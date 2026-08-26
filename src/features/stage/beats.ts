import type { Beat, Block } from '../../../shared/types';

/**
 * Os pontos do bloco no ar, conduzidos como uma apresentação: cada avanço
 * marca o ponto em foco e revela o seguinte. O estado mora no próprio ponto
 * (`done`), então recarregar o Palco no meio da live devolve o checklist onde
 * ele estava.
 */

/**
 * Quantos pontos já foram falados. É o índice do primeiro ponto ainda aberto,
 * e não a contagem de marcados: marcar um ponto do meio na gaveta não pode
 * fazer o Palco pular os anteriores.
 */
export function doneCount(block: Block | null): number {
  const beats = block?.beats ?? [];
  const open = beats.findIndex((beat) => !beat.done);
  return open < 0 ? beats.length : open;
}

/** Pontos visíveis: os já falados mais o que está em foco agora. */
export function revealedBeats(block: Block | null): Beat[] {
  const beats = block?.beats ?? [];
  return beats.slice(0, Math.min(beats.length, doneCount(block) + 1));
}

/** O ponto em foco — o primeiro ainda não falado. `null` quando o bloco acabou. */
export function currentBeat(block: Block | null): Beat | null {
  return (block?.beats ?? [])[doneCount(block)] ?? null;
}

/** Ponto que o avanço marca. `null` significa: avance de bloco. */
export function beatToAdvance(block: Block | null): Beat | null {
  return currentBeat(block);
}

/** Ponto que o voltar desmarca. `null` significa: volte de bloco. */
export function beatToRewind(block: Block | null): Beat | null {
  const index = doneCount(block) - 1;
  return index >= 0 ? ((block?.beats ?? [])[index] ?? null) : null;
}

/**
 * Quanto ainda falta para fechar a pauta: o que resta do bloco no ar mais o
 * previsto de todos os blocos que ainda não entraram. É tempo relativo, medido
 * pela própria execução — nunca pelo relógio da gravação.
 */
export function remainingSeconds(
  track: Block[],
  trackIndex: number,
  inRescue: boolean,
  blockSeconds: number,
  plannedSeconds: number
): number {
  const restOfCurrent = Math.max(0, plannedSeconds - blockSeconds);
  // Fora do resgate, o bloco no ar é `track[trackIndex]` e já está contado em
  // `restOfCurrent`; dentro dele, a pauta inteira a partir de `trackIndex`
  // ainda está por vir.
  const from = inRescue ? trackIndex : trackIndex + 1;
  const ahead = track
    .slice(Math.max(0, from))
    .reduce((total, block) => total + block.durationMinutes * 60, 0);
  return restOfCurrent + ahead;
}
