import { useId, useState } from 'react';
import { ApiError } from '../../core/api';
import { COPY } from '../../core/vocabulary';
import { ErrorBanner } from '../../ui/ErrorBanner';
import { Modal } from '../../ui/Modal';
import { RUNDOWN_TITLE_MAX_LENGTH, RUNDOWN_TITLE_REQUIRED } from '../../../shared/validation/rundown';

interface RundownFormProps {
  mode: 'create' | 'rename';
  initialTitle?: string;
  onSubmit(title: string): Promise<void>;
  onDismiss(): void;
}

const TEXT = {
  create: {
    title: COPY.rundowns.formCreateTitle,
    text: COPY.rundowns.formCreateText,
    confirm: COPY.rundowns.formCreateConfirm,
    action: 'criar a pauta'
  },
  rename: {
    title: COPY.rundowns.formRenameTitle,
    text: COPY.rundowns.formRenameText,
    confirm: COPY.rundowns.formRenameConfirm,
    action: 'renomear a pauta'
  }
} as const;

/**
 * The only field of a rundown: its name (AC-pauta-revelavel-02/03). The server
 * is the gate; the form shows its message inline with `aria-invalid`, and
 * `noValidate` keeps the browser bubble from hiding it.
 */
function useRundownForm(initialTitle: string, inputId: string, onSubmit: (title: string) => Promise<void>) {
  const [title, setTitle] = useState(initialTitle);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [writeError, setWriteError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (saving) return;
    if (!title.trim()) {
      setFieldError(RUNDOWN_TITLE_REQUIRED);
      document.getElementById(inputId)?.focus();
      return;
    }
    setSaving(true);
    setFieldError(null);
    setWriteError(null);
    try {
      await onSubmit(title.trim());
    } catch (error) {
      if (error instanceof ApiError && error.isValidation) setFieldError(error.fieldMessage('title') ?? error.message);
      else setWriteError(error);
    } finally {
      setSaving(false);
    }
  };

  const change = (value: string) => {
    setTitle(value);
    if (fieldError) setFieldError(null);
  };

  return { title, change, fieldError, writeError, submit };
}

export function RundownForm({ mode, initialTitle = '', onSubmit, onDismiss }: RundownFormProps) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const { title, change, fieldError, writeError, submit } = useRundownForm(initialTitle, inputId, onSubmit);
  const text = TEXT[mode];

  return (
    <Modal
      title={text.title}
      text={text.text}
      onDismiss={onDismiss}
      actions={[
        { label: COPY.common.cancel },
        { label: text.confirm, intent: 'primary', keepOpen: true, onSelect: () => void submit() }
      ]}
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        {writeError ? <ErrorBanner action={text.action} error={writeError} /> : null}
        <div className="field">
          <label htmlFor={inputId}>{COPY.rundowns.fieldName}</label>
          <input
            id={inputId}
            name="title"
            type="text"
            maxLength={RUNDOWN_TITLE_MAX_LENGTH}
            autoComplete="off"
            value={title}
            aria-invalid={fieldError ? true : undefined}
            aria-describedby={fieldError ? errorId : undefined}
            onChange={(event) => change(event.target.value)}
          />
          {fieldError ? (
            <div className="field-error" id={errorId} role="alert">
              {fieldError}
            </div>
          ) : null}
        </div>
        <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
}
