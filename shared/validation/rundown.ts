import { isIsoDate, invalid, requiredText, valid } from './result.js';
import type { FieldError, ValidationResult } from './result.js';

export const RUNDOWN_TITLE_MAX_LENGTH = 120;

export interface RundownInput {
  title: string;
  date: string;
}

/** Data de hoje em ISO curto, usada como padrão sugerido na criação. */
export function todayIso(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function validateRundown(raw: unknown): ValidationResult<RundownInput> {
  const input = (raw ?? {}) as Record<string, unknown>;
  const errors: FieldError[] = [];

  const title = requiredText(input.title, 'title', RUNDOWN_TITLE_MAX_LENGTH, 'Dê um título à pauta.');
  if ('error' in title) errors.push(title.error);

  const rawDate = typeof input.date === 'string' && input.date.trim() ? input.date.trim() : todayIso();
  if (!isIsoDate(rawDate)) {
    errors.push({ field: 'date', message: 'Informe uma data válida para a live.' });
  }

  if (errors.length) return invalid(errors);
  return valid({ title: (title as { value: string }).value, date: rawDate });
}
