import { invalid, valid } from './result.js';
import type { FieldError, ValidationResult } from './result.js';
import { ATTACHMENT_TYPES } from '../types.js';
import type { Attachment, AttachmentType } from '../types.js';

export const ATTACHMENT_LABEL_MAX_LENGTH = 80;

/** Tipos textuais: o Palco copia o conteúdo em vez de abrir mídia. */
export const TEXTUAL_ATTACHMENT_TYPES: AttachmentType[] = ['code', 'chat'];

/** Tipos que podem tomar a tela capturada. */
export const FULLSCREEN_CAPABLE_TYPES: AttachmentType[] = ['video', 'image'];

export type AttachmentInput = Omit<Attachment, 'position'>;

export function isTextual(type: AttachmentType): boolean {
  return TEXTUAL_ATTACHMENT_TYPES.includes(type);
}

export function isWebUrl(path: string): boolean {
  return /^https?:\/\//i.test(path.trim());
}

export function validateAttachments(raw: unknown): ValidationResult<AttachmentInput[]> {
  const list = Array.isArray(raw) ? raw : [];
  const errors: FieldError[] = [];
  const parsed: AttachmentInput[] = [];

  list.forEach((entry, index) => {
    const item = (entry ?? {}) as Record<string, unknown>;
    const type = String(item.type ?? '');
    if (!ATTACHMENT_TYPES.includes(type as AttachmentType)) {
      errors.push({ field: `attachments.${index}.type`, message: 'Escolha um tipo de anexo válido.' });
      return;
    }

    const attachmentType = type as AttachmentType;
    const label = String(item.label ?? '').trim().slice(0, ATTACHMENT_LABEL_MAX_LENGTH);
    const path = String(item.path ?? '').trim();
    const content = String(item.content ?? '');

    if (isTextual(attachmentType)) {
      if (!content.trim()) {
        errors.push({
          field: `attachments.${index}.content`,
          message: 'Escreva o texto que o anexo vai copiar no Palco.'
        });
        return;
      }
    } else if (!path) {
      errors.push({
        field: `attachments.${index}.path`,
        message: 'Informe o caminho do arquivo ou a URL do anexo.'
      });
      return;
    }

    parsed.push({
      id: typeof item.id === 'string' && item.id ? item.id : '',
      type: attachmentType,
      label: label || attachmentType,
      path: isTextual(attachmentType) ? '' : path,
      content: isTextual(attachmentType) ? content : '',
      fullscreen: FULLSCREEN_CAPABLE_TYPES.includes(attachmentType) ? Boolean(item.fullscreen) : false
    });
  });

  if (errors.length) return invalid(errors);
  return valid(parsed);
}
