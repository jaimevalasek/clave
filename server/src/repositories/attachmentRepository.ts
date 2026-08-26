import { randomUUID } from 'node:crypto';
import type { Database } from '../db/database.js';
import type { Attachment, AttachmentType } from '../../../shared/types.js';

interface AttachmentRow {
  id: string;
  block_id: string | null;
  library_item_id: string | null;
  type: string;
  label: string;
  path: string;
  content: string;
  fullscreen: number;
  position: number;
}

function toAttachment(row: AttachmentRow): Attachment {
  return {
    id: row.id,
    type: row.type as AttachmentType,
    label: row.label,
    path: row.path,
    content: row.content,
    fullscreen: row.fullscreen === 1,
    position: row.position
  };
}

export function listByBlockIds(db: Database, blockIds: string[]): Map<string, Attachment[]> {
  const grouped = new Map<string, Attachment[]>();
  if (!blockIds.length) return grouped;
  const placeholders = blockIds.map(() => '?').join(', ');
  const rows = db.all<AttachmentRow>(
    `SELECT * FROM attachments WHERE block_id IN (${placeholders}) ORDER BY position, rowid`,
    blockIds
  );
  for (const row of rows) {
    const list = grouped.get(row.block_id as string) ?? [];
    list.push(toAttachment(row));
    grouped.set(row.block_id as string, list);
  }
  return grouped;
}

export function listByLibraryItemIds(db: Database, itemIds: string[]): Map<string, Attachment[]> {
  const grouped = new Map<string, Attachment[]>();
  if (!itemIds.length) return grouped;
  const placeholders = itemIds.map(() => '?').join(', ');
  const rows = db.all<AttachmentRow>(
    `SELECT * FROM attachments WHERE library_item_id IN (${placeholders}) ORDER BY position, rowid`,
    itemIds
  );
  for (const row of rows) {
    const list = grouped.get(row.library_item_id as string) ?? [];
    list.push(toAttachment(row));
    grouped.set(row.library_item_id as string, list);
  }
  return grouped;
}

type OwnerColumn = 'block_id' | 'library_item_id';

/**
 * Reescreve a lista de anexos do dono, preservando o id de quem já existia — a
 * gaveta manda a lista inteira e o registro precisa manter identidade estável.
 */
export function replaceAttachments(
  db: Database,
  owner: { column: OwnerColumn; id: string },
  attachments: Omit<Attachment, 'position'>[]
): void {
  const existing = db.all<{ id: string }>(
    `SELECT id FROM attachments WHERE ${owner.column} = ?`,
    [owner.id]
  );
  const keptIds = new Set(attachments.map((attachment) => attachment.id));
  for (const row of existing) {
    if (!keptIds.has(row.id)) {
      db.run('DELETE FROM attachments WHERE id = ?', [row.id]);
    }
  }

  const existingIds = new Set(existing.map((row) => row.id));
  attachments.forEach((attachment, index) => {
    if (existingIds.has(attachment.id)) {
      db.run(
        `UPDATE attachments SET type = ?, label = ?, path = ?, content = ?, fullscreen = ?, position = ?
         WHERE id = ?`,
        [
          attachment.type,
          attachment.label,
          attachment.path,
          attachment.content,
          attachment.fullscreen,
          index,
          attachment.id
        ]
      );
      return;
    }
    const otherColumn: OwnerColumn = owner.column === 'block_id' ? 'library_item_id' : 'block_id';
    // Anexo novo sempre recebe id do servidor: o rascunho da gaveta manda um id
    // provisório, e adotá-lo como chave primária colidiria entre blocos.
    db.run(
      `INSERT INTO attachments (id, ${owner.column}, ${otherColumn}, type, label, path, content, fullscreen, position)
       VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?)`,
      [
        randomUUID(),
        owner.id,
        attachment.type,
        attachment.label,
        attachment.path,
        attachment.content,
        attachment.fullscreen,
        index
      ]
    );
  });
}

export function copyAttachments(
  db: Database,
  from: { column: OwnerColumn; id: string },
  to: { column: OwnerColumn; id: string }
): void {
  const rows = db.all<AttachmentRow>(
    `SELECT * FROM attachments WHERE ${from.column} = ? ORDER BY position, rowid`,
    [from.id]
  );
  const otherColumn: OwnerColumn = to.column === 'block_id' ? 'library_item_id' : 'block_id';
  rows.forEach((row, index) => {
    db.run(
      `INSERT INTO attachments (id, ${to.column}, ${otherColumn}, type, label, path, content, fullscreen, position)
       VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?)`,
      [randomUUID(), to.id, row.type, row.label, row.path, row.content, row.fullscreen, index]
    );
  });
}
