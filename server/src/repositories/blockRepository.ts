import { randomUUID } from 'node:crypto';
import type { Database } from '../db/database.js';
import type { Beat, Block, BlockType } from '../../../shared/types.js';
import { listByBlockIds as listAttachmentsByBlockIds } from './attachmentRepository.js';
import { listByBlockIds as listBeatsByBlockIds } from './beatRepository.js';

/**
 * A coluna `energy` é legado da curva de energia, removida do produto. As
 * migrações são só aditivas e a coluna é `NOT NULL`, então toda escrita grava
 * o mesmo valor neutro; nada no domínio lê de volta.
 */
const LEGACY_ENERGY = 3;

interface BlockRow {
  id: string;
  rundown_id: string;
  type: string;
  title: string;
  note: string;
  duration_minutes: number;
  position: number | null;
  library_item_id: string | null;
}

function toBlock(row: BlockRow, attachments: Block['attachments'], beats: Beat[]): Block {
  return {
    id: row.id,
    rundownId: row.rundown_id,
    type: row.type as BlockType,
    title: row.title,
    note: row.note,
    durationMinutes: row.duration_minutes,
    position: row.position,
    libraryItemId: row.library_item_id,
    attachments,
    beats
  };
}

/** Blocos da pauta: primeiro a pauta em ordem, depois o deck de resgate. */
export function listBlocks(db: Database, rundownId: string): Block[] {
  const rows = db.all<BlockRow>(
    `SELECT * FROM blocks WHERE rundown_id = ?
     ORDER BY position IS NULL, position, rowid`,
    [rundownId]
  );
  const ids = rows.map((row) => row.id);
  const attachments = listAttachmentsByBlockIds(db, ids);
  const beats = listBeatsByBlockIds(db, ids);
  return rows.map((row) => toBlock(row, attachments.get(row.id) ?? [], beats.get(row.id) ?? []));
}

export function findBlock(db: Database, id: string): Block | null {
  const row = db.get<BlockRow>('SELECT * FROM blocks WHERE id = ?', [id]);
  if (!row) return null;
  return toBlock(
    row,
    listAttachmentsByBlockIds(db, [row.id]).get(row.id) ?? [],
    listBeatsByBlockIds(db, [row.id]).get(row.id) ?? []
  );
}

export interface BlockWrite {
  type: BlockType;
  title: string;
  note: string;
  durationMinutes: number;
  position: number | null;
  libraryItemId: string | null;
}

export function insertBlock(
  db: Database,
  rundownId: string,
  input: BlockWrite,
  now: string
): string {
  const id = randomUUID();
  db.run(
    `INSERT INTO blocks (id, rundown_id, type, title, note, energy, duration_minutes, position,
                         library_item_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      rundownId,
      input.type,
      input.title,
      input.note,
      LEGACY_ENERGY,
      input.durationMinutes,
      input.position,
      input.libraryItemId,
      now,
      now
    ]
  );
  return id;
}

export function updateBlock(db: Database, id: string, input: BlockWrite, now: string): void {
  db.run(
    `UPDATE blocks SET type = ?, title = ?, note = ?, duration_minutes = ?,
                       position = ?, library_item_id = ?, updated_at = ?
     WHERE id = ?`,
    [
      input.type,
      input.title,
      input.note,
      input.durationMinutes,
      input.position,
      input.libraryItemId,
      now,
      id
    ]
  );
}

export function setPosition(db: Database, id: string, position: number | null, now: string): void {
  db.run('UPDATE blocks SET position = ?, updated_at = ? WHERE id = ?', [position, now, id]);
}

export function deleteBlock(db: Database, id: string): void {
  db.run('DELETE FROM blocks WHERE id = ?', [id]);
}
