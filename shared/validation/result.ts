// Base comum das validações de domínio: o mesmo resultado alimenta a rejeição na
// rota (antes de qualquer escrita) e o erro inline do formulário.

export interface FieldError {
  field: string;
  message: string;
}

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: FieldError[] };

export function invalid<T>(errors: FieldError[]): ValidationResult<T> {
  return { ok: false, errors };
}

export function valid<T>(value: T): ValidationResult<T> {
  return { ok: true, value };
}

export function requiredText(
  raw: unknown,
  field: string,
  maxLength: number,
  emptyMessage: string
): { value: string } | { error: FieldError } {
  const text = typeof raw === 'string' ? raw.trim() : '';
  if (!text) return { error: { field, message: emptyMessage } };
  if (text.length > maxLength) {
    return { error: { field, message: `Use no máximo ${maxLength} caracteres.` } };
  }
  return { value: text };
}

export function boundedInteger(
  raw: unknown,
  field: string,
  min: number,
  max: number,
  message: string
): { value: number } | { error: FieldError } {
  const parsed = typeof raw === 'number' ? raw : Number(String(raw ?? '').trim());
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    return { error: { field, message } };
  }
  return { value: parsed };
}

export function isIsoDate(raw: unknown): raw is string {
  if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return false;
  const time = Date.parse(`${raw}T12:00:00Z`);
  return Number.isFinite(time);
}
