import { randomUUID } from 'node:crypto';
import type { Database } from '../db/database.js';
import type { Beat, BlockType, LibraryItem } from '../../../shared/types.js';
import { listByLibraryItemIds as listAttachmentsByLibraryItemIds } from './attachmentRepository.js';
import { listByLibraryItemIds as listBeatsByLibraryItemIds } from './beatRepository.js';

interface LibraryRow {
  id: string;
  title: string;
  type: string;
  air_count: number;
  last_aired_on: string | null;
  created_at: string;
  updated_at: string;
}

function toItem(row: LibraryRow, attachments: LibraryItem['attachments'], beats: Beat[]): LibraryItem {
  return {
    id: row.id,
    title: row.title,
    type: row.type as BlockType,
    airCount: row.air_count,
    lastAiredOn: row.last_aired_on,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    attachments,
    beats
  };
}

export function listLibraryItems(db: Database): LibraryItem[] {
  const rows = db.all<LibraryRow>('SELECT * FROM library_items ORDER BY updated_at DESC');
  const ids = rows.map((row) => row.id);
  const attachments = listAttachmentsByLibraryItemIds(db, ids);
  const beats = listBeatsByLibraryItemIds(db, ids);
  return rows.map((row) => toItem(row, attachments.get(row.id) ?? [], beats.get(row.id) ?? []));
}

export function findLibraryItem(db: Database, id: string): LibraryItem | null {
  const row = db.get<LibraryRow>('SELECT * FROM library_items WHERE id = ?', [id]);
  if (!row) return null;
  return toItem(
    row,
    listAttachmentsByLibraryItemIds(db, [row.id]).get(row.id) ?? [],
    listBeatsByLibraryItemIds(db, [row.id]).get(row.id) ?? []
  );
}

export function insertLibraryItem(
  db: Database,
  input: { title: string; type: BlockType },
  now: string
): string {
  const id = randomUUID();
  db.run(
    `INSERT INTO library_items (id, title, type, air_count, last_aired_on, created_at, updated_at)
     VALUES (?, ?, ?, 0, NULL, ?, ?)`,
    [id, input.title, input.type, now, now]
  );
  return id;
}

export function renameLibraryItem(db: Database, id: string, title: string, now: string): void {
  db.run('UPDATE library_items SET title = ?, updated_at = ? WHERE id = ?', [title, now, id]);
}

export function touchLibraryItem(db: Database, id: string, now: string): void {
  db.run('UPDATE library_items SET updated_at = ? WHERE id = ?', [now, id]);
}

export function deleteLibraryItem(db: Database, id: string): void {
  db.run('DELETE FROM library_items WHERE id = ?', [id]);
}

/**
 * Sobe o contador de vezes no ar e a data da última vez. Chamado no fechamento
 * da execução, dentro da mesma transação do encerramento.
 */
export function registerAirings(db: Database, itemIds: string[], airedOn: string, now: string): void {
  for (const id of itemIds) {
    db.run(
      `UPDATE library_items
       SET air_count = air_count + 1,
           last_aired_on = ?,
           updated_at = ?
       WHERE id = ?`,
      [airedOn, now, id]
    );
  }
}
