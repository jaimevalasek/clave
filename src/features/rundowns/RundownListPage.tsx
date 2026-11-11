import { useCallback, useEffect, useState } from 'react';
import { api } from '../../core/api';
import { navigate, routes } from '../../core/router';
import { COPY } from '../../core/vocabulary';
import { useWorkspace } from '../../core/store';
import { ErrorBanner } from '../../ui/ErrorBanner';
import { LoadingSkeleton } from '../../ui/LoadingSkeleton';
import { Modal } from '../../ui/Modal';
import { useToast } from '../../ui/Toast';
import { RundownForm } from './RundownForm';
import { EmptyStaffMark } from './EmptyStaffMark';
import { formatBrDate, formatMinutes } from './format';
import type { RundownSummary } from '../../../shared/types';
import './rundowns.css';

type Dialog =
  | { kind: 'none' }
  | { kind: 'create' }
  | { kind: 'rename'; rundown: RundownSummary }
  | { kind: 'delete'; rundown: RundownSummary };

export function RundownListPage() {
  const [rundowns, setRundowns] = useState<RundownSummary[] | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [writeError, setWriteError] = useState<{ action: string; error: unknown } | null>(null);
  const [dialog, setDialog] = useState<Dialog>({ kind: 'none' });
  const toast = useToast();
  const currentRundownId = useWorkspace((state) => state.rundown?.id ?? null);

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

  const runWrite = async (action: string, work: () => Promise<void>) => {
    try {
      setWriteError(null);
      await work();
      await load();
    } catch (error) {
      setWriteError({ action, error });
      throw error;
    }
  };

  if (loadError) {
    return (
      <div className="pagina">
        <ErrorBanner action="carregar as pautas" error={loadError} onRetry={() => void load()} />
      </div>
    );
  }

  if (!rundowns) return <LoadingSkeleton />;

  return (
    <div className="pagina" data-testid="pautas-lista">
      <div className="eyebrow batuta">{COPY.rundowns.eyebrow}</div>
      <h1>{COPY.rundowns.heading}</h1>
      <p className="sub">{COPY.rundowns.subheading}</p>

      {writeError ? <ErrorBanner action={writeError.action} error={writeError.error} /> : null}

      <div className="acoes-topo">
        <button
          type="button"
          className="btn btn-ar"
          data-testid="acao-criar-pauta"
          onClick={() => setDialog({ kind: 'create' })}
        >
          {COPY.rundowns.create}
        </button>
      </div>

      {rundowns.length ? (
        <div className="lista-pautas">
          {rundowns.map((rundown, index) => (
            <div className="linha-pauta" key={rundown.id} data-testid={`pauta-${rundown.id}`}>
              <span className="num-pauta">{String(index + 1).padStart(2, '0')}</span>
              <div className="info">
                <div className="nome">
                  {rundown.title}
                  <span
                    className={`tag-tipo tag-tipo-${rundown.kind || 'rundown'}`}
                    data-testid={`tipo-${rundown.id}`}
                  >
                    {COPY.rundowns.kinds[rundown.kind || 'rundown']}
                  </span>
                  {rundown.pinned ? (
                    <span className="tag-fixada" data-testid={`marca-fixada-${rundown.id}`}>
                      {COPY.rundowns.pinned}
                    </span>
                  ) : null}
                  {rundown.id === currentRundownId ? (
                    <span className="tag-ultima">{COPY.rundowns.lastUsed}</span>
                  ) : null}
                  {rundown.openRunId ? (
                    <span className="tag-aberta" data-testid="marca-execucao-aberta">
                      {COPY.rundowns.openRun}
                    </span>
                  ) : null}
                </div>
                <div className="meta">
                  <span>{formatBrDate(rundown.date)}</span>
                  <span>
                    {rundown.trackBlockCount} bloco{rundown.trackBlockCount === 1 ? '' : 's'} na
                    pauta · {rundown.rescueBlockCount} na reserva
                  </span>
                  <span>{formatMinutes(rundown.plannedMinutes)} previstos</span>
                  {rundown.lastFinishedRunId ? (
                    <button
                      type="button"
                      className="ver-relatorio"
                      data-testid={`ver-relatorio-${rundown.id}`}
                      onClick={() => navigate(routes.report(rundown.lastFinishedRunId as string))}
                    >
                      {COPY.rundowns.seeReport}
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="acoes">
                <button
                  type="button"
                  className="btn btn-suave"
                  onClick={() => navigate(routes.board(rundown.id))}
                >
                  {COPY.rundowns.open}
                </button>
                <button
                  type="button"
                  data-testid={`acao-fixar-${rundown.id}`}
                  onClick={() =>
                    void runWrite(rundown.pinned ? 'desafixar a pauta' : 'fixar a pauta', async () => {
                      const payload = await api.post<{ rundown: RundownSummary }>(
                        `/api/rundowns/${rundown.id}/toggle-pin`
                      );
                      toast.push(payload.rundown.pinned ? 'Fixada no topo' : 'Desafixada');
                    })
                  }
                >
                  {rundown.pinned ? COPY.rundowns.unpin : COPY.rundowns.pin}
                </button>
                <button type="button" onClick={() => setDialog({ kind: 'rename', rundown })}>
                  {COPY.rundowns.rename}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void runWrite('duplicar a pauta', async () => {
                      const payload = await api.post<{ rundown: { title: string } }>(
                        `/api/rundowns/${rundown.id}/duplicate`
                      );
                      toast.push(COPY.rundowns.duplicated(payload.rundown.title));
                    })
                  }
                >
                  {COPY.rundowns.duplicate}
                </button>
                <button type="button" onClick={() => setDialog({ kind: 'delete', rundown })}>
                  {COPY.rundowns.remove}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="vazio" data-testid="estado-vazio-pautas">
          <EmptyStaffMark />
          <h2>{COPY.rundowns.emptyTitle}</h2>
          <p>{COPY.rundowns.emptyBody}</p>
          <button type="button" className="btn btn-ar" onClick={() => setDialog({ kind: 'create' })}>
            {COPY.rundowns.createFirst}
          </button>
        </div>
      )}

      {dialog.kind === 'create' ? (
        <RundownForm
          mode="create"
          onDismiss={() => setDialog({ kind: 'none' })}
          onSubmit={async (input) => {
            const payload = await api.post<{ rundown: { id: string } }>('/api/rundowns', input);
            setDialog({ kind: 'none' });
            toast.push(COPY.rundowns.created);
            navigate(routes.board(payload.rundown.id));
          }}
        />
      ) : null}

      {dialog.kind === 'rename' ? (
        <RundownForm
          mode="rename"
          initialTitle={dialog.rundown.title}
          initialDate={dialog.rundown.date}
          initialKind={dialog.rundown.kind}
          initialPinned={dialog.rundown.pinned}
          onDismiss={() => setDialog({ kind: 'none' })}
          onSubmit={async (input) => {
            await api.patch(`/api/rundowns/${dialog.rundown.id}`, input);
            setDialog({ kind: 'none' });
            toast.push(COPY.rundowns.renamed);
            await load();
          }}
        />
      ) : null}

      {dialog.kind === 'delete' ? (
        <Modal
          title={COPY.rundowns.deleteTitle(dialog.rundown.title)}
          consequence={COPY.rundowns.deleteConsequence}
          onDismiss={() => setDialog({ kind: 'none' })}
          actions={[
            { label: COPY.common.cancel },
            {
              label: COPY.rundowns.deleteConfirm,
              intent: 'perigo',
              onSelect: () =>
                void runWrite('apagar a pauta', async () => {
                  await api.delete(`/api/rundowns/${dialog.rundown.id}`);
                  toast.push(COPY.rundowns.deleted);
                })
            }
          ]}
        />
      ) : null}
    </div>
  );
}
