import { randomUUID } from 'node:crypto';
import type { Database } from './database.js';
import { defaultFontPx } from '../../../shared/blockSize.js';
import type { BlockSize } from '../../../shared/blockSize.js';
import { baseName, isSafeMediaPath, isWebUrl, mediaKindForName } from '../../../shared/media.js';
import { normalizeDepths } from '../../../shared/sheetTree.js';
import type { SheetBlockKind } from '../../../shared/types.js';
import { MAX_BLOCK_TEXT_LENGTH, MAX_MEDIA_NAME_LENGTH } from '../../../shared/validation/sheet.js';

interface LegacyBlockRow {
  id: string;
  title: string;
}

interface LegacyBeatRow {
  text: string;
  image_path: string;
  depth: number;
}

interface LegacyAttachmentRow {
  type: string;
  label: string;
  path: string;
  content: string;
}

interface ImportedBlock {
  kind: SheetBlockKind;
  depth: number;
  text: string;
  mediaPath: string;
  mediaName: string;
}

function textBlock(text: string, depth: number): ImportedBlock {
  return {
    kind: 'text',
    depth,
    text: text.replace(/\r\n?/g, '\n').trim().slice(0, MAX_BLOCK_TEXT_LENGTH),
    mediaPath: '',
    mediaName: ''
  };
}

/**
 * A legacy file reference becomes a media block only when it is a safe relative
 * path with an accepted extension of the expected family; a web URL becomes text
 * with the URL (F12); anything else becomes text with the file name.
 */
function fileBlock(
  path: string,
  label: string,
  depth: number,
  accepts: (kind: SheetBlockKind) => boolean
): ImportedBlock {
  const trimmed = path.trim();
  if (isWebUrl(trimmed)) return textBlock(trimmed, depth);
  const kind = mediaKindForName(trimmed);
  const name = (label.trim() || baseName(trimmed)).slice(0, MAX_MEDIA_NAME_LENGTH);
  if (kind && accepts(kind) && isSafeMediaPath(trimmed)) {
    return { kind, depth, text: '', mediaPath: trimmed, mediaName: name };
  }
  return textBlock(name || trimmed, depth);
}

function attachmentBlock(attachment: LegacyAttachmentRow): ImportedBlock | null {
  const depth = 1;
  switch (attachment.type) {
    case 'image':
    case 'video':
      return fileBlock(attachment.path, attachment.label, depth, (kind) => kind !== 'text');
    case 'link':
      return textBlock(attachment.path.trim() || attachment.label, depth);
    case 'code':
    case 'chat':
      return textBlock(attachment.content.trim() || attachment.label, depth);
    default:
      return textBlock(attachment.label.trim() || baseName(attachment.path), depth);
  }
}

/** AC-pauta-revelavel-47: the order and levels a legacy rundown turns into. */
function convertRundown(db: Database, rundownId: string): ImportedBlock[] {
  const blocks = db.all<LegacyBlockRow>(
    `SELECT id, title FROM blocks WHERE rundown_id = ?
     ORDER BY position IS NULL, position, created_at, rowid`,
    [rundownId]
  );
  const out: ImportedBlock[] = [];
  for (const block of blocks) {
    out.push(textBlock(block.title, 0));
    const beats = db.all<LegacyBeatRow>(
      'SELECT text, image_path, depth FROM beats WHERE block_id = ? ORDER BY position, rowid',
      [block.id]
    );
    for (const beat of beats) {
      const depth = Math.min(2, 1 + Math.max(0, beat.depth || 0));
      out.push(textBlock(beat.text, depth));
      if (beat.image_path.trim()) {
        out.push(fileBlock(beat.image_path, '', depth, (kind) => kind === 'image'));
      }
    }
    const attachments = db.all<LegacyAttachmentRow>(
      'SELECT type, label, path, content FROM attachments WHERE block_id = ? ORDER BY position, rowid',
      [block.id]
    );
    for (const attachment of attachments) {
      const converted = attachmentBlock(attachment);
      if (converted) out.push(converted);
    }
  }
  return normalizeDepths(out.filter((block) => block.kind !== 'text' || block.text));
}

function sizeFor(depth: number): BlockSize {
  return depth === 0 ? 'medium' : 'small';
}

/**
 * Converts every legacy rundown that was not converted yet into sheet blocks.
 * Everything starts hidden; the rundown gets the "veio da versão anterior" seal.
 * The legacy tables are only read (RULE-pauta-revelavel-09).
 *
 * `includeEmpty` seals rundowns with no legacy blocks too — true on the first
 * run, when every existing rundown is legacy. On a re-run only rundowns that
 * still hold legacy blocks and no sheet are candidates, so nothing duplicates.
 */
export function importLegacySheets(
  db: Database,
  now: string,
  options: { includeEmpty: boolean }
): number {
  const candidates = db.all<{ id: string; has_legacy: number }>(
    `SELECT r.id,
            EXISTS (SELECT 1 FROM blocks b WHERE b.rundown_id = r.id) AS has_legacy
     FROM rundowns r
     WHERE r.legacy_imported_at IS NULL
       AND NOT EXISTS (SELECT 1 FROM sheet_blocks s WHERE s.rundown_id = r.id)`
  );

  let converted = 0;
  for (const candidate of candidates) {
    if (!candidate.has_legacy && !options.includeEmpty) continue;
    const blocks = convertRundown(db, candidate.id);
    blocks.forEach((block, index) => {
      const size = block.kind === 'text' ? sizeFor(block.depth) : 'medium';
      db.run(
        `INSERT INTO sheet_blocks (id, rundown_id, position, depth, kind, content, media_path, media_name,
                                   size, font_px, planned_visible, take_visible, reveal_step, collapsed,
                                   created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, NULL, 0, ?, ?)`,
        [
          randomUUID(),
          candidate.id,
          index,
          block.depth,
          block.kind,
          block.kind === 'text' ? JSON.stringify([{ text: block.text }]) : '',
          block.mediaPath,
          block.mediaName,
          size,
          defaultFontPx(size),
          now,
          now
        ]
      );
    });
    db.run('UPDATE rundowns SET legacy_imported_at = ? WHERE id = ?', [now, candidate.id]);
    converted += 1;
  }
  return converted;
}
