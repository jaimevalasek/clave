import type { Database } from '../db/database.js';
import { nowIso } from './clock.js';
import { notFound, validationFailed } from '../http/errors.js';
import { todayIso, validateRundown } from '../../../shared/validation/rundown.js';
import type { Rundown, RundownSummary } from '../../../shared/types.js';
import { isMediaReferenced, listLegacyMediaPaths } from '../repositories/mediaReferenceRepository.js';
import { listSheetMediaPaths } from '../repositories/sheetRepository.js';
import { removeUnreferencedMedia } from './mediaService.js';
import {
  deleteRundown,
  duplicateRundown,
  findRundown,
  findRundownSummary,
  insertRundown,
  listRundowns,
  togglePinRundown,
  touchRundown,
  updateRundown
} from '../repositories/rundownRepository.js';

export function listAll(db: Database): RundownSummary[] {
  return listRundowns(db);
}

export function getSummary(db: Database, id: string): RundownSummary {
  const summary = findRundownSummary(db, id);
  if (!summary) throw notFound('Pauta não encontrada.');
  return summary;
}

export function create(db: Database, payload: unknown): Rundown {
  const result = validateRundown(payload);
  if (!result.ok) throw validationFailed(result.errors);
  return insertRundown(db, { ...result.value, date: result.value.date ?? todayIso() }, nowIso());
}

export function update(db: Database, id: string, payload: unknown): RundownSummary {
  const existing = findRundown(db, id);
  if (!existing) throw notFound('Pauta não encontrada.');
  const result = validateRundown(payload);
  if (!result.ok) throw validationFailed(result.errors);
  updateRundown(db, id, result.value, nowIso());
  return getSummary(db, id);
}

export const rename = update;

export function togglePin(db: Database, id: string): RundownSummary {
  const existing = findRundown(db, id);
  if (!existing) throw notFound('Pauta não encontrada.');
  const summary = togglePinRundown(db, id, nowIso());
  if (!summary) throw notFound('Pauta não encontrada.');
  return summary;
}

export function duplicate(db: Database, id: string): Rundown {
  const source = findRundown(db, id);
  if (!source) throw notFound('Pauta não encontrada.');
  const title = `${source.title} (cópia)`.slice(0, 120);
  return db.transaction(() => duplicateRundown(db, source, title, nowIso()))();
}

/**
 * Deletes the rundown and then the media files only it used
 * (AC-pauta-revelavel-05). The row goes first, inside a transaction; files are
 * removed afterwards and only when nothing else references them, so a file
 * shared with a copy stays in the media folder.
 */
export function remove(db: Database, id: string): void {
  const existing = findRundown(db, id);
  if (!existing) throw notFound('Pauta não encontrada.');
  const paths = db.transaction(() => {
    const collected = [...listSheetMediaPaths(db, id), ...listLegacyMediaPaths(db, id)];
    deleteRundown(db, id);
    return collected;
  })();
  removeUnreferencedMedia(paths, (path) => isMediaReferenced(db, path));
}

/** Abrir a pauta marca a última usada: é o que o boot reabre. */
export function open(db: Database, id: string): RundownSummary {
  const existing = findRundown(db, id);
  if (!existing) throw notFound('Pauta não encontrada.');
  touchRundown(db, id, nowIso());
  return getSummary(db, id);
}
