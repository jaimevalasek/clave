// Media the sheet accepts (RULE-pauta-revelavel-07). Single source for sheet
// validation, the legacy import, the server and the client.

export type MediaKind = 'image' | 'video' | 'audio';

export const MEDIA_EXTENSIONS: Record<string, MediaKind> = {
  '.png': 'image',
  '.jpg': 'image',
  '.jpeg': 'image',
  '.gif': 'image',
  '.webp': 'image',
  '.mp4': 'video',
  '.m4v': 'video',
  '.mov': 'video',
  '.webm': 'video',
  '.mkv': 'video',
  '.mp3': 'audio',
  '.wav': 'audio'
};

/** Per-file ceiling: 512 MB (PRD deviation D2). */
export const MAX_MEDIA_BYTES = 512 * 1024 * 1024;

export function extensionOf(name: string): string {
  const match = /\.[^./\\]+$/.exec(name.trim());
  return match ? match[0].toLowerCase() : '';
}

export function mediaKindForName(name: string): MediaKind | null {
  return MEDIA_EXTENSIONS[extensionOf(name)] ?? null;
}

export function isWebUrl(text: string): boolean {
  return /^https?:\/\/\S+$/i.test(text.trim());
}

/**
 * Media path accepted by the sheet: relative, inside the app media folder.
 * Rejects URLs, absolute paths (`/x`, `C:/x`, `//host`) and any `..` segment.
 */
export function isSafeMediaPath(path: string): boolean {
  if (typeof path !== 'string') return false;
  const value = path.trim();
  if (!value || value.length > 512) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return false;
  if (value.startsWith('/') || value.startsWith('\\')) return false;
  return !value.split(/[\\/]/).some((segment) => segment === '..');
}

/** File name without folders, for captions and messages. */
export function baseName(path: string): string {
  const parts = path.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] ?? path;
}
