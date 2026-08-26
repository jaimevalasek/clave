import { useState } from 'react';
import { api } from '../../core/api';
import { navigate, routes } from '../../core/router';
import { VOCABULARY } from '../../core/vocabulary';
import { trackBlocks, useWorkspace } from '../../core/store';
import { ErrorBanner } from '../../ui/ErrorBanner';
import type { PreflightProblem, Run } from '../../../shared/types';
import { GoLiveGate } from './GoLiveGate';

/**
 * "Entrar no ar" é a ação primária do produto: ouro, e sempre atrás de um gate
 * explícito que roda a checagem pré-live antes de a execução começar.
 */
export function GoLiveButton() {
  const { rundown, blocks, refresh } = useWorkspace();
  const [problems, setProblems] = useState<PreflightProblem[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [checking, setChecking] = useState(false);

  if (!rundown) return null;

  const openRunId = rundown.openRunId;
  const hasTrack = trackBlocks(blocks).length > 0;
  const disabled = !hasTrack || Boolean(openRunId) || checking;

  const runPreflight = async () => {
    setChecking(true);
    setError(null);
    try {
      const payload = await api.get<{ problems: PreflightProblem[] }>(
        `/api/rundowns/${rundown.id}/preflight`
      );
      setProblems(payload.problems);
    } catch (failure) {
      setError(failure);
    } finally {
      setChecking(false);
    }
  };

  const start = async () => {
    try {
      setError(null);
      const payload = await api.post<{ run: Run }>('/api/runs', { rundownId: rundown.id });
      // Entrar no ar desmarca os pontos da pauta no servidor. Sem reler antes de
      // abrir o Palco, a tela mostraria o checklist da execução anterior até o
      // criador recarregar — no meio da live, e sem motivo aparente.
      await refresh();
      setProblems(null);
      navigate(`${routes.stage(rundown.id)}?run=${payload.run.id}`);
    } catch (failure) {
      setProblems(null);
      setError(failure);
    }
  };

  return (
    <>
      {openRunId ? (
        <button
          type="button"
          className="badge-ar"
          data-testid="badge-ao-ar"
          onClick={() => navigate(`${routes.stage(rundown.id)}?run=${openRunId}`)}
        >
          {VOCABULARY.onAir}
        </button>
      ) : null}

      <button
        type="button"
        className="btn btn-ar"
        data-testid="acao-entrar-no-ar"
        disabled={disabled}
        title={hasTrack ? undefined : 'A pauta ainda não tem nenhum bloco'}
        onClick={() => void runPreflight()}
      >
        {VOCABULARY.goLive}
      </button>

      {problems ? (
        <GoLiveGate
          problems={problems}
          onConfirm={() => void start()}
          onDismiss={() => setProblems(null)}
        />
      ) : null}

      {error ? (
        <div className="erro-entrar-no-ar">
          <ErrorBanner action="entrar no ar" error={error} />
        </div>
      ) : null}
    </>
  );
}
