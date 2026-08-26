import { invalid, requiredText, valid } from './result.js';
import type { FieldError, ValidationResult } from './result.js';
import { BLOCK_TYPES } from '../types.js';
import type { BlockType } from '../types.js';

export const LIBRARY_TITLE_MAX_LENGTH = 140;

/**
 * Razão exibida na própria superfície: o tipo do item do acervo é imutável
 * depois da promoção porque ele define a pista e a cor em toda cópia futura.
 */
export const IMMUTABLE_TYPE_REASON =
  'O tipo do item não muda depois de guardado: ele define a pista e a cor de toda cópia trazida para uma pauta. Para outro tipo, guarde um item novo.';

export interface LibraryItemInput {
  title: string;
}

export function validateLibraryItem(raw: unknown): ValidationResult<LibraryItemInput> {
  const input = (raw ?? {}) as Record<string, unknown>;
  const errors: FieldError[] = [];

  const title = requiredText(
    input.title,
    'title',
    LIBRARY_TITLE_MAX_LENGTH,
    'Dê um título ao item do acervo.'
  );
  if ('error' in title) errors.push(title.error);

  if (errors.length) return invalid(errors);
  return valid({ title: (title as { value: string }).value });
}

/** Só a promoção define o tipo; depois dela ele nunca é reescrito. */
export function validatePromotionType(raw: unknown): BlockType | null {
  const type = String(raw ?? '');
  return BLOCK_TYPES.includes(type as BlockType) ? (type as BlockType) : null;
}
