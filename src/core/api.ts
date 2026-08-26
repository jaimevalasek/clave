import type { FieldError } from '../../shared/validation/result';

/**
 * Erro tipado do backend. O `code` distingue falha de validação (o formulário
 * pinta o campo) de falha de escrita/rede (a faixa de erro nomeia a ação).
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields: FieldError[];

  constructor(status: number, code: string, message: string, fields: FieldError[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }

  get isValidation(): boolean {
    return this.code === 'validation_failed';
  }

  /** O backend é processo separado: quando ele cai, a tela precisa dizer isso. */
  get isUnreachable(): boolean {
    return this.code === 'backend_unreachable';
  }

  fieldMessage(field: string): string | undefined {
    return this.fields.find((entry) => entry.field === field)?.message;
  }
}

interface ErrorBody {
  code?: string;
  message?: string;
  fields?: FieldError[];
}

// O browser fala sempre same-origin: o proxy do Vite leva /api ao backend.
async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  } catch {
    throw new ApiError(
      503,
      'backend_unreachable',
      'O Clave não conseguiu falar com o próprio servidor.'
    );
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    const error = (payload ?? {}) as ErrorBody;
    throw new ApiError(
      response.status,
      error.code ?? 'request_failed',
      error.message ?? 'A operação falhou no servidor.',
      error.fields ?? []
    );
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body ?? {}),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body ?? {}),
  delete: <T>(path: string) => request<T>('DELETE', path)
};
