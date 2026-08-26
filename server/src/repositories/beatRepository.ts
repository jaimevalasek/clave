import { randomUUID } from 'node:crypto';
import type { Database } from '../db/database.js';
import type { Beat } from '../../../shared/types.js';

interface BeatRow {
  id: string;
  block_id: string | null;
  library_item_id: string | null;
  text: string;
  image_path: string;
  done: number;
  depth: number;
  position: number;
}

function toBeat(row: BeatRow): Beat {
  return {
    id: row.id,
    text: row.text,
    imagePath: row.image_path,
    done: row.done === 1,
    depth: row.depth,
    position: row.position
  };
}

type OwnerColumn = 'block_id' | 'library_item_id';

function listByOwners(db: Database, column: OwnerColumn, ids: string[]): Map<string, Beat[]> {
  const grouped = new Map<string, Beat[]>();
  if (!ids.length) return grouped;
  const placeholders = ids.map(() => '?').join(', ');
  const rows = db.all<BeatRow>(
    `SELECT * FROM beats WHERE ${column} IN (${placeholders}) ORDER BY position, rowid`,
    ids
  );
  for (const row of rows) {
    const owner = row[column] as string;
    const list = grouped.get(owner) ?? [];
    list.push(toBeat(row));
    grouped.set(owner, list);
  }
  return grouped;
}

export function listByBlockIds(db: Database, blockIds: string[]): Map<string, Beat[]> {
  return listByOwners(db, 'block_id', blockIds);
}

export function listByLibraryItemIds(db: Database, itemIds: string[]): Map<string, Beat[]> {
  return listByOwners(db, 'library_item_id', itemIds);
}

export function findBeat(db: Database, id: string): { beat: Beat; blockId: string | null } | null {
  const row = db.get<BeatRow>('SELECT * FROM beats WHERE id = ?', [id]);
  if (!row) return null;
  return { beat: toBeat(row), blockId: row.block_id };
}

/**
 * Reescreve a lista de pontos do dono, preservando o id de quem já existia — a
 * gaveta manda a lista inteira e a marca de falado do Palco não pode se perder
 * porque o criador editou o texto de um ponto vizinho.
 */
export function replaceBeats(
  db: Database,
  owner: { column: OwnerColumn; id: string },
  beats: Omit<Beat, 'position'>[]
): void {
  const existing = db.all<{ id: string }>(`SELECT id FROM beats WHERE ${owner.column} = ?`, [
    owner.id
  ]);
  const keptIds = new Set(beats.map((beat) => beat.id));
  for (const row of existing) {
    if (!keptIds.has(row.id)) db.run('DELETE FROM beats WHERE id = ?', [row.id]);
  }

  const existingIds = new Set(existing.map((row) => row.id));
  beats.forEach((beat, index) => {
    if (existingIds.has(beat.id)) {
      db.run(
        'UPDATE beats SET text = ?, image_path = ?, done = ?, depth = ?, position = ? WHERE id = ?',
        [beat.text, beat.imagePath, beat.done ? 1 : 0, beat.depth, index, beat.id]
      );
      return;
    }
    const otherColumn: OwnerColumn =
      owner.column === 'block_id' ? 'library_item_id' : 'block_id';
    // Ponto novo sempre recebe id do servidor: o rascunho da gaveta manda um id
    // provisório, e adotá-lo como chave primária colidiria entre blocos.
    db.run(
      `INSERT INTO beats (id, ${owner.column}, ${otherColumn}, text, image_path, done, depth, position)
       VALUES (?, ?, NULL, ?, ?, ?, ?, ?)`,
      [randomUUID(), owner.id, beat.text, beat.imagePath, beat.done ? 1 : 0, beat.depth, index]
    );
  });
}

export function setBeatDone(db: Database, id: string, done: boolean): void {
  db.run('UPDATE beats SET done = ? WHERE id = ?', [done ? 1 : 0, id]);
}

/** `Entrar no ar` começa a live com o checklist limpo, em toda a pauta. */
export function clearDoneForRundown(db: Database, rundownId: string): void {
  db.run(
    `UPDATE beats SET done = 0
     WHERE block_id IN (SELECT id FROM blocks WHERE rundown_id = ?)`,
    [rundownId]
  );
}

export function copyBeats(
  db: Database,
  from: { column: OwnerColumn; id: string },
  to: { column: OwnerColumn; id: string }
): void {
  const rows = db.all<BeatRow>(
    `SELECT * FROM beats WHERE ${from.column} = ? ORDER BY position, rowid`,
    [from.id]
  );
  const otherColumn: OwnerColumn = to.column === 'block_id' ? 'library_item_id' : 'block_id';
  rows.forEach((row, index) => {
    // A cópia nasce por falar: a marca de falado pertence à live que já rodou.
    db.run(
      `INSERT INTO beats (id, ${to.column}, ${otherColumn}, text, image_path, done, depth, position)
       VALUES (?, ?, NULL, ?, ?, 0, ?, ?)`,
      [randomUUID(), to.id, row.text, row.image_path, row.depth, index]
    );
  });
}
