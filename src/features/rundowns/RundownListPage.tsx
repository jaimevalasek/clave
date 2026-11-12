import { useCallback, useEffect, useState } from 'react';
import { api } from '../../core/api';
import { navigate, routes } from '../../core/router';
import { COPY } from '../../core/vocabulary';
import { ErrorBanner } from '../../ui/ErrorBanner';
import { LoadingSkeleton } from '../../ui/LoadingSkeleton';
import { Modal } from '../../ui/Modal';
import { useToast } from '../../ui/Toast';
import { RundownForm } from './RundownForm';
import { RundownRow } from './RundownRow';
import type { Rundown, RundownSummary } from '../../../shared/types';
import './rundowns.css';

type Dialog =
  | { kind: 'none' }
  | { kind: 'create' }
  | { kind: 'rename'; rundown: RundownSummary }
  | { kind: 'delete'; rundown: RundownSummary };

function useRundownList() {
  const [rundowns, setRundowns] = useState<RundownSummary[] | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);

  const load = useCallback(async () => {
    try {
      const payload = await api.get<{ rundowns: RundownSummary[] }>('/api/rundowns');
      setRundowns(payload.rundowns);
      setLoadError(null);
    } catch (error) {
      setLoadError(error);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { rundowns, loadError, load };
}

function ListHeader({ onCreate }: { onCreate(): void }) {
  return (
    <div className="page-head">
      <div>
        <h1>{COPY.rundowns.heading}</h1>
        <p>{COPY.rundowns.subheading}</p>
      </div>
      <button type="button" className="btn btn-primary" onClick={onCreate}>
        {COPY.rundowns.create}
      </button>
    </div>
  );
}

function EmptyList({ onCreate }: { onCreate(): void }) {
  return (
    <div className="list-empty" data-testid="rundowns-empty">
      <div className="list-empty-title voice">{COPY.rundowns.emptyTitle}</div>
      <p>{COPY.rundowns.emptyBody}</p>
      <button type="button" className="btn btn-primary" onClick={onCreate}>
        {COPY.rundowns.createFirst}
      </button>
    </div>
  );
}

interface RundownRowsProps {
  rundowns: RundownSummary[];
  runWrite(action: string, work: () => Promise<void>): Promise<void>;
  onRename(rundown: RundownSummary): void;
  onDelete(rundown: RundownSummary): void;
}

function RundownRows({ rundowns, runWrite, onRename, onDelete }: RundownRowsProps) {
  const toast = useToast();
  const togglePin = (rundown: RundownSummary) =>
    void runWrite(rundown.pinned ? 'desafixar a pauta' : 'fixar a pauta', async () => {
      const payload = await api.post<{ rundown: RundownSummary }>(`/api/rundowns/${rundown.id}/toggle-pin`);
      toast.push(payload.rundown.pinned ? COPY.rundowns.pinnedToast : COPY.rundowns.unpinnedToast);
    });
  const duplicate = (rundown: RundownSummary) =>
    void runWrite('duplicar a pauta', async () => {
      await api.post(`/api/rundowns/${rundown.id}/duplicate`);
      toast.push(COPY.rundowns.duplicated);
    });

  return (
    <div className="rundown-rows">
      {rundowns.map((rundown, index) => (
        <RundownRow
          key={rundown.id}
          rundown={rundown}
          index={index}
          onOpen={() => navigate(routes.rundown(rundown.id))}
          onTogglePin={() => togglePin(rundown)}
          onRename={() => onRename(rundown)}
          onDuplicate={() => duplicate(rundown)}
          onDelete={() => onDelete(rundown)}
        />
      ))}
    </div>
  );
}

/** The rundown list (`#/rundowns`): create, open, rename, duplicate, pin and delete. */
export function RundownListPage() {
  const { rundowns, loadError, load } = useRundownList();
  const [writeError, setWriteError] = useState<{ action: string; error: unknown } | null>(null);
  const [dialog, setDialog] = useState<Dialog>({ kind: 'none' });
  const toast = useToast();
  const close = () => setDialog({ kind: 'none' });

  const runWrite = async (action: string, work: () => Promise<void>) => {
    try {
      setWriteError(null);
      await work();
    } catch (error) {
      setWriteError({ action, error });
    }
    await load();
  };

  return (
    <>
      <div className="top">
        <header className="ruler">
          <span className="eyebrow">{COPY.rundowns.eyebrow}</span>
          <span className="spacer" />
        </header>
      </div>
      <main className="page" data-testid="rundown-list">
        <ListHeader onCreate={() => setDialog({ kind: 'create' })} />
        {loadError ? (
          <ErrorBanner action="carregar as pautas" error={loadError} onRetry={() => void load()} />
        ) : !rundowns ? (
          <LoadingSkeleton />
        ) : (
          <>
            {writeError ? <ErrorBanner action={writeError.action} error={writeError.error} /> : null}
            {rundowns.length ? (
              <RundownRows
                rundowns={rundowns}
                runWrite={runWrite}
                onRename={(rundown) => setDialog({ kind: 'rename', rundown })}
                onDelete={(rundown) => setDialog({ kind: 'delete', rundown })}
              />
            ) : (
              <EmptyList onCreate={() => setDialog({ kind: 'create' })} />
            )}
          </>
        )}
      </main>
      <ListDialog
        dialog={dialog}
        onClose={close}
        onCreated={(id) => navigate(routes.rundown(id))}
        onRenamed={() => {
          toast.push(COPY.rundowns.renamed);
          void load();
        }}
        onDelete={(rundown) =>
          void runWrite('apagar a pauta', async () => {
            await api.delete(`/api/rundowns/${rundown.id}`);
            toast.push(COPY.rundowns.deleted);
          })
        }
      />
    </>
  );
}

interface ListDialogProps {
  dialog: Dialog;
  onClose(): void;
  onCreated(id: string): void;
  onRenamed(): void;
  onDelete(rundown: RundownSummary): void;
}

function ListDialog({ dialog, onClose, onCreated, onRenamed, onDelete }: ListDialogProps) {
  if (dialog.kind === 'create') {
    return (
      <RundownForm
        mode="create"
        onDismiss={onClose}
        onSubmit={async (title) => {
          const payload = await api.post<{ rundown: Rundown }>('/api/rundowns', { title });
          onClose();
          onCreated(payload.rundown.id);
        }}
      />
    );
  }
  if (dialog.kind === 'rename') {
    return (
      <RundownForm
        mode="rename"
        initialTitle={dialog.rundown.title}
        onDismiss={onClose}
        onSubmit={async (title) => {
          await api.patch(`/api/rundowns/${dialog.rundown.id}`, { title });
          onClose();
          onRenamed();
        }}
      />
    );
  }
  if (dialog.kind === 'delete') {
    return (
      <Modal
        title={COPY.rundowns.deleteTitle}
        text={COPY.rundowns.deleteText(dialog.rundown.title, dialog.rundown.blockCount)}
        destructive
        onDismiss={onClose}
        actions={[
          { label: COPY.common.cancel, autoFocus: true },
          { label: COPY.rundowns.deleteConfirm, intent: 'danger', onSelect: () => onDelete(dialog.rundown) }
        ]}
      />
    );
  }
  return null;
}
