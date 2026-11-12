import { randomUUID } from 'node:crypto';
import type { Database } from '../db/database.js';
import { DEFAULT_BLOCK_SIZE, defaultFontPx, isBlockSize } from '../../../shared/blockSize.js';
import { sanitizeRuns } from '../../../shared/textMarks.js';
import type { SheetBlock, SheetBlockKind } from '../../../shared/types.js';
import type { SheetBlockInput } from '../../../shared/validation/sheet.js';

interface SheetBlockRow {
  id: string;
  rundown_id: string;
  position: number;
  depth: number;
  kind: string;
  content: string;
  media_path: string;
  media_name: string;
  size: string;
  font_px: number;
  planned_visible: number;
  take_visible: number;
  reveal_step: number | null;
  collapsed: number;
}

function parseContent(raw: string): SheetBlock['content'] {
  if (!raw) return [];
  try {
    return sanitizeRuns(JSON.parse(raw));
  } catch {
    return [];
  }
}

function toSheetBlock(row: SheetBlockRow): SheetBlock {
  const size = isBlockSize(row.size) ? row.size : DEFAULT_BLOCK_SIZE;
  return {
    id: row.id,
    kind: row.kind as SheetBlockKind,
    depth: row.depth,
    content: row.kind === 'text' ? parseContent(row.content) : [],
    mediaPath: row.media_path,
    mediaName: row.media_name,
    size,
    fontPx: row.font_px || defaultFontPx(size),
    plannedVisible: row.planned_visible === 1,
    takeVisible: row.take_visible === 1,
    revealStep: row.reveal_step,
    collapsed: row.collapsed === 1
  };
}

export function listSheetBlocks(db: Database, rundownId: string): SheetBlock[] {
  return db
    .all<SheetBlockRow>('SELECT * FROM sheet_blocks WHERE rundown_id = ? ORDER BY position, rowid', [
      rundownId
    ])
    .map(toSheetBlock);
}

function contentColumn(block: Pick<SheetBlockInput, 'kind' | 'content'>): string {
  return block.kind === 'text' ? JSON.stringify(block.content) : '';
}

/**
 * Rewrites the whole sheet of one rundown. Must run inside a transaction (the
 * service owns it). A client id is only used to recognise a row that already
 * belongs to this rundown; every new row gets a server id, never the client's.
 */
export function replaceSheet(
  db: Database,
  rundownId: string,
  blocks: SheetBlockInput[],
  now: string
): Record<string, string> {
  const existing = new Set(
    db
      .all<{ id: string }>('SELECT id FROM sheet_blocks WHERE rundown_id = ?', [rundownId])
      .map((row) => row.id)
  );

  const ids: Record<string, string> = {};
  const kept = new Set<string>();
  for (const block of blocks) {
    const id = block.id && existing.has(block.id) ? block.id : randomUUID();
    ids[block.key] = id;
    kept.add(id);
  }

  for (const id of existing) {
    if (!kept.has(id)) db.run('DELETE FROM sheet_blocks WHERE id = ?', [id]);
  }

  blocks.forEach((block, position) => {
    const id = ids[block.key];
    const values = [
      position,
      block.depth,
      block.kind,
      contentColumn(block),
      block.mediaPath,
      block.mediaName,
      block.size,
      block.fontPx,
      block.plannedVisible,
      block.takeVisible,
      block.takeVisible ? block.revealStep : null,
      block.collapsed
    ];
    if (existing.has(id)) {
      db.run(
        `UPDATE sheet_blocks SET position = ?, depth = ?, kind = ?, content = ?, media_path = ?, media_name = ?,
                size = ?, font_px = ?, planned_visible = ?, take_visible = ?, reveal_step = ?, collapsed = ?,
                updated_at = ?
         WHERE id = ? AND rundown_id = ?`,
        [...values, now, id, rundownId]
      );
      return;
    }
    db.run(
      `INSERT INTO sheet_blocks (position, depth, kind, content, media_path, media_name, size, font_px,
                                 planned_visible, take_visible, reveal_step, collapsed,
                                 created_at, updated_at, id, rundown_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [...values, now, now, id, rundownId]
    );
  });

  return ids;
}

/** Copies a sheet with the take reset to the plan: the copy has not been recorded yet. */
export function copySheet(db: Database, fromRundownId: string, toRundownId: string, now: string): void {
  const rows = db.all<SheetBlockRow>(
    'SELECT * FROM sheet_blocks WHERE rundown_id = ? ORDER BY position, rowid',
    [fromRundownId]
  );
  rows.forEach((row, position) => {
    db.run(
      `INSERT INTO sheet_blocks (id, rundown_id, position, depth, kind, content, media_path, media_name,
                                 size, font_px, planned_visible, take_visible, reveal_step, collapsed,
                                 created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)`,
      [
        randomUUID(),
        toRundownId,
        position,
        row.depth,
        row.kind,
        row.content,
        row.media_path,
        row.media_name,
        row.size,
        row.font_px,
        row.planned_visible,
        row.planned_visible,
        row.collapsed,
        now,
        now
      ]
    );
  });
}

export function listSheetMediaPaths(db: Database, rundownId: string): string[] {
  return db
    .all<{ media_path: string }>(
      `SELECT DISTINCT media_path FROM sheet_blocks WHERE rundown_id = ? AND media_path <> ''`,
      [rundownId]
    )
    .map((row) => row.media_path);
}
