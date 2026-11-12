import { randomUUID } from 'node:crypto';
import { copySheet } from './sheetRepository.js';
import type { Database } from '../db/database.js';
import { RUNDOWN_KINDS } from '../../../shared/types.js';
import type { Rundown, RundownKind, RundownSummary } from '../../../shared/types.js';

interface RundownRow {
  id: string;
  title: string;
  kind?: string;
  pinned?: number;
  date: string;
  created_at: string;
  updated_at: string;
  last_opened_at: string;
  legacy_imported_at?: string | null;
}

interface SummaryRow extends RundownRow {
  block_count: number;
  initially_visible_count: number;
}

function toRundown(row: RundownRow): Rundown {
  const rawKind = row.kind as RundownKind | undefined;
  const kind: RundownKind =
    rawKind && (RUNDOWN_KINDS as readonly string[]).includes(rawKind) ? rawKind : 'rundown';

  return {
    id: row.id,
    title: row.title,
    kind,
    pinned: Boolean(row.pinned),
    legacyImported: Boolean(row.legacy_imported_at),
    date: row.date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastOpenedAt: row.last_opened_at
  };
}

function toSummary(row: SummaryRow): RundownSummary {
  return {
    ...toRundown(row),
    blockCount: row.block_count,
    initiallyVisibleCount: row.initially_visible_count
  };
}

const SUMMARY_SQL = `
  SELECT r.*,
    (SELECT COUNT(*) FROM sheet_blocks s WHERE s.rundown_id = r.id) AS block_count,
    (SELECT COUNT(*) FROM sheet_blocks s WHERE s.rundown_id = r.id AND s.planned_visible = 1) AS initially_visible_count
  FROM rundowns r
`;

/**
 * Pinned rundowns first, then the most recently opened. A tie (a copy inherits
 * the opening time of its source) keeps the older one on top, so the copy lands
 * right below its source.
 */
export function listRundowns(db: Database): RundownSummary[] {
  return db
    .all<SummaryRow>(`${SUMMARY_SQL} ORDER BY r.pinned DESC, r.last_opened_at DESC, r.created_at ASC, r.rowid ASC`)
    .map(toSummary);
}

export function findRundownSummary(db: Database, id: string): RundownSummary | null {
  const row = db.get<SummaryRow>(`${SUMMARY_SQL} WHERE r.id = ?`, [id]);
  return row ? toSummary(row) : null;
}

export function findRundown(db: Database, id: string): Rundown | null {
  const row = db.get<RundownRow>('SELECT * FROM rundowns WHERE id = ?', [id]);
  return row ? toRundown(row) : null;
}

export function insertRundown(
  db: Database,
  input: { title: string; date: string; kind?: RundownKind; pinned?: boolean; lastOpenedAt?: string },
  now: string
): Rundown {
  const id = randomUUID();
  const kind = input.kind ?? 'rundown';
  const pinned = input.pinned ? 1 : 0;
  const lastOpenedAt = input.lastOpenedAt ?? now;
  db.run(
    `INSERT INTO rundowns (id, title, kind, pinned, date, created_at, updated_at, last_opened_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, input.title, kind, pinned, input.date, now, now, lastOpenedAt]
  );
  return {
    id,
    title: input.title,
    kind,
    pinned: Boolean(pinned),
    legacyImported: false,
    date: input.date,
    createdAt: now,
    updatedAt: now,
    lastOpenedAt
  };
}

/** Fields left `undefined` keep their stored value. */
export function updateRundown(
  db: Database,
  id: string,
  input: { title: string; date?: string; kind?: RundownKind; pinned?: boolean },
  now: string
): void {
  const existing = findRundown(db, id);
  if (!existing) return;
  db.run(
    'UPDATE rundowns SET title = ?, date = ?, kind = ?, pinned = ?, updated_at = ? WHERE id = ?',
    [
      input.title,
      input.date ?? existing.date,
      input.kind ?? existing.kind,
      (input.pinned ?? existing.pinned) ? 1 : 0,
      now,
      id
    ]
  );
}

export function togglePinRundown(db: Database, id: string, now: string): RundownSummary | null {
  const existing = findRundown(db, id);
  if (!existing) return null;
  const nextPinned = existing.pinned ? 0 : 1;
  db.run('UPDATE rundowns SET pinned = ?, updated_at = ? WHERE id = ?', [nextPinned, now, id]);
  return findRundownSummary(db, id);
}

export function touchRundown(db: Database, id: string, now: string): void {
  db.run('UPDATE rundowns SET last_opened_at = ? WHERE id = ?', [now, id]);
}

export function deleteRundown(db: Database, id: string): void {
  db.run('DELETE FROM rundowns WHERE id = ?', [id]);
}

/** Saving the sheet counts as editing the rundown ("editada há…"). */
export function touchRundownUpdated(db: Database, id: string, now: string): void {
  db.run('UPDATE rundowns SET updated_at = ? WHERE id = ?', [now, id]);
}

/**
 * Duplicates the rundown with a copy of its sheet. Every block gets its own id,
 * so editing the copy never reaches the source, and the take starts from the
 * plan. The copy inherits the source's opening time to sit right below it.
 */
export function duplicateRundown(db: Database, source: Rundown, title: string, now: string): Rundown {
  const copy = insertRundown(
    db,
    { title, date: source.date, kind: source.kind, pinned: false, lastOpenedAt: source.lastOpenedAt },
    now
  );
  copySheet(db, source.id, copy.id, now);
  return copy;
}
