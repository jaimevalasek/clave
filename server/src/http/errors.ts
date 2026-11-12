import type { NextFunction, Request, Response } from 'express';
import type { FieldError } from '../../../shared/validation/result.js';

/**
 * Formato estável de erro do backend: `{ status, code, message, fields? }`.
 * O cliente converte em erro tipado e nomeia a ação que falhou na tela.
 */
export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields: FieldError[];

  constructor(status: number, code: string, message: string, fields: FieldError[] = []) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export function badRequest(message: string, code = 'bad_request'): HttpError {
  return new HttpError(400, code, message);
}

export function validationFailed(fields: FieldError[]): HttpError {
  return new HttpError(422, 'validation_failed', fields[0]?.message ?? 'Dados inválidos.', fields);
}

export function notFound(message: string): HttpError {
  return new HttpError(404, 'not_found', message);
}

export function conflict(message: string, code = 'conflict'): HttpError {
  return new HttpError(409, code, message);
}

export function errorHandler(
  error: unknown,
  _request: Request,
  response: Response,
  next: NextFunction
): void {
  if (response.headersSent) {
    next(error);
    return;
  }
  if (error instanceof HttpError) {
    response.status(error.status).json({
      status: error.status,
      code: error.code,
      message: error.message,
      fields: error.fields
    });
    return;
  }
  // Body parser failures (malformed JSON, body over the limit) carry a 4xx
  // status of their own: answer with it instead of a generic 500.
  const parserStatus = (error as { status?: unknown; type?: unknown } | null)?.status;
  if (
    typeof parserStatus === 'number' &&
    parserStatus >= 400 &&
    parserStatus < 500 &&
    typeof (error as { type?: unknown }).type === 'string'
  ) {
    const tooLarge = parserStatus === 413;
    response.status(parserStatus).json({
      status: parserStatus,
      code: tooLarge ? 'payload_too_large' : 'bad_request',
      message: tooLarge ? 'O conteúdo enviado passou do limite.' : 'Corpo da requisição inválido.',
      fields: []
    });
    return;
  }
  const message = error instanceof Error ? error.message : 'Erro inesperado no servidor.';
  process.stderr.write(`[clave] erro não tratado: ${message}\n`);
  response.status(500).json({ status: 500, code: 'internal_error', message, fields: [] });
}
