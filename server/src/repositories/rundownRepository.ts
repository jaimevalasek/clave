import { randomUUID } from 'node:crypto';
import { copyBeats } from './beatRepository.js';
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
}

interface SummaryRow extends RundownRow {
  track_block_count: number;
  rescue_block_count: number;
  planned_minutes: number | null;
  open_run_id: string | null;
  last_finished_run_id: string | null;
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
    date: row.date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastOpenedAt: row.last_opened_at
  };
}

function toSummary(row: SummaryRow): RundownSummary {
  return {
    ...toRundown(row),
    trackBlockCount: row.track_block_count,
    rescueBlockCount: row.rescue_block_count,
    plannedMinutes: row.planned_minutes ?? 0,
    openRunId: row.open_run_id,
    lastFinishedRunId: row.last_finished_run_id
  };
}

const SUMMARY_SQL = `
  SELECT r.*,
    (SELECT COUNT(*) FROM blocks b WHERE b.rundown_id = r.id AND b.type <> 'rescue') AS track_block_count,
    (SELECT COUNT(*) FROM blocks b WHERE b.rundown_id = r.id AND b.type = 'rescue') AS rescue_block_count,
    (SELECT SUM(b.duration_minutes) FROM blocks b WHERE b.rundown_id = r.id AND b.type <> 'rescue') AS planned_minutes,
    (SELECT x.id FROM runs x WHERE x.rundown_id = r.id AND x.ended_at IS NULL ORDER BY x.started_at DESC LIMIT 1) AS open_run_id,
    (SELECT x.id FROM runs x WHERE x.rundown_id = r.id AND x.ended_at IS NOT NULL ORDER BY x.started_at DESC LIMIT 1) AS last_finished_run_id
  FROM rundowns r
`;

export function listRundowns(db: Database): RundownSummary[] {
  return db
    .all<SummaryRow>(`${SUMMARY_SQL} ORDER BY r.pinned DESC, r.last_opened_at DESC`)
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
  input: { title: string; date: string; kind?: RundownKind; pinned?: boolean },
  now: string
): Rundown {
  const id = randomUUID();
  const kind = input.kind ?? 'rundown';
  const pinned = input.pinned ? 1 : 0;
  db.run(
    `INSERT INTO rundowns (id, title, kind, pinned, date, created_at, updated_at, last_opened_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, input.title, kind, pinned, input.date, now, now, now]
  );
  return {
    id,
    title: input.title,
    kind,
    pinned: Boolean(pinned),
    date: input.date,
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: now
  };
}

export function updateRundown(
  db: Database,
  id: string,
  input: { title: string; date: string; kind?: RundownKind; pinned?: boolean },
  now: string
): void {
  const existing = findRundown(db, id);
  const kind = input.kind ?? existing?.kind ?? 'rundown';
  const pinned = input.pinned !== undefined ? (input.pinned ? 1 : 0) : existing?.pinned ? 1 : 0;
  db.run(
    'UPDATE rundowns SET title = ?, date = ?, kind = ?, pinned = ?, updated_at = ? WHERE id = ?',
    [input.title, input.date, kind, pinned, now, id]
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

/** Coluna legada da curva de energia removida: gravada neutra, nunca lida. */
const LEGACY_ENERGY = 3;

interface BlockCopyRow {
  id: string;
  type: string;
  title: string;
  note: string;
  duration_minutes: number;
  position: number | null;
  library_item_id: string | null;
}

interface AttachmentCopyRow {
  block_id: string;
  type: string;
  label: string;
  path: string;
  content: string;
  fullscreen: number;
  position: number;
}

/**
 * Duplica a pauta com cópia dos blocos, anexos e pontos. Cada cópia recebe id
 * próprio: editar a duplicata nunca alcança a original. Os pontos entram
 * desmarcados — a duplicata é uma live que ainda não aconteceu.
 */
export function duplicateRundown(db: Database, source: Rundown, title: string, now: string): Rundown {
  const copy = insertRundown(db, { title, date: source.date, kind: source.kind, pinned: false }, now);
  const blocks = db.all<BlockCopyRow>(
    `SELECT id, type, title, note, duration_minutes, position, library_item_id
     FROM blocks WHERE rundown_id = ? ORDER BY position IS NULL, position, rowid`,
    [source.id]
  );

  for (const block of blocks) {
    const newBlockId = randomUUID();
    db.run(
      `INSERT INTO blocks (id, rundown_id, type, title, note, energy, duration_minutes, position,
                           library_item_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newBlockId,
        copy.id,
        block.type,
        block.title,
        block.note,
        LEGACY_ENERGY,
        block.duration_minutes,
        block.position,
        block.library_item_id,
        now,
        now
      ]
    );
    const attachments = db.all<AttachmentCopyRow>(
      `SELECT block_id, type, label, path, content, fullscreen, position
       FROM attachments WHERE block_id = ? ORDER BY position`,
      [block.id]
    );
    for (const attachment of attachments) {
      db.run(
        `INSERT INTO attachments (id, block_id, library_item_id, type, label, path, content, fullscreen, position)
         VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?)`,
        [
          randomUUID(),
          newBlockId,
          attachment.type,
          attachment.label,
          attachment.path,
          attachment.content,
          attachment.fullscreen,
          attachment.position
        ]
      );
    }
    copyBeats(db, { column: 'block_id', id: block.id }, { column: 'block_id', id: newBlockId });
  }

  return copy;
}
