import { isIsoDate, invalid, requiredText, valid } from './result.js';
import type { FieldError, ValidationResult } from './result.js';
import { RUNDOWN_KINDS } from '../types.js';
import type { RundownKind } from '../types.js';

export const RUNDOWN_TITLE_MAX_LENGTH = 120;

/** AC-pauta-revelavel-02: the same message inline in the form and from the server. */
export const RUNDOWN_TITLE_REQUIRED = 'Dê um nome à pauta, por exemplo "Episódio 12: filas".';

/** Optional fields are `undefined` when the request leaves them out: they keep their stored value. */
export interface RundownInput {
  title: string;
  date?: string;
  kind?: RundownKind;
  pinned?: boolean;
}

/** Data de hoje em ISO curto, usada como padrão sugerido na criação. */
export function todayIso(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function validateRundown(raw: unknown): ValidationResult<RundownInput> {
  const input = (raw ?? {}) as Record<string, unknown>;
  const errors: FieldError[] = [];

  const title = requiredText(input.title, 'title', RUNDOWN_TITLE_MAX_LENGTH, RUNDOWN_TITLE_REQUIRED);
  if ('error' in title) errors.push(title.error);

  let date: string | undefined;
  if (typeof input.date === 'string' && input.date.trim()) {
    date = input.date.trim();
    if (!isIsoDate(date)) errors.push({ field: 'date', message: 'Informe uma data válida.' });
  }

  let kind: RundownKind | undefined;
  if (input.kind !== undefined) {
    if (typeof input.kind === 'string' && (RUNDOWN_KINDS as readonly string[]).includes(input.kind)) {
      kind = input.kind as RundownKind;
    } else {
      errors.push({ field: 'kind', message: 'Tipo de pauta inválido.' });
    }
  }

  const pinned = input.pinned === undefined ? undefined : Boolean(input.pinned);

  if (errors.length) return invalid(errors);
  return valid({
    title: (title as { value: string }).value,
    date,
    kind,
    pinned
  });
}
