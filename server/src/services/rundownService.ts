import type { Database } from '../db/database.js';
import { notFound, validationFailed } from '../http/errors.js';
import { validateRundown } from '../../../shared/validation/rundown.js';
import type { Block, Rundown, RundownSummary } from '../../../shared/types.js';
import { listBlocks } from '../repositories/blockRepository.js';
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

const nowIso = () => new Date().toISOString();

export function listAll(db: Database): RundownSummary[] {
  return listRundowns(db);
}

export function getSummary(db: Database, id: string): RundownSummary {
  const summary = findRundownSummary(db, id);
  if (!summary) throw notFound('Pauta não encontrada.');
  return summary;
}

export interface RundownWithBlocks {
  rundown: RundownSummary;
  blocks: Block[];
}

export function getRundownWithBlocks(db: Database, id: string): RundownWithBlocks {
  return { rundown: getSummary(db, id), blocks: listBlocks(db, id) };
}

export function create(db: Database, payload: unknown): Rundown {
  const result = validateRundown(payload);
  if (!result.ok) throw validationFailed(result.errors);
  return insertRundown(db, result.value, nowIso());
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

export function remove(db: Database, id: string): void {
  const existing = findRundown(db, id);
  if (!existing) throw notFound('Pauta não encontrada.');
  deleteRundown(db, id);
}

/** Abrir a pauta marca a última usada: é o que o boot reabre. */
export function open(db: Database, id: string): RundownSummary {
  const existing = findRundown(db, id);
  if (!existing) throw notFound('Pauta não encontrada.');
  touchRundown(db, id, nowIso());
  return getSummary(db, id);
}
