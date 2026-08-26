import type { Database } from '../db/database.js';
import { badRequest, notFound, validationFailed } from '../http/errors.js';
import { validateBlock } from '../../../shared/validation/block.js';
import { validateAttachments } from '../../../shared/validation/attachment.js';
import { validateBeats } from '../../../shared/validation/beat.js';
import {
  compactPositions,
  normalizeTrackOrder,
  positionAfterTypeChange,
  trackOrder
} from '../../../shared/track.js';
import type { Block } from '../../../shared/types.js';
import {
  deleteBlock,
  findBlock,
  insertBlock,
  listBlocks,
  setPosition,
  updateBlock
} from '../repositories/blockRepository.js';
import { replaceAttachments } from '../repositories/attachmentRepository.js';
import { findBeat, replaceBeats, setBeatDone } from '../repositories/beatRepository.js';
import { findRundown } from '../repositories/rundownRepository.js';
import { getRundownWithBlocks } from './rundownService.js';
import type { RundownWithBlocks } from './rundownService.js';

const nowIso = () => new Date().toISOString();

function requireRundown(db: Database, rundownId: string): void {
  if (!findRundown(db, rundownId)) throw notFound('Pauta não encontrada.');
}

function requireBlock(db: Database, blockId: string): Block {
  const block = findBlock(db, blockId);
  if (!block) throw notFound('Bloco não encontrado.');
  return block;
}

/** Reescreve as posições da pauta em 0..n-1, tocando só o que mudou. */
function compactTrack(db: Database, rundownId: string, now: string): void {
  for (const change of compactPositions(listBlocks(db, rundownId))) {
    setPosition(db, change.id, change.position, now);
  }
}

/** Resposta das escritas de bloco: o estado inteiro da pauta mais o bloco tocado. */
export interface BlockWriteResult extends RundownWithBlocks {
  blockId: string;
}

/**
 * Anexos e pontos vêm junto na mesma escrita quando a gaveta os manda: bloco,
 * anexos e pontos gravam na mesma transação, sem estado parcial se algo falhar
 * no meio.
 */
function parseAttachments(input: Record<string, unknown>) {
  if (input.attachments === undefined) return null;
  const result = validateAttachments(input.attachments);
  if (!result.ok) throw validationFailed(result.errors);
  return result.value;
}

function parseBeats(input: Record<string, unknown>) {
  if (input.beats === undefined) return null;
  const result = validateBeats(input.beats);
  if (!result.ok) throw validationFailed(result.errors);
  return result.value;
}

export function create(db: Database, payload: unknown): BlockWriteResult {
  const input = (payload ?? {}) as Record<string, unknown>;
  const rundownId = String(input.rundownId ?? '');
  requireRundown(db, rundownId);

  const result = validateBlock(input);
  if (!result.ok) throw validationFailed(result.errors);
  const attachments = parseAttachments(input);
  const beats = parseBeats(input);

  const now = nowIso();
  const blocks = listBlocks(db, rundownId);
  const position = result.value.type === 'rescue' ? null : trackOrder(blocks).length;

  const blockId = db.transaction(() => {
    const id = insertBlock(db, rundownId, { ...result.value, position, libraryItemId: null }, now);
    if (attachments) replaceAttachments(db, { column: 'block_id', id }, attachments);
    if (beats) replaceBeats(db, { column: 'block_id', id }, beats);
    return id;
  })();

  return { ...getRundownWithBlocks(db, rundownId), blockId };
}

export function update(db: Database, blockId: string, payload: unknown): BlockWriteResult {
  const existing = requireBlock(db, blockId);
  const result = validateBlock(payload);
  if (!result.ok) throw validationFailed(result.errors);
  const input = (payload ?? {}) as Record<string, unknown>;
  const attachments = parseAttachments(input);
  const beats = parseBeats(input);

  const now = nowIso();
  const blocks = listBlocks(db, existing.rundownId);
  // Invariante: virar resgate tira da pauta; sair de resgate entra no fim.
  const position = positionAfterTypeChange(blocks, blockId, result.value.type, existing.position);

  db.transaction(() => {
    updateBlock(
      db,
      blockId,
      { ...result.value, position, libraryItemId: existing.libraryItemId },
      now
    );
    if (attachments) replaceAttachments(db, { column: 'block_id', id: blockId }, attachments);
    if (beats) replaceBeats(db, { column: 'block_id', id: blockId }, beats);
    compactTrack(db, existing.rundownId, now);
  })();

  return { ...getRundownWithBlocks(db, existing.rundownId), blockId };
}

export function remove(db: Database, blockId: string): RundownWithBlocks {
  const existing = requireBlock(db, blockId);
  const now = nowIso();
  db.transaction(() => {
    deleteBlock(db, blockId);
    // Só as posições ainda existentes recompactam; o trajeto guarda o snapshot.
    compactTrack(db, existing.rundownId, now);
  })();
  return getRundownWithBlocks(db, existing.rundownId);
}

export function replaceBlockAttachments(
  db: Database,
  blockId: string,
  payload: unknown
): RundownWithBlocks {
  const existing = requireBlock(db, blockId);
  const input = (payload ?? {}) as Record<string, unknown>;
  const result = validateAttachments(input.attachments);
  if (!result.ok) throw validationFailed(result.errors);

  db.transaction(() => {
    replaceAttachments(db, { column: 'block_id', id: blockId }, result.value);
  })();

  return getRundownWithBlocks(db, existing.rundownId);
}

/**
 * Marca ou desmarca um ponto. É a escrita que o Palco faz a cada avanço, então
 * recarregar a página no meio da live devolve o checklist onde ele estava.
 */
export function setBeatState(db: Database, beatId: string, payload: unknown): RundownWithBlocks {
  const found = findBeat(db, beatId);
  if (!found || !found.blockId) throw notFound('Ponto não encontrado.');

  const input = (payload ?? {}) as Record<string, unknown>;
  if (typeof input.done !== 'boolean') {
    throw badRequest('Informe `done` como true ou false.', 'invalid_beat_state');
  }

  const block = requireBlock(db, found.blockId);
  setBeatDone(db, beatId, input.done);
  return getRundownWithBlocks(db, block.rundownId);
}

/**
 * Reordenação idempotente: recebe a lista completa e ordenada de ids da pauta e
 * recompacta as posições em transação. Aplicar a mesma carga duas vezes gera o
 * mesmo estado, e "Desfazer" é só reenviar a ordem anterior.
 */
export function reorderTrack(db: Database, rundownId: string, payload: unknown): RundownWithBlocks {
  requireRundown(db, rundownId);
  const input = (payload ?? {}) as Record<string, unknown>;
  if (!Array.isArray(input.blockIds)) {
    throw badRequest('Envie a lista completa e ordenada de ids dos blocos em `blockIds`.');
  }

  const now = nowIso();
  const blocks = listBlocks(db, rundownId);
  const ordered = normalizeTrackOrder(blocks, input.blockIds.map(String));

  db.transaction(() => {
    ordered.forEach((id, index) => setPosition(db, id, index, now));
  })();

  return getRundownWithBlocks(db, rundownId);
}
