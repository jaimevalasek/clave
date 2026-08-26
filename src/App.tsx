import { useEffect, useState } from 'react';
import { api } from './core/api';
import { navigate, routes, useRoute } from './core/router';
import { COPY, VOCABULARY } from './core/vocabulary';
import { useWorkspace } from './core/store';
import { ToastProvider } from './ui/Toast';
import { LoadingSkeleton } from './ui/LoadingSkeleton';
import { ErrorBanner } from './ui/ErrorBanner';
import { RundownListPage } from './features/rundowns/RundownListPage';
import { BoardPage } from './features/board/BoardPage';
import { StagePage } from './features/stage/StagePage';
import { ReportPage } from './features/report/ReportPage';
import { LibraryPage } from './features/library/LibraryPage';
import { GoLiveButton } from './features/runs/GoLiveButton';
import { GuideLayer } from './features/guide/GuideLayer';
import type { RundownSummary } from '../shared/types';
import './ui/chrome.css';

function ClaveMark() {
  return (
    <svg width="34" height="26" viewBox="0 0 34 26" aria-hidden="true">
      <g stroke="#8F8674" strokeWidth="1.4">
        <line x1="2" y1="3" x2="32" y2="3" />
        <line x1="2" y1="8" x2="32" y2="8" />
        <line x1="2" y1="13" x2="32" y2="13" />
        <line x1="2" y1="18" x2="32" y2="18" />
        <line x1="2" y1="23" x2="32" y2="23" />
      </g>
      <path
        d="M13 23 C 8 20, 8 12, 13 9 C 17 6.5, 21 9, 21 13 C 21 17, 17 18.5, 14.5 16.5"
        fill="none"
        stroke="#E8BA52"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Topbar({ active }: { active: string }) {
  const rundown = useWorkspace((state) => state.rundown);
  const showGoLive = active === 'board';
  return (
    <div id="topbar">
      <button
        type="button"
        className="logo"
        onClick={() => navigate(routes.rundowns())}
        aria-label={`Início: suas ${VOCABULARY.rundownPlural.toLowerCase()}`}
      >
        <ClaveMark />
        <span className="wordmark">CLAVE</span>
      </button>
      <nav aria-label="Modos do Clave">
        <button
          type="button"
          className={active === 'rundowns' ? 'ativo' : undefined}
          onClick={() => navigate(routes.rundowns())}
        >
          {COPY.nav.rundowns}
        </button>
        <button
          type="button"
          className={active === 'board' ? 'ativo' : undefined}
          disabled={!rundown}
          onClick={() => rundown && navigate(routes.board(rundown.id))}
        >
          {COPY.nav.board}
        </button>
        <button
          type="button"
          className={active === 'library' ? 'ativo' : undefined}
          onClick={() => navigate(routes.library())}
        >
          {COPY.nav.library}
        </button>
      </nav>
      {rundown ? (
        <div className="pauta-chip">
          pauta atual&nbsp; <b>{rundown.title}</b>
        </div>
      ) : null}
      {showGoLive ? <GoLiveButton /> : null}
    </div>
  );
}

type BootState =
  | { phase: 'loading' }
  | { phase: 'ready' }
  | { phase: 'error'; error: unknown };

export function App() {
  const route = useRoute();
  const [boot, setBoot] = useState<BootState>({ phase: 'loading' });

  // Boot: iniciar o app equivale a reabrir a última pauta usada. Sem nenhuma
  // pauta, a lista mostra o empty state que leva à criação da primeira.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const payload = await api.get<{ rundowns: RundownSummary[] }>('/api/rundowns');
        if (cancelled) return;
        if (!window.location.hash) {
          const lastUsed = payload.rundowns[0];
          navigate(lastUsed ? routes.board(lastUsed.id) : routes.rundowns());
        }
        setBoot({ phase: 'ready' });
      } catch (error) {
        if (!cancelled) setBoot({ phase: 'error', error });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (boot.phase === 'loading') {
    return (
      <ToastProvider>
        <main>
          <LoadingSkeleton />
        </main>
      </ToastProvider>
    );
  }

  if (boot.phase === 'error') {
    return (
      <ToastProvider>
        <main className="pagina">
          <ErrorBanner
            action="abrir o Clave"
            error={boot.error}
            onRetry={() => window.location.reload()}
          />
        </main>
      </ToastProvider>
    );
  }

  const name = route?.name ?? 'rundowns';
  const runId = route?.params.run ?? null;

  // O Palco toma a tela inteira: nada de chrome do app na captura do OBS.
  if (name === 'stage' && route?.arg && runId) {
    return (
      <ToastProvider>
        <StagePage
          rundownId={route.arg}
          runId={runId}
          onLeave={() => navigate(routes.board(route.arg as string))}
          onFinished={(finishedRunId) => navigate(routes.report(finishedRunId))}
        />
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <Topbar active={name} />
      <main>
        {name === 'board' && route?.arg ? (
          <BoardPage rundownId={route.arg} />
        ) : name === 'report' && route?.arg ? (
          <ReportPage runId={route.arg} />
        ) : name === 'library' ? (
          <LibraryPage />
        ) : (
          <RundownListPage />
        )}
      </main>
      {/* A camada didática vive fora do Palco: nada de chrome do app na captura do OBS. */}
      <GuideLayer />
      <div id="grao" aria-hidden="true" />
    </ToastProvider>
  );
}
