import { invalid, valid } from './result.js';
import type { FieldError, ValidationResult } from './result.js';
import { DEFAULT_BLOCK_SIZE, SIZE_SPECS, defaultFontPx, isBlockSize, isValidFontPx } from '../blockSize.js';
import { isSafeMediaPath, mediaKindForName } from '../media.js';
import { firstInvalidDepth } from '../sheetTree.js';
import { plainText, sanitizeRuns } from '../textMarks.js';
import { SHEET_BLOCK_KINDS } from '../types.js';
import type { SheetBlock, SheetBlockKind } from '../types.js';

export const MAX_SHEET_BLOCKS = 1000;
export const MAX_BLOCK_TEXT_LENGTH = 10_000;
export const MAX_MEDIA_NAME_LENGTH = 255;
const MAX_KEY_LENGTH = 80;
const MAX_ID_LENGTH = 64;
const MAX_REVEAL_STEP = 1_000_000;

/** A block as the client sends it: `id` only for blocks the server already gave one. */
export interface SheetBlockInput extends Omit<SheetBlock, 'id'> {
  id: string | null;
  /** Client-side identity, echoed back in `ids` with the server id. */
  key: string;
}

type Item = Record<string, unknown>;
type Step<T> = { value: T } | { error: string };
type Body = Pick<SheetBlockInput, 'content' | 'mediaPath' | 'mediaName' | 'size' | 'fontPx'>;

function isKind(value: unknown): value is SheetBlockKind {
  return typeof value === 'string' && (SHEET_BLOCK_KINDS as readonly string[]).includes(value);
}

/** Keys and ids must be unique across the whole payload. */
function readIdentity(item: Item, seen: { keys: Set<string>; ids: Set<string> }): Step<{ key: string; id: string | null }> {
  const key = typeof item.key === 'string' ? item.key.trim() : '';
  if (!key || key.length > MAX_KEY_LENGTH || seen.keys.has(key)) {
    return { error: 'key:Cada bloco precisa de uma chave única.' };
  }
  seen.keys.add(key);
  if (item.id === undefined || item.id === null || item.id === '') return { value: { key, id: null } };
  if (typeof item.id !== 'string' || item.id.length > MAX_ID_LENGTH || seen.ids.has(item.id)) {
    return { error: 'id:Id de bloco inválido ou repetido.' };
  }
  seen.ids.add(item.id);
  return { value: { key, id: item.id } };
}

/** Text body: marks out of the contract are dropped; size and fine adjustment must fit. */
function readTextBody(item: Item): Step<Body> {
  const content = sanitizeRuns(item.content);
  if (plainText(content).length > MAX_BLOCK_TEXT_LENGTH) {
    return { error: `content:Um bloco aceita até ${MAX_BLOCK_TEXT_LENGTH} caracteres.` };
  }
  if (!isBlockSize(item.size)) return { error: 'size:Tamanho de texto inválido.' };
  const size = item.size;
  if (!isValidFontPx(size, item.fontPx)) {
    const spec = SIZE_SPECS[size];
    return { error: `fontPx:O tamanho vai de ${spec.minPx} a ${spec.maxPx}px, de 4 em 4.` };
  }
  return { value: { content, mediaPath: '', mediaName: '', size, fontPx: item.fontPx as number } };
}

/** Media body: a relative path inside the media folder, of the block's own kind. */
function readMediaBody(item: Item, kind: SheetBlockKind): Step<Body> {
  const mediaPath = typeof item.mediaPath === 'string' ? item.mediaPath.trim() : '';
  if (!isSafeMediaPath(mediaPath) || mediaKindForName(mediaPath) !== kind) {
    return { error: 'mediaPath:Caminho de mídia fora da pasta do app.' };
  }
  const mediaName = typeof item.mediaName === 'string' ? item.mediaName.trim() : '';
  if (mediaName.length > MAX_MEDIA_NAME_LENGTH) {
    return { error: `mediaName:O nome do arquivo passa de ${MAX_MEDIA_NAME_LENGTH} caracteres.` };
  }
  return {
    value: { content: [], mediaPath, mediaName, size: DEFAULT_BLOCK_SIZE, fontPx: defaultFontPx(DEFAULT_BLOCK_SIZE) }
  };
}

/** A reveal step only exists while the block is visible in the take. */
function readRevealStep(item: Item, takeVisible: boolean): Step<number | null> {
  if (!takeVisible || item.revealStep === undefined || item.revealStep === null) return { value: null };
  const step = item.revealStep;
  if (typeof step !== 'number' || !Number.isInteger(step) || step < 1 || step > MAX_REVEAL_STEP) {
    return { error: 'revealStep:Passo de revelação inválido.' };
  }
  return { value: step };
}

function readBlock(item: Item, seen: { keys: Set<string>; ids: Set<string> }): Step<SheetBlockInput> {
  const identity = readIdentity(item, seen);
  if ('error' in identity) return identity;
  if (!isKind(item.kind)) return { error: 'kind:Tipo de bloco inválido.' };
  const body = item.kind === 'text' ? readTextBody(item) : readMediaBody(item, item.kind);
  if ('error' in body) return body;
  const takeVisible = item.takeVisible === true;
  const revealStep = readRevealStep(item, takeVisible);
  if ('error' in revealStep) return revealStep;
  return {
    value: {
      ...identity.value,
      ...body.value,
      kind: item.kind,
      depth: typeof item.depth === 'number' ? item.depth : Number.NaN,
      plannedVisible: item.plannedVisible === true,
      takeVisible,
      revealStep: revealStep.value,
      collapsed: item.collapsed === true
    }
  };
}

function treeError(index: number): FieldError {
  return {
    field: `blocks.${index}.depth`,
    message:
      index === 0
        ? 'O primeiro bloco da folha não pode ser um sub-item.'
        : 'Um sub-item entra no máximo um nível abaixo do bloco anterior, até 3 níveis.'
  };
}

/**
 * Validates the whole sheet before any write (SEC-SBD-01). Unknown text marks
 * are dropped (RULE-pauta-revelavel-06); everything else that is out of the
 * contract rejects the request, the tree included (RULE-pauta-revelavel-04).
 */
export function validateSheet(raw: unknown): ValidationResult<SheetBlockInput[]> {
  const body = (raw ?? {}) as Item;
  if (!Array.isArray(body.blocks)) {
    return invalid([{ field: 'blocks', message: 'Envie a lista de blocos da folha.' }]);
  }
  if (body.blocks.length > MAX_SHEET_BLOCKS) {
    return invalid([{ field: 'blocks', message: `Uma folha comporta até ${MAX_SHEET_BLOCKS} blocos.` }]);
  }

  const seen = { keys: new Set<string>(), ids: new Set<string>() };
  const errors: FieldError[] = [];
  const parsed: SheetBlockInput[] = [];
  (body.blocks as unknown[]).forEach((entry, index) => {
    const result = readBlock((entry ?? {}) as Item, seen);
    if ('error' in result) {
      const [field, message] = result.error.split(/:(.*)/s);
      errors.push({ field: `blocks.${index}.${field}`, message });
    } else {
      parsed.push(result.value);
    }
  });
  if (errors.length) return invalid(errors);

  const broken = firstInvalidDepth(parsed.map((block) => block.depth));
  return broken >= 0 ? invalid([treeError(broken)]) : valid(parsed);
}
