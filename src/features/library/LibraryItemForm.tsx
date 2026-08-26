import { useId, useState } from 'react';
import { ApiError, api } from '../../core/api';
import { COPY } from '../../core/vocabulary';
import { ErrorBanner } from '../../ui/ErrorBanner';
import { Modal } from '../../ui/Modal';
import { metalOf } from '../../ui/typeColors';
import {
  IMMUTABLE_TYPE_REASON,
  LIBRARY_TITLE_MAX_LENGTH
} from '../../../shared/validation/libraryItem';
import { AttachmentFields, emptyAttachment } from '../board/AttachmentFields';
import type { AttachmentDraft } from '../board/AttachmentFields';
import type { LibraryItem } from '../../../shared/types';

interface LibraryItemFormProps {
  item: LibraryItem;
  onSaved(): void;
  onDismiss(): void;
}

/**
 * Edição do item do acervo: título e anexos. O tipo aparece travado, com a
 * razão dita na própria superfície.
 */
export function LibraryItemForm({ item, onSaved, onDismiss }: LibraryItemFormProps) {
  const titleId = useId();
  const [title, setTitle] = useState(item.title);
  const [attachments, setAttachments] = useState<AttachmentDraft[]>(() =>
    item.attachments.map((attachment) => ({
      id: attachment.id,
      type: attachment.type,
      label: attachment.label,
      path: attachment.path,
      content: attachment.content,
      fullscreen: attachment.fullscreen
    }))
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [writeError, setWriteError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);
  const metal = metalOf(item.type);

  const submit = async () => {
    if (saving) return;
    setSaving(true);
    setFieldErrors({});
    setWriteError(null);
    try {
      await api.patch(`/api/library/${item.id}`, { title });
      await api.put(`/api/library/${item.id}/attachments`, { attachments });
      onSaved();
    } catch (error) {
      if (error instanceof ApiError && error.isValidation) {
        const next: Record<string, string> = {};
        for (const entry of error.fields) next[entry.field] = entry.message;
        setFieldErrors(next);
      } else {
        setWriteError(error);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Editar item do acervo"
      onDismiss={onDismiss}
      actions={[
        { label: COPY.common.cancel },
        { label: COPY.common.save, intent: 'ouro', keepOpen: true, onSelect: () => void submit() }
      ]}
    >
      {writeError ? <ErrorBanner action="salvar o item do acervo" error={writeError} /> : null}

      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className={`campo${fieldErrors.title ? ' invalido' : ''}`}>
          <label htmlFor={titleId}>Título</label>
          <input
            id={titleId}
            type="text"
            maxLength={LIBRARY_TITLE_MAX_LENGTH}
            autoComplete="off"
            value={title}
            aria-invalid={fieldErrors.title ? true : undefined}
            aria-describedby={fieldErrors.title ? `${titleId}-erro` : undefined}
            onChange={(event) => setTitle(event.target.value)}
          />
          {fieldErrors.title ? (
            <div className="erro-campo" id={`${titleId}-erro`}>
              {fieldErrors.title}
            </div>
          ) : null}
        </div>

        <div className="campo">
          <label>Etiqueta</label>
          <div className="tipo-travado" data-testid="tipo-imutavel">
            <span style={{ color: metal.token }}>{metal.label}</span>
            <p>{IMMUTABLE_TYPE_REASON}</p>
          </div>
        </div>

        <div className="campo">
          <label>Anexos</label>
          <AttachmentFields
            attachments={attachments}
            errors={fieldErrors}
            onChange={setAttachments}
          />
          <button
            type="button"
            className="btn btn-fantasma"
            style={{ marginTop: '6px' }}
            onClick={() => setAttachments([...attachments, emptyAttachment()])}
          >
            + anexo
          </button>
        </div>

        <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
}
