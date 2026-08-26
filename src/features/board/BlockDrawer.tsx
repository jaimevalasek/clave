import { useEffect, useId, useRef, useState } from 'react';
import { ApiError } from '../../core/api';
import { COPY } from '../../core/vocabulary';
import { ErrorBanner } from '../../ui/ErrorBanner';
import { Modal } from '../../ui/Modal';
import { metalOf } from '../../ui/typeColors';
import { BLOCK_TYPES } from '../../../shared/types';
import type { Block, BlockType } from '../../../shared/types';
import {
  BLOCK_DEFAULTS,
  BLOCK_TITLE_MAX_LENGTH,
  DURATION_MAX_MINUTES,
  DURATION_MIN_MINUTES
} from '../../../shared/validation/block';
import { BEATS_MAX_PER_BLOCK } from '../../../shared/validation/beat';
import { AttachmentFields, emptyAttachment } from './AttachmentFields';
import type { AttachmentDraft } from './AttachmentFields';
import { BeatFields, emptyBeat } from './BeatFields';
import type { BeatDraft } from './BeatFields';

export interface BlockDraft {
  type: BlockType;
  title: string;
  note: string;
  durationMinutes: number;
}

interface BlockDrawerProps {
  /** `null` abre o editor de criação com a etiqueta escolhida. */
  block: Block | null;
  initialType: BlockType;
  /** Posições disponíveis na pauta, para o equivalente por teclado do arraste. */
  trackLength: number;
  currentPosition: number | null;
  onSave(draft: BlockDraft, attachments: AttachmentDraft[], beats: BeatDraft[]): Promise<void>;
  onDelete?(): void;
  onArchive?(): void;
  onMoveTo?(position: number): void;
  onDismiss(): void;
}

function toBeatDrafts(block: Block | null): BeatDraft[] {
  return (block?.beats ?? []).map((beat) => ({
    id: beat.id,
    text: beat.text,
    imagePath: beat.imagePath,
    done: beat.done,
    depth: beat.depth
  }));
}

function toDrafts(block: Block | null): AttachmentDraft[] {
  return (block?.attachments ?? []).map((attachment) => ({
    id: attachment.id,
    type: attachment.type,
    label: attachment.label,
    path: attachment.path,
    content: attachment.content,
    fullscreen: attachment.fullscreen
  }));
}

/**
 * Editor do bloco: um modal centralizado do design system, com o mesmo fundo,
 * z-index e animação do `<Modal>` — o produto tem uma concha de diálogo só. O
 * formulário rola por dentro e as ações ficam num rodapé fixo, para `Salvar`
 * continuar ao alcance num bloco com 30 pontos.
 *
 * Os limites são os mesmos do domínio (título ≤140, duração 1–600, pontos ≤30)
 * e a rota rejeita antes de escrever; o erro volta inline com
 * `aria-invalid`/`aria-describedby`. Todo campo aceito na criação continua
 * editável depois.
 */
