import { useId, useState } from 'react';
import { ApiError } from '../../core/api';
import { COPY } from '../../core/vocabulary';
import { ErrorBanner } from '../../ui/ErrorBanner';
import { Modal } from '../../ui/Modal';
import { RUNDOWN_TITLE_MAX_LENGTH, todayIso } from '../../../shared/validation/rundown';
import type { RundownKind } from '../../../shared/types';

export interface RundownFormData {
  title: string;
  date: string;
  kind: RundownKind;
  pinned: boolean;
}

interface RundownFormProps {
  mode: 'create' | 'rename';
  initialTitle?: string;
  initialDate?: string;
  initialKind?: RundownKind;
  initialPinned?: boolean;
  onSubmit(input: RundownFormData): Promise<void>;
  onDismiss(): void;
}

const ACTION_LABEL: Record<RundownFormProps['mode'], string> = {
  create: 'criar a pauta',
  rename: 'renomear a pauta'
};

/**
 * Formulário real de pauta. O título é validado no domínio (a rota rejeita antes
 * de escrever) e o erro volta inline com `aria-invalid`/`aria-describedby`. A
 * data usa campo nativo `type="date"`, sem segunda camada de formatação por cima.
 */
export function RundownForm({
  mode,
  initialTitle = '',
  initialDate,
  initialKind = 'rundown',
  initialPinned = false,
  onSubmit,
  onDismiss
}: RundownFormProps) {
  const titleId = useId();
  const dateId = useId();
  const errorId = `${titleId}-erro`;

  const [title, setTitle] = useState(initialTitle);
  const [date, setDate] = useState(initialDate || todayIso());
  const [kind, setKind] = useState<RundownKind>(initialKind);
  const [pinned, setPinned] = useState<boolean>(initialPinned);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [writeError, setWriteError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (saving) return;
    if (!title.trim()) {
      setTitleError('Dê um título à pauta.');
      document.getElementById(titleId)?.focus();
      return;
    }
    setSaving(true);
    setTitleError(null);
    setWriteError(null);
    try {
      await onSubmit({ title: title.trim(), date, kind, pinned });
    } catch (error) {
      // Falha de validação volta no campo; falha de escrita vira faixa dentro do
      // próprio formulário, com o que foi digitado intacto para reenviar.
      if (error instanceof ApiError && error.isValidation) {
        setTitleError(error.fieldMessage('title') ?? error.message);
      } else {
        setWriteError(error);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={mode === 'create' ? COPY.rundowns.formTitleCreate : COPY.rundowns.formTitleRename}
      onDismiss={onDismiss}
      actions={[
        { label: COPY.common.cancel },
        {
          label: mode === 'create' ? 'Criar' : COPY.rundowns.rename,
          intent: 'ouro',
          keepOpen: true,
          onSelect: submit
        }
      ]}
    >
      {/* `noValidate`: quem rejeita é a validação de domínio, com erro inline. */}
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        {writeError ? <ErrorBanner action={ACTION_LABEL[mode]} error={writeError} /> : null}
        <div className="campo">
          <label>{COPY.rundowns.fieldKind}</label>
          <div className="seletor-tipo" role="radiogroup" aria-label={COPY.rundowns.fieldKind}>
            {(['rundown', 'presentation', 'event'] as const).map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={kind === k}
                className={`opcao-tipo${kind === k ? ' ativa' : ''}`}
                data-tipo={k}
                data-testid={`opcao-tipo-${k}`}
                onClick={() => setKind(k)}
              >
                {COPY.rundowns.kinds[k]}
              </button>
            ))}
          </div>
        </div>
        <div className={`campo${titleError ? ' invalido' : ''}`}>
          <label htmlFor={titleId}>{COPY.rundowns.fieldTitle}</label>
          <input
            id={titleId}
            name="title"
            type="text"
            maxLength={RUNDOWN_TITLE_MAX_LENGTH}
            autoComplete="off"
            value={title}
            aria-invalid={titleError ? true : undefined}
            aria-describedby={titleError ? errorId : undefined}
            placeholder={COPY.rundowns.fieldTitlePlaceholder}
            onChange={(event) => {
              setTitle(event.target.value);
              if (titleError) setTitleError(null);
            }}
          />
          {titleError ? (
            <div className="erro-campo" id={errorId}>
              {titleError}
            </div>
          ) : null}
        </div>
        <div className="campo">
          <label htmlFor={dateId}>{COPY.rundowns.fieldDate}</label>
          <input
            id={dateId}
            name="date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value || todayIso())}
          />
        </div>
        <div className="campo-checkbox">
          <label className="rotulo-checkbox">
            <input
              type="checkbox"
              name="pinned"
              checked={pinned}
              data-testid="campo-fixado"
              onChange={(event) => setPinned(event.target.checked)}
            />
            <span>{COPY.rundowns.fieldPinned}</span>
          </label>
        </div>
        {/* Enter no formulário salva; o botão de gate fica no rodapé do modal. */}
        <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
}
