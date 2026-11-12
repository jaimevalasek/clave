import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { badRequest } from '../http/errors.js';
import { ensureDataDirs, mediaDir } from '../db/paths.js';
import { MAX_MEDIA_BYTES, extensionOf, mediaKindForName } from '../../../shared/media.js';

/** Bytes expected at `offset`, with `null` for a free position. */
interface Magic {
  bytes: (number | null)[];
  offset?: number;
}

/**
 * Signatures checked against the declared extension (RULE-pauta-revelavel-07):
 * a `.mp4` that is really another format never enters the media folder. The
 * accepted extensions are those of `shared/media.ts`; any other is refused.
 */
const SIGNATURES: Record<string, Magic[]> = {
  '.png': [{ bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }],
  '.jpg': [{ bytes: [0xff, 0xd8, 0xff] }],
  '.jpeg': [{ bytes: [0xff, 0xd8, 0xff] }],
  '.gif': [{ bytes: [0x47, 0x49, 0x46, 0x38] }],
  '.webp': [{ bytes: [0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50] }],
  '.webm': [{ bytes: [0x1a, 0x45, 0xdf, 0xa3] }],
  '.mkv': [{ bytes: [0x1a, 0x45, 0xdf, 0xa3] }],
  '.mp4': [{ bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 }],
  '.m4v': [{ bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 }],
  // QuickTime files may open with `ftyp`, or straight with a `moov`, `mdat` or `wide` atom.
  '.mov': ['ftyp', 'moov', 'mdat', 'wide'].map((atom) => ({ bytes: [...Buffer.from(atom)], offset: 4 })),
  // An MP3 opens with an ID3 tag or straight with an MPEG audio frame.
  '.mp3': [{ bytes: [0x49, 0x44, 0x33] }, { bytes: [0xff, 0xfb] }, { bytes: [0xff, 0xf3] }, { bytes: [0xff, 0xf2] }],
  '.wav': [{ bytes: [0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x41, 0x56, 0x45] }]
};

export function isAllowedExtension(extension: string): boolean {
  return mediaKindForName(extension) !== null && extension in SIGNATURES;
}

export function matchesSignature(extension: string, head: Buffer): boolean {
  const candidates = SIGNATURES[extension] ?? [];
  return candidates.some(({ bytes, offset = 0 }) => {
    if (head.length < offset + bytes.length) return false;
    return bytes.every((byte, index) => byte === null || head[offset + index] === byte);
  });
}

/**
 * Resolve um caminho relativo dentro da pasta de mídia. Devolve `null` para
 * qualquer caminho que escape dela, inclusive caminho absoluto.
 */
export function resolveInsideMedia(relative: string): string | null {
  if (!relative) return null;
  const root = mediaDir();
  const resolved = path.resolve(root, relative);
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
  return resolved.startsWith(rootWithSep) ? resolved : null;
}

/** Whether a media path of the sheet still has its file in the media folder (AC-pauta-revelavel-34). */
export function mediaFileExists(relative: string): boolean {
  const absolute = resolveInsideMedia(relative);
  if (!absolute) return false;
  try {
    return fs.statSync(absolute).isFile();
  } catch {
    return false;
  }
}

export interface StoredMedia {
  /** Caminho relativo à pasta de mídia — nunca o caminho absoluto da máquina. */
  path: string;
  bytes: number;
}

/**
 * Recebe o arquivo em streaming para um temporário, confere a assinatura do
 * primeiro pedaço contra a extensão declarada, aplica o teto de tamanho, gera
 * nome próprio e só então move para `data/media/`.
 */
export async function storeUpload(
  source: Readable,
  fileName: string,
  declaredBytes: number | null
): Promise<StoredMedia> {
  const extension = extensionOf(fileName);
  if (!isAllowedExtension(extension)) {
    throw badRequest(`Tipo de arquivo não aceito: ${extension || 'sem extensão'}.`, 'unsupported_media');
  }
  if (declaredBytes !== null && declaredBytes > MAX_MEDIA_BYTES) {
    throw badRequest('Arquivo acima do limite de 512 MB.', 'media_too_large');
  }

  ensureDataDirs();
  const temporary = path.join(mediaDir(), `.upload-${randomUUID()}`);

  let bytes = 0;
  let head = Buffer.alloc(0);
  let rejection: Error | null = null;

  const guard = async function* () {
    for await (const chunk of source) {
      const buffer = chunk as Buffer;
      if (head.length < 32) head = Buffer.concat([head, buffer.subarray(0, 32)]);
      bytes += buffer.length;
      if (bytes > MAX_MEDIA_BYTES) {
        rejection = badRequest('Arquivo acima do limite de 512 MB.', 'media_too_large');
        return;
      }
      yield buffer;
    }
  };

  try {
    await pipeline(guard(), fs.createWriteStream(temporary));
    if (rejection) throw rejection;
    if (!matchesSignature(extension, head)) {
      throw badRequest(
        `O conteúdo do arquivo não corresponde à extensão ${extension}.`,
        'media_signature_mismatch'
      );
    }

    const finalName = `${randomUUID()}${extension}`;
    fs.renameSync(temporary, path.join(mediaDir(), finalName));
    return { path: finalName, bytes };
  } catch (error) {
    // Nenhum registro é criado sem o arquivo final no lugar.
    fs.rmSync(temporary, { force: true });
    throw error;
  }
}

/**
 * Removes files of the media folder that nothing references any more. Only
 * paths that resolve inside the folder are touched, and a failed removal never
 * fails the operation that triggered it (the file is merely left behind).
 */
export function removeUnreferencedMedia(
  paths: Iterable<string>,
  isReferenced: (path: string) => boolean
): string[] {
  const removed: string[] = [];
  for (const relative of new Set(paths)) {
    if (!relative || isReferenced(relative)) continue;
    const absolute = resolveInsideMedia(relative);
    if (!absolute) continue;
    try {
      if (!fs.existsSync(absolute)) continue;
      fs.rmSync(absolute, { force: true });
      removed.push(relative);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`[clave] could not remove media ${relative}: ${message}\n`);
    }
  }
  return removed;
}
