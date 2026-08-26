import { useRef, useState } from 'react';
import { ApiError } from '../../core/api';
import { ATTACHMENT_TYPES } from '../../../shared/types';
import type { AttachmentType } from '../../../shared/types';
import {
  ATTACHMENT_LABEL_MAX_LENGTH,
  FULLSCREEN_CAPABLE_TYPES,
  isTextual
} from '../../../shared/validation/attachment';

export interface AttachmentDraft {
  id: string;
  type: AttachmentType;
  label: string;
  path: string;
  content: string;
  fullscreen: boolean;
}

/** Rótulos de interface por tipo de anexo — vocabulário do produto em pt-BR. */
export const ATTACHMENT_LABELS: Record<AttachmentType, string> = {
  video: 'vídeo',
  image: 'imagem',
  link: 'link',
  code: 'código',
  chat: 'chat',
  file: 'arquivo'
};

interface AttachmentFieldsProps {
  attachments: AttachmentDraft[];
  errors: Record<string, string>;
  onChange(attachments: AttachmentDraft[]): void;
}

/**
 * Rascunho de anexo novo. O id é só a chave de renderização da linha: o id
 * definitivo vem do servidor quando a gaveta salva.
 */
export function emptyAttachment(): AttachmentDraft {
  return {
    id: `rascunho-${crypto.randomUUID()}`,
    type: 'video',
    label: '',
    path: '',
    content: '',
    fullscreen: true
  };
}

/**
 * Anexos do bloco na gaveta: rótulo, tipo, caminho local ou URL e a marca de
 * tela cheia. O arquivo real e as ações do Palco vivem nas telas de mídia.
 */
export function AttachmentFields({ attachments, errors, onChange }: AttachmentFieldsProps) {
  // Um seletor por linha: o arquivo escolhido pertence sempre ao anexo daquela
  // linha, sem estado intermediário que possa apontar para o vizinho.
  const fileInputs = useRef<Record<number, HTMLInputElement | null>>({});
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const patch = (index: number, changes: Partial<AttachmentDraft>) => {
    onChange(attachments.map((item, i) => (i === index ? { ...item, ...changes } : item)));
  };

  /**
   * Anexar arquivo copia o arquivo escolhido para a pasta de mídia do app; o
   * registro guarda o caminho relativo devolvido, nunca o caminho da máquina.
   */
  const uploadFile = async (index: number, file: File) => {
    setUploadingIndex(index);
    setUploadError(null);
    try {
      const response = await fetch('/api/media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'x-clave-filename': encodeURIComponent(file.name)
        },
        body: file
      });
      const payload = (await response.json()) as {
        media?: { path: string };
        message?: string;
        code?: string;
      };
      if (!response.ok) {
        throw new ApiError(response.status, payload.code ?? 'upload_failed', payload.message ?? '');
      }
      patch(index, {
        path: payload.media?.path ?? '',
        label: attachments[index].label || file.name
      });
    } catch (error) {
      setUploadError(
        error instanceof ApiError
          ? error.message
          : 'Não foi possível copiar o arquivo para a pasta de mídia do app.'
      );
    } finally {
      setUploadingIndex(null);
    }
  };

  return (
    <div id="anexos-bloco">
      {uploadError ? (
        <div className="erro-campo" role="alert" data-testid="erro-upload">
          {uploadError}
        </div>
      ) : null}

      {attachments.map((attachment, index) => {
        const textual = isTextual(attachment.type);
        const pathError = errors[`attachments.${index}.path`];
        const contentError = errors[`attachments.${index}.content`];
        return (
          <div className="anexo-linha" key={attachment.id} data-testid={`anexo-${index}`}>
            <div className="linha1">
              <select
                value={attachment.type}
                aria-label={`Tipo do anexo ${index + 1}`}
                onChange={(event) => patch(index, { type: event.target.value as AttachmentType })}
              >
                {ATTACHMENT_TYPES.map((type) => (
                  <option value={type} key={type}>
                    {ATTACHMENT_LABELS[type]}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={attachment.label}
                placeholder="Rótulo"
                autoComplete="off"
                maxLength={ATTACHMENT_LABEL_MAX_LENGTH}
                aria-label={`Rótulo do anexo ${index + 1}`}
                onChange={(event) => patch(index, { label: event.target.value })}
              />
              <button
                type="button"
                className="btn btn-fantasma"
                aria-label={`Remover anexo ${index + 1}`}
                onClick={() => onChange(attachments.filter((_, i) => i !== index))}
              >
                ✕
              </button>
            </div>

            {textual ? (
              <>
                <textarea
                  rows={2}
                  value={attachment.content}
                  placeholder="Texto pronto para colar"
                  aria-label={`Texto do anexo ${index + 1}`}
                  aria-invalid={contentError ? true : undefined}
                  onChange={(event) => patch(index, { content: event.target.value })}
                />
                {contentError ? <div className="erro-campo">{contentError}</div> : null}
              </>
            ) : (
              <>
                <div className="linha-caminho">
                  <input
                    type="text"
                    value={attachment.path}
                    autoComplete="off"
                    placeholder="Arquivo da pasta de mídia ou URL (YouTube, web…)"
                    aria-label={`Caminho do anexo ${index + 1}`}
                    aria-invalid={pathError ? true : undefined}
                    onChange={(event) => patch(index, { path: event.target.value })}
                  />
                  <input
                    type="file"
                    hidden
                    data-testid={`seletor-de-arquivo-${index}`}
                    ref={(element) => {
                      fileInputs.current[index] = element;
                    }}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void uploadFile(index, file);
                      event.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-fantasma"
                    data-testid={`escolher-arquivo-${index}`}
                    disabled={uploadingIndex !== null}
                    onClick={() => fileInputs.current[index]?.click()}
                  >
                    {uploadingIndex === index ? 'copiando…' : 'escolher arquivo'}
                  </button>
                </div>
                {pathError ? <div className="erro-campo">{pathError}</div> : null}
              </>
            )}

            {FULLSCREEN_CAPABLE_TYPES.includes(attachment.type) ? (
              <label className="check">
                <input
                  type="checkbox"
                  checked={attachment.fullscreen}
                  onChange={(event) => patch(index, { fullscreen: event.target.checked })}
                />
                Toma a tela capturada ao abrir
              </label>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
