import type { Database } from '../db/database.js';

interface BackgroundPreference {
  kind?: unknown;
  value?: unknown;
}

/**
 * Whether any row still points at a file of the media folder: a sheet block, a
 * legacy attachment or beat image (rundowns and library), or the background
 * image chosen in Appearance. Deleting a rundown only removes files that answer
 * false here, so a file shared with a copy stays on disk.
 */
export function isMediaReferenced(db: Database, path: string): boolean {
  const row = db.get<{ found: number }>(
    `SELECT EXISTS (SELECT 1 FROM sheet_blocks WHERE media_path = ?)
         OR EXISTS (SELECT 1 FROM attachments WHERE path = ?)
         OR EXISTS (SELECT 1 FROM beats WHERE image_path = ?) AS found`,
    [path, path, path]
  );
  if (row?.found) return true;

  const preference = db.get<{ value: string }>("SELECT value FROM preferences WHERE key = 'background'");
  if (!preference) return false;
  try {
    const background = JSON.parse(preference.value) as BackgroundPreference;
    return background.kind === 'image' && background.value === path;
  } catch {
    return false;
  }
}

/** Legacy file references of one rundown (attachments and beat images). */
export function listLegacyMediaPaths(db: Database, rundownId: string): string[] {
  return db
    .all<{ path: string }>(
      `SELECT a.path AS path FROM attachments a
         JOIN blocks b ON b.id = a.block_id
        WHERE b.rundown_id = ? AND a.path <> ''
       UNION
       SELECT p.image_path AS path FROM beats p
         JOIN blocks b ON b.id = p.block_id
        WHERE b.rundown_id = ? AND p.image_path <> ''`,
      [rundownId, rundownId]
    )
    .map((row) => row.path);
}
