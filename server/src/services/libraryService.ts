import type { Database } from '../db/database.js';
import { notFound, validationFailed } from '../http/errors.js';
import { validateAttachments } from '../../../shared/validation/attachment.js';
import { validateLibraryItem } from '../../../shared/validation/libraryItem.js';
import { trackOrder } from '../../../shared/track.js';
import type { LibraryItem } from '../../../shared/types.js';
import { copyAttachments, replaceAttachments } from '../repositories/attachmentRepository.js';
import { copyBeats } from '../repositories/beatRepository.js';
import { findBlock, insertBlock, listBlocks } from '../repositories/blockRepository.js';
import {
  deleteLibraryItem,
  findLibraryItem,
  insertLibraryItem,
  listLibraryItems,
  registerAirings,
  renameLibraryItem,
  touchLibraryItem
} from '../repositories/libraryRepository.js';
import { findRundown } from '../repositories/rundownRepository.js';
import { listSteps } from '../repositories/runRepository.js';
import { getRundownWithBlocks } from './rundownService.js';
import type { RundownWithBlocks } from './rundownService.js';

const nowIso = () => new Date().toISOString();
const todayIso = () => nowIso().slice(0, 10);

function requireItem(db: Database, id: string): LibraryItem {
  const item = findLibraryItem(db, id);
  if (!item) throw notFound('Item do acervo não encontrado.');
  return item;
}

export function listAll(db: Database): LibraryItem[] {
  return listLibraryItems(db);
}

/** Guardar no acervo: o bloco vira item com título, etiqueta e cópia dos anexos e pontos. */
export function promoteBlock(db: Database, payload: unknown): LibraryItem {
  const input = (payload ?? {}) as Record<string, unknown>;
  const block = findBlock(db, String(input.blockId ?? ''));
  if (!block) throw notFound('Bloco não encontrado.');

  const itemId = db.transaction(() => {
    const id = insertLibraryItem(db, { title: block.title, type: block.type }, nowIso());
    copyAttachments(db, { column: 'block_id', id: block.id }, { column: 'library_item_id', id });
    copyBeats(db, { column: 'block_id', id: block.id }, { column: 'library_item_id', id });
    return id;
  })();

  return requireItem(db, itemId);
}

export function rename(db: Database, id: string, payload: unknown): LibraryItem {
  requireItem(db, id);
  const result = validateLibraryItem(payload);
  if (!result.ok) throw validationFailed(result.errors);
  renameLibraryItem(db, id, result.value.title, nowIso());
  return requireItem(db, id);
}

export function replaceItemAttachments(db: Database, id: string, payload: unknown): LibraryItem {
  requireItem(db, id);
  const input = (payload ?? {}) as Record<string, unknown>;
  const result = validateAttachments(input.attachments);
  if (!result.ok) throw validationFailed(result.errors);

  db.transaction(() => {
    replaceAttachments(db, { column: 'library_item_id', id }, result.value);
    touchLibraryItem(db, id, nowIso());
  })();

  return requireItem(db, id);
}

export function remove(db: Database, id: string): void {
  requireItem(db, id);
  deleteLibraryItem(db, id);
}

/**
 * Trazer cópia: o bloco novo é independente do item, mas guarda a origem para
 * os contadores subirem quando ele for ao ar.
 */
export function copyToRundown(db: Database, id: string, rundownId: string): RundownWithBlocks {
  const item = requireItem(db, id);
  if (!findRundown(db, rundownId)) throw notFound('Pauta não encontrada.');

  const now = nowIso();
  db.transaction(() => {
    const blocks = listBlocks(db, rundownId);
    const position = item.type === 'rescue' ? null : trackOrder(blocks).length;
    const blockId = insertBlock(
      db,
      rundownId,
      {
        type: item.type,
        title: item.title,
        note: '',
        durationMinutes: 5,
        position,
        libraryItemId: item.id
      },
      now
    );
    copyAttachments(db, { column: 'library_item_id', id: item.id }, { column: 'block_id', id: blockId });
    copyBeats(db, { column: 'library_item_id', id: item.id }, { column: 'block_id', id: blockId });
  })();

  return getRundownWithBlocks(db, rundownId);
}

/**
 * Contadores do acervo no fechamento da execução: cada item que teve um bloco
 * seu registrado no trajeto sobe uma vez no ar.
 */
export function registerAiringsFromRun(db: Database, runId: string): void {
  const itemIds = [
    ...new Set(
      listSteps(db, runId)
        .map((step) => step.libraryItemId)
        .filter((id): id is string => Boolean(id))
    )
  ];
  if (!itemIds.length) return;
  registerAirings(db, itemIds, todayIso(), nowIso());
}
