import { boundedInteger, invalid, requiredText, valid } from './result.js';
import type { FieldError, ValidationResult } from './result.js';
import { BLOCK_TYPES } from '../types.js';
import type { BlockType } from '../types.js';

export const BLOCK_TITLE_MAX_LENGTH = 140;
export const DURATION_MIN_MINUTES = 1;
export const DURATION_MAX_MINUTES = 600;

/** Valores iniciais sugeridos na criação — todos editáveis depois. */
export const BLOCK_DEFAULTS = { durationMinutes: 10 } as const;

export interface BlockInput {
  type: BlockType;
  title: string;
  note: string;
  durationMinutes: number;
}

export function validateBlock(raw: unknown): ValidationResult<BlockInput> {
  const input = (raw ?? {}) as Record<string, unknown>;
  const errors: FieldError[] = [];

  const title = requiredText(input.title, 'title', BLOCK_TITLE_MAX_LENGTH, 'Dê um título ao bloco.');
  if ('error' in title) errors.push(title.error);

  const type = String(input.type ?? '');
  if (!BLOCK_TYPES.includes(type as BlockType)) {
    errors.push({ field: 'type', message: 'Escolha uma etiqueta válida para o bloco.' });
  }

  const duration = boundedInteger(
    input.durationMinutes,
    'durationMinutes',
    DURATION_MIN_MINUTES,
    DURATION_MAX_MINUTES,
    `Informe a duração em minutos, de ${DURATION_MIN_MINUTES} a ${DURATION_MAX_MINUTES}. Ela alimenta o "quanto falta" do Palco.`
  );
  if ('error' in duration) errors.push(duration.error);

  if (errors.length) return invalid(errors);

  return valid({
    type: type as BlockType,
    title: (title as { value: string }).value,
    note: typeof input.note === 'string' ? input.note : '',
    durationMinutes: (duration as { value: number }).value
  });
}