export function BlockDrawer({
  block,
  initialType,
  trackLength,
  currentPosition,
  onSave,
  onDelete,
  onArchive,
  onMoveTo,
  onDismiss
}: BlockDrawerProps) {
  const isNew = block === null;
  const titleId = useId();
  const durationId = useId();
  const noteId = useId();
  const typeId = useId();
  const titleRef = useRef<HTMLInputElement>(null);

  const [draft, setDraft] = useState<BlockDraft>(() => ({
    type: block?.type ?? initialType,
    title: block?.title ?? '',
    note: block?.note ?? '',
    durationMinutes: block?.durationMinutes ?? BLOCK_DEFAULTS.durationMinutes
  }));
  const [attachments, setAttachments] = useState<AttachmentDraft[]>(() => toDrafts(block));
  const [beats, setBeats] = useState<BeatDraft[]>(() => toBeatDrafts(block));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [writeError, setWriteError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // O editor é remontado por id de bloco; este efeito cobre a troca de alvo
  // sem desmontar (por exemplo, salvar e reabrir o mesmo bloco).
  useEffect(() => {
    setFieldErrors({});
    setWriteError(null);
  }, [block?.id]);

  // Abrir um diálogo leva o foco para dentro dele, como o `<Modal>` do design
  // system faz. O título é o primeiro campo do formulário.
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  // Esc fecha o editor, como o modal do design system. Enquanto a confirmação
  // de exclusão está aberta, ela é quem trata a tecla.
  useEffect(() => {
    if (confirmingDelete) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [confirmingDelete, onDismiss]);

  const submit = async () => {
    if (saving) return;
    setSaving(true);
    setFieldErrors({});
    setWriteError(null);
    try {
      await onSave(draft, attachments, beats);
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

  if (confirmingDelete && block) {
    return (
      <Modal
        title={`Excluir o bloco "${block.title}"?`}
        consequence="O bloco sai da pauta com os pontos dele e a ordem é recompactada. Trajetos já gravados guardam o snapshot e não mudam. Esta ação não pode ser desfeita."
        onDismiss={() => setConfirmingDelete(false)}
        actions={[
          { label: COPY.common.cancel },
          { label: 'Excluir bloco', intent: 'perigo', onSelect: () => onDelete?.() }
        ]}
      />
    );
  }

  return (
    <div
      className="modal-fundo"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onDismiss();
      }}
    >
      <div
        className="modal modal-editor"
        role="dialog"
        aria-modal="true"
        aria-label={isNew ? 'Novo bloco' : 'Editar bloco'}
        data-testid="gaveta-bloco"
      >
        <header className="cabecalho-editor">
          <h2>{isNew ? 'Novo bloco' : 'Editar bloco'}</h2>
          {writeError ? (
            <ErrorBanner action={isNew ? 'criar o bloco' : 'salvar o bloco'} error={writeError} />
          ) : null}
        </header>

        {/* `noValidate`: o gate é a validação de domínio, com erro inline nomeando
            o que falta — não a bolha nativa do browser, que bloqueia o envio em
            silêncio e nunca chega à rota. */}
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <div className="corpo-editor">
            <section className="secao-editor">
              <h3>Identidade</h3>

              <div className={`campo${fieldErrors.title ? ' invalido' : ''}`}>
                <label htmlFor={titleId}>Título</label>
                <input
                  id={titleId}
                  ref={titleRef}
                  type="text"
                  maxLength={BLOCK_TITLE_MAX_LENGTH}
                  autoComplete="off"
                  value={draft.title}
                  placeholder="O que acontece neste bloco?"
                  aria-invalid={fieldErrors.title ? true : undefined}
                  aria-describedby={fieldErrors.title ? `${titleId}-erro` : undefined}
                  onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                />
                {fieldErrors.title ? (
                  <div className="erro-campo" id={`${titleId}-erro`}>
                    {fieldErrors.title}
                  </div>
                ) : null}
              </div>

              <div className="par-campos">
                <div className="campo">
                  <label htmlFor={typeId}>Etiqueta</label>
                  <select
                    id={typeId}
                    value={draft.type}
                    onChange={(event) =>
                      setDraft({ ...draft, type: event.target.value as BlockType })
                    }
                  >
                    {BLOCK_TYPES.map((type) => (
                      <option value={type} key={type}>
                        {metalOf(type).label}
                        {type === 'rescue' ? ' (reserva, fora da pauta)' : ''}
                      </option>
                    ))}
                  </select>
                  <div className="nota-privada-dica">
                    A etiqueta é só a cor do bloco na pauta. Só <b>Resgate</b> muda o comportamento:
                    tira o bloco da ordem e guarda na reserva.
                  </div>
                </div>

                <div className={`campo${fieldErrors.durationMinutes ? ' invalido' : ''}`}>
                  <label htmlFor={durationId}>Duração prevista (minutos)</label>
                  <input
                    id={durationId}
                    type="number"
                    inputMode="numeric"
                    min={DURATION_MIN_MINUTES}
                    max={DURATION_MAX_MINUTES}
                    step={1}
                    maxLength={3}
                    value={Number.isFinite(draft.durationMinutes) ? draft.durationMinutes : ''}
                    aria-invalid={fieldErrors.durationMinutes ? true : undefined}
                    aria-describedby={
                      fieldErrors.durationMinutes ? `${durationId}-erro` : undefined
                    }
                    onChange={(event) =>
                      setDraft({ ...draft, durationMinutes: Number.parseInt(event.target.value, 10) })
                    }
                  />
                  {fieldErrors.durationMinutes ? (
                    <div className="erro-campo" id={`${durationId}-erro`}>
                      {fieldErrors.durationMinutes}
                    </div>
                  ) : null}
                </div>
              </div>

              {onMoveTo && currentPosition !== null && trackLength > 1 ? (
                <div className="campo">
                  <label htmlFor={`${titleId}-mover`}>Mover para…</label>
                  <select
                    id={`${titleId}-mover`}
                    data-testid="mover-para"
                    value={currentPosition}
                    onChange={(event) => onMoveTo(Number(event.target.value))}
                  >
                    {Array.from({ length: trackLength }, (_, index) => (
                      <option value={index} key={index}>
                        posição {index + 1} de {trackLength}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </section>

            <section className="secao-editor">
              <h3>Pontos deste bloco</h3>
              <div className="nota-privada-dica" style={{ marginBottom: 'var(--e-3)' }}>
                Aparecem um a um no Palco conforme você avança, e ficam marcados ao passar. Um
                bloco sem pontos avança direto para o próximo. Use <b>→</b> para virar sub-ponto
                do ponto de cima — o sub-ponto continua sendo um passo da live, só entra recuado.
              </div>
              <BeatFields beats={beats} errors={fieldErrors} onChange={setBeats} />
              {fieldErrors.beats ? <div className="erro-campo">{fieldErrors.beats}</div> : null}
              <button
                type="button"
                className="btn btn-fantasma"
                data-testid="novo-ponto"
                disabled={beats.length >= BEATS_MAX_PER_BLOCK}
                onClick={() => setBeats([...beats, emptyBeat(beats.at(-1)?.depth ?? 0)])}
              >
                + ponto
              </button>
            </section>

            <section className="secao-editor">
              <h3>Anexos</h3>
              <AttachmentFields
                attachments={attachments}
                errors={fieldErrors}
                onChange={setAttachments}
              />
              <button
                type="button"
                className="btn btn-fantasma"
                onClick={() => setAttachments([...attachments, emptyAttachment()])}
              >
                + anexo
              </button>
            </section>

            <section className="secao-editor">
              <h3>Nota privada</h3>
              <div className="campo">
                <label className="visualmente-oculto" htmlFor={noteId}>
                  Nota privada
                </label>
                <textarea
                  id={noteId}
                  rows={3}
                  value={draft.note}
                  placeholder="Só você vê, segurando N no Palco."
                  onChange={(event) => setDraft({ ...draft, note: event.target.value })}
                />
                <div className="nota-privada-dica">
                  Nunca aparece por padrão no Palco. Aparece só enquanto você segura{' '}
                  <span className="tecla">N</span>.
                </div>
              </div>
            </section>
          </div>

          <div className="rodape-editor">
            <button type="submit" className="btn btn-ar" data-testid="salvar-bloco" disabled={saving}>
              {COPY.common.save}
            </button>
            <button type="button" className="btn btn-fantasma" onClick={onDismiss}>
              {COPY.common.cancel}
            </button>
            {onArchive ? (
              <button type="button" className="btn btn-fantasma" onClick={onArchive}>
                Guardar no acervo
              </button>
            ) : null}
            {onDelete ? (
              <button
                type="button"
                className="btn btn-perigo"
                data-testid="excluir-bloco"
                onClick={() => setConfirmingDelete(true)}
              >
                Excluir
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}
