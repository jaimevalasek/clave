import type { BlockSize, SheetBlockKind, TextRun } from '../../shared/types';
import type { TestServer } from './testServer';

/** One block of a `PUT /api/rundowns/:id/sheet` payload, with test defaults. */
export interface SheetBlockDraft {
  key: string;
  id?: string | null;
  kind?: SheetBlockKind;
  depth?: number;
  content?: TextRun[] | unknown;
  mediaPath?: string;
  mediaName?: string;
  size?: BlockSize;
  fontPx?: number;
  plannedVisible?: boolean;
  takeVisible?: boolean;
  revealStep?: number | null;
  collapsed?: boolean;
}

export function textDraft(key: string, text: string, extra: Partial<SheetBlockDraft> = {}): SheetBlockDraft {
  return {
    key,
    kind: 'text',
    depth: 0,
    content: [{ text }],
    mediaPath: '',
    mediaName: '',
    size: 'medium',
    fontPx: 30,
    plannedVisible: false,
    takeVisible: false,
    revealStep: null,
    collapsed: false,
    ...extra
  };
}

export function mediaDraft(
  key: string,
  kind: Exclude<SheetBlockKind, 'text'>,
  mediaPath: string,
  extra: Partial<SheetBlockDraft> = {}
): SheetBlockDraft {
  return {
    key,
    kind,
    depth: 0,
    content: [],
    mediaPath,
    mediaName: mediaPath,
    size: 'medium',
    fontPx: 30,
    plannedVisible: false,
    takeVisible: false,
    revealStep: null,
    collapsed: false,
    ...extra
  };
}

export const PNG_BYTES = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from('png body for tests')
]);

/** Uploads through the real `POST /api/media` and returns the stored relative path. */
export async function uploadMedia(server: TestServer, fileName: string, body: Buffer): Promise<string> {
  const response = await fetch(`${server.url}/api/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream', 'x-clave-filename': encodeURIComponent(fileName) },
    body: new Uint8Array(body)
  });
  const payload = (await response.json()) as { media: { path: string } };
  if (response.status !== 201) throw new Error(`upload failed with ${response.status}`);
  return payload.media.path;
}
