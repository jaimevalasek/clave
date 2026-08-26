import type { Block, BlockType } from './types.js';

/**
 * A pauta é a ordem da live, de cima para baixo. Este módulo concentra a
 * invariante da fonte — `type === 'rescue'` ⇒ `position === null` — e a
 * recompactação da sequência, para que nenhuma superfície a reimplemente.
 */

export interface TrackEntry {
  id: string;
  type: BlockType;
  position: number | null;
}

export function isRescue(type: BlockType): boolean {
  return type === 'rescue';
}

/** Verdadeiro quando o par tipo/posição respeita a invariante. */
export function satisfiesTrackInvariant(type: BlockType, position: number | null): boolean {
  return isRescue(type) ? position === null : position !== null;
}

/** Blocos da pauta, na ordem da live. */
export function trackOrder<T extends TrackEntry>(blocks: T[]): T[] {
  return blocks
    .filter((block) => !isRescue(block.type))
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}

/** Cartas do deck: os resgates, que ficam fora da ordem da pauta. */
export function rescueDeck<T extends TrackEntry>(blocks: T[]): T[] {
  return blocks.filter((block) => isRescue(block.type));
}

/**
 * Recompacta as posições em 0..n-1 preservando a ordem atual. Devolve só o que
 * mudou, para a escrita tocar o mínimo de linhas.
 */
export function compactPositions<T extends TrackEntry>(blocks: T[]): { id: string; position: number }[] {
  const changes: { id: string; position: number }[] = [];
  trackOrder(blocks).forEach((block, index) => {
    if (block.position !== index) changes.push({ id: block.id, position: index });
  });
  return changes;
}

/**
 * Aplica a troca de etiqueta de um bloco: virar resgate tira da pauta e
 * recompacta os demais; sair de resgate entra no fim da pauta.
 */
export function positionAfterTypeChange<T extends TrackEntry>(
  blocks: T[],
  blockId: string,
  nextType: BlockType,
  currentPosition: number | null
): number | null {
  if (isRescue(nextType)) return null;
  if (currentPosition !== null) return currentPosition;
  return trackOrder(blocks).filter((block) => block.id !== blockId).length;
}

/** Reordena a pauta movendo um bloco para o índice pedido. */
export function moveWithinTrack<T extends TrackEntry>(blocks: T[], blockId: string, target: number): string[] {
  const track = trackOrder(blocks);
  const moving = track.find((block) => block.id === blockId);
  if (!moving) return track.map((block) => block.id);
  const remaining = track.filter((block) => block.id !== blockId);
  const index = Math.max(0, Math.min(target, remaining.length));
  remaining.splice(index, 0, moving);
  return remaining.map((block) => block.id);
}

/**
 * Normaliza a lista de ids recebida do cliente: mantém a ordem pedida, ignora id
 * desconhecido e acrescenta no fim quem ficou de fora. É o que torna o endpoint
 * de reordenação idempotente.
 */
export function normalizeTrackOrder(blocks: Block[], requestedIds: string[]): string[] {
  const track = trackOrder(blocks);
  const known = new Set(track.map((block) => block.id));
  const seen = new Set<string>();
  const ordered: string[] = [];

  for (const id of requestedIds) {
    if (known.has(id) && !seen.has(id)) {
      seen.add(id);
      ordered.push(id);
    }
  }
  for (const block of track) {
    if (!seen.has(block.id)) ordered.push(block.id);
  }
  return ordered;
}
