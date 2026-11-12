import { ApiError, api } from '../../core/api';
import { MAX_MEDIA_BYTES, MEDIA_EXTENSIONS, mediaKindForName } from '../../../shared/media';
import type { MediaKind } from '../../../shared/media';
import { MAX_MEDIA_NAME_LENGTH } from '../../../shared/validation/sheet';
import type { InsertionPoint } from './pasteOps';
import { commit, insertBlocks, newBlock, patchLocal, useSheet } from './sheetStore';
import type { IntakeFailure, MediaIntake } from './sheetStore';
import { markEntered } from './takeOps';

// Pasted and dropped files into media blocks (AC-pauta-revelavel-16 to -18).
// The client classifies before sending so a failure shows at once in the
// block; the server stays the authority on format and size
// (RULE-pauta-revelavel-07). Until the file is in the media folder the block
// lives only here: out of the save and out of the counter.

/** The file kept for "Tentar de novo", and the upload in flight, by block key. */
const files = new Map<string, File>();
const uploads = new Map<string, AbortController>();

/** Extension of a file that arrives without one (a screenshot straight from the clipboard). */
const MIME_EXTENSIONS: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'video/mp4': '.mp4',
  'video/x-m4v': '.m4v',
  'video/quicktime': '.mov',
  'video/webm': '.webm',
  'video/x-matroska': '.mkv',
  'audio/mpeg': '.mp3',
  'audio/mp3': '.mp3',
  'audio/wav': '.wav',
  'audio/x-wav': '.wav',
  'audio/wave': '.wav',
  'audio/vnd.wave': '.wav'
};

const CLIPBOARD_NAME = 'colado-da-area-de-transferencia';

/** What the "Procurar o arquivo" picker offers. */
export const ACCEPTED_FILES = Object.keys(MEDIA_EXTENSIONS).join(',');

export type FileClass = { kind: MediaKind; uploadName: string } | { failure: Exclude<IntakeFailure, 'write-failed'> };

export function displayName(file: File): string {
  return (file.name || `${CLIPBOARD_NAME}${MIME_EXTENSIONS[file.type] ?? ''}`).slice(0, MAX_MEDIA_NAME_LENGTH);
}

/**
 * Accepted kind and the name sent to the server, which checks that extension
 * against the file signature. A file without a known extension borrows one
 * from its type. Unknown format first, then the 512 MB ceiling.
 */
export function classifyFile(file: File): FileClass {
  const name = displayName(file);
  const fromName = mediaKindForName(name);
  const borrowed = fromName ? '' : (MIME_EXTENSIONS[file.type] ?? '');
  const kind = fromName ?? (borrowed ? mediaKindForName(borrowed) : null);
  if (!kind) return { failure: 'unsupported' };
  if (file.size > MAX_MEDIA_BYTES) return { failure: 'too-large' };
  return { kind, uploadName: `${name}${borrowed}` };
}

function failureOf(error: unknown): IntakeFailure | null {
  if (!(error instanceof ApiError)) return 'write-failed';
  if (error.code === 'upload_aborted') return null;
  if (error.code === 'unsupported_media' || error.code === 'media_signature_mismatch') return 'unsupported';
  if (error.code === 'media_too_large') return 'too-large';
  return 'write-failed';
}

function stillHere(key: string, rundownId: string | null): boolean {
  const state = useSheet.getState();
  return state.rundownId === rundownId && state.blocks.some((block) => block.key === key);
}

/** The file is in the media folder: the block becomes the media and is saved. */
function becomeMedia(key: string, kind: MediaKind, mediaPath: string, mediaName: string): void {
  files.delete(key);
  const { blocks } = useSheet.getState();
  commit(
    blocks.map((block) =>
      block.key === key ? { ...block, kind, mediaPath, mediaName, mediaMissing: false, intake: undefined } : block
    )
  );
}

/** Sends the file kept for a block: the block shows the progress, then the media or the failure. */
async function upload(key: string): Promise<void> {
  const file = files.get(key);
  if (!file) return;
  const classified = classifyFile(file);
  const fileName = displayName(file);
  if ('failure' in classified) {
    patchLocal(key, { intake: { state: 'failed', reason: classified.failure, fileName, bytes: file.size } });
    return;
  }
  const rundownId = useSheet.getState().rundownId;
  uploads.get(key)?.abort();
  const controller = new AbortController();
  uploads.set(key, controller);
  patchLocal(key, { intake: { state: 'uploading', fileName, progress: 0 } });
  let percent = 0;
  const onProgress = (fraction: number) => {
    const next = Math.min(100, Math.floor(fraction * 100));
    if (next === percent) return;
    percent = next;
    patchLocal(key, { intake: { state: 'uploading', fileName, progress: next } });
  };
  try {
    const stored = await api.uploadMedia(file, classified.uploadName, onProgress, controller.signal);
    if (stillHere(key, rundownId)) becomeMedia(key, classified.kind, stored.path, fileName);
  } catch (error) {
    const failure = failureOf(error);
    if (failure && stillHere(key, rundownId)) {
      patchLocal(key, { intake: { state: 'failed', reason: failure, fileName, bytes: file.size } });
    }
  } finally {
    if (uploads.get(key) === controller) uploads.delete(key);
  }
}

/**
 * Pasted or dropped files become blocks at `at`, in order: the ones accepted
 * start writing to the media folder with progress, the others show their
 * failure in the block (AC-pauta-revelavel-16, -17, -18).
 */
export function intakeFiles(fileList: readonly File[], at: InsertionPoint): number {
  if (!fileList.length) return 0;
  const { blocks } = useSheet.getState();
  const created = fileList.map((file) => {
    const classified = classifyFile(file);
    const fileName = displayName(file);
    const intake: MediaIntake =
      'failure' in classified
        ? { state: 'failed', reason: classified.failure, fileName, bytes: file.size }
        : { state: 'uploading', fileName, progress: 0 };
    return newBlock(blocks, { kind: 'intake', depth: at.depth, mediaName: fileName, intake });
  });
  created.forEach((block, index) => {
    if (block.intake?.state === 'uploading') files.set(block.key, fileList[index]);
  });
  insertBlocks(at.index, created, null);
  markEntered(created.map((block) => block.key));
  created.forEach((block) => {
    if (files.has(block.key)) void upload(block.key);
  });
  return created.length;
}

/** "Tentar de novo": the same file goes again; on success the block becomes the media. */
export function retryIntake(key: string): void {
  void upload(key);
}

/**
 * "Procurar o arquivo" on a block whose file left the media folder
 * (AC-pauta-revelavel-34): the chosen file is written and the block, in the
 * same place, becomes it. Until then the block keeps its saved place.
 */
export function replaceMissingMedia(key: string, file: File): void {
  files.set(key, file);
  void upload(key);
}

/** A block leaving the sheet stops its upload and forgets its file. */
export function forgetIntake(key: string): void {
  uploads.get(key)?.abort();
  uploads.delete(key);
  files.delete(key);
}

/** Leaving the sheet: nothing keeps writing for a screen that is gone. */
export function forgetAllIntakes(): void {
  uploads.forEach((controller) => controller.abort());
  uploads.clear();
  files.clear();
}
