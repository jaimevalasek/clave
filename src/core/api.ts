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
      'O app não conseguiu falar com o próprio servidor.'
    );
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? (JSON.parse(text) as unknown) : null;
  } catch {
    // A non-JSON answer comes from the dev proxy when the backend is down.
    throw new ApiError(
      response.status >= 500 ? 503 : response.status,
      response.status >= 500 ? 'backend_unreachable' : 'request_failed',
      'O app não conseguiu falar com o próprio servidor.'
    );
  }

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

/** Address of a file of the media folder, served by `GET /api/media/*`. */
export function mediaUrl(path: string): string {
  return `/api/media/${path.split('/').map(encodeURIComponent).join('/')}`;
}

/** A file written to the media folder: its path relative to that folder. */
export interface StoredMedia {
  path: string;
  bytes: number;
}

function uploadError(xhr: XMLHttpRequest): ApiError {
  let body: ErrorBody = {};
  try {
    body = JSON.parse(xhr.responseText) as ErrorBody;
  } catch {
    // A non-JSON answer: the backend is down behind the dev proxy.
  }
  if (!body.code && (xhr.status === 0 || xhr.status >= 500)) {
    return new ApiError(503, 'backend_unreachable', 'O app não conseguiu falar com o próprio servidor.');
  }
  return new ApiError(xhr.status, body.code ?? 'request_failed', body.message ?? 'A gravação da mídia falhou.', body.fields ?? []);
}

/**
 * Streams one file to `POST /api/media`. `fetch` cannot report upload
 * progress, so this goes through `XMLHttpRequest`; `onProgress` receives 0..1.
 * The server checks the extension, the signature and the 512 MB ceiling and
 * answers a typed error (`unsupported_media`, `media_too_large`,
 * `media_signature_mismatch`). Aborting through `signal` rejects with
 * `upload_aborted`.
 */
function uploadMedia(
  file: Blob,
  fileName: string,
  onProgress: (fraction: number) => void,
  signal?: AbortSignal
): Promise<StoredMedia> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/media');
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');
    xhr.setRequestHeader('x-clave-filename', encodeURIComponent(fileName));
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => {
      if (xhr.status === 201) {
        try {
          resolve((JSON.parse(xhr.responseText) as { media: StoredMedia }).media);
          return;
        } catch {
          // Falls through to the typed error below.
        }
      }
      reject(uploadError(xhr));
    };
    xhr.onerror = () => reject(uploadError(xhr));
    xhr.onabort = () => reject(new ApiError(0, 'upload_aborted', 'A gravação foi cancelada.'));
    signal?.addEventListener('abort', () => xhr.abort(), { once: true });
    xhr.send(file);
  });
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body ?? {}),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body ?? {}),
  delete: <T>(path: string) => request<T>('DELETE', path),
  uploadMedia
};
