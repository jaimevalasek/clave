import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { badRequest } from '../http/errors.js';
import { ensureDataDirs, mediaDir } from '../db/paths.js';

/** Teto de tamanho por arquivo anexado. */
export const MAX_UPLOAD_BYTES = 512 * 1024 * 1024;

interface Signature {
  extensions: string[];
  /** Bytes esperados no começo do arquivo, com `null` para posição livre. */
  magic: (number | null)[];
  /** Deslocamento em que a assinatura começa. */
  offset?: number;
}

/**
 * Assinaturas conferidas contra a extensão declarada: um `.mp4` que na verdade
 * é outro formato não entra na pasta de mídia do app.
 */
const SIGNATURES: Signature[] = [
  { extensions: ['.png'], magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { extensions: ['.jpg', '.jpeg'], magic: [0xff, 0xd8, 0xff] },
  { extensions: ['.gif'], magic: [0x47, 0x49, 0x46, 0x38] },
  { extensions: ['.webp'], magic: [0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50] },
  { extensions: ['.webm', '.mkv'], magic: [0x1a, 0x45, 0xdf, 0xa3] },
  { extensions: ['.mp4', '.m4v', '.mov'], magic: [0x66, 0x74, 0x79, 0x70], offset: 4 },
  { extensions: ['.pdf'], magic: [0x25, 0x50, 0x44, 0x46] },
  { extensions: ['.mp3'], magic: [0x49, 0x44, 0x33] },
  { extensions: ['.wav'], magic: [0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x41, 0x56, 0x45] },
  { extensions: ['.txt', '.md', '.json', '.csv'], magic: [] }
];

export function isAllowedExtension(extension: string): boolean {
  return SIGNATURES.some((signature) => signature.extensions.includes(extension));
}

export function matchesSignature(extension: string, head: Buffer): boolean {
  const signature = SIGNATURES.find((entry) => entry.extensions.includes(extension));
  if (!signature) return false;
  if (!signature.magic.length) return true;

  const offset = signature.offset ?? 0;
  if (head.length < offset + signature.magic.length) return false;
  return signature.magic.every(
    (byte, index) => byte === null || head[offset + index] === byte
  );
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
  const extension = path.extname(fileName).toLowerCase();
  if (!isAllowedExtension(extension)) {
    throw badRequest(`Tipo de arquivo não aceito: ${extension || 'sem extensão'}.`, 'unsupported_media');
  }
  if (declaredBytes !== null && declaredBytes > MAX_UPLOAD_BYTES) {
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
      if (bytes > MAX_UPLOAD_BYTES) {
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
