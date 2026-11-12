import { useCallback, useEffect, useState } from 'react';
import { api } from './core/api';
import { navigate, parseHash, routes, useHash } from './core/router';
import { ToastProvider } from './ui/Toast';
import { LoadingSkeleton } from './ui/LoadingSkeleton';
import { ErrorBanner } from './ui/ErrorBanner';
import { AppearancePanel } from './features/appearance/AppearancePanel';
import { loadAppearance } from './features/appearance/appearanceStore';
import { GuideLayer } from './features/guide/GuideLayer';
import { RundownListPage } from './features/rundowns/RundownListPage';
import { lastOpened } from './features/rundowns/format';
import { SheetPage } from './features/sheet/SheetPage';
import type { RundownSummary } from '../shared/types';
import './ui/chrome.css';

type BootState = { phase: 'loading' } | { phase: 'ready' } | { phase: 'error'; error: unknown };

/**
 * Opening the app reopens the most recently opened rundown, even when another
 * one is pinned; with no rundown, the list shows the empty state
 * (AC-pauta-revelavel-01). A deep link to a rundown or the list skips this.
 * The stored appearance is on screen before the first ready render
 * (RULE-pauta-revelavel-10).
 */
function useBoot(): { boot: BootState; retry(): void } {
  const [boot, setBoot] = useState<BootState>({ phase: 'loading' });

  const run = useCallback(async () => {
    setBoot({ phase: 'loading' });
    await loadAppearance();
    // Only a bare address reopens the last rundown; any other hash is either a
    // route or leads to the list.
    if (window.location.hash.replace(/^#\/?/, '')) {
      setBoot({ phase: 'ready' });
      return;
    }
    try {
      const payload = await api.get<{ rundowns: RundownSummary[] }>('/api/rundowns');
      const latest = lastOpened(payload.rundowns);
      navigate(latest ? routes.rundown(latest.id) : routes.rundowns(), { replace: true });
      setBoot({ phase: 'ready' });
    } catch (error) {
      setBoot({ phase: 'error', error });
    }
  }, []);

  useEffect(() => {
    void run();
  }, [run]);

  return { boot, retry: () => void run() };
}

function Screen() {
  const hash = useHash();
  const route = parseHash(hash);

  // Any other address (the retired board, stage, library and report included)
  // leads to the list (AC-pauta-revelavel-12).
  useEffect(() => {
    if (!route) navigate(routes.rundowns(), { replace: true });
  }, [route]);

  if (route?.name === 'rundown' && route.arg) return <SheetPage rundownId={route.arg} />;
  if (route?.name === 'rundowns') return <RundownListPage />;
  return <LoadingSkeleton />;
}

export function App() {
  const { boot, retry } = useBoot();

  return (
    <ToastProvider>
      {boot.phase === 'loading' ? (
        <main>
          <LoadingSkeleton />
        </main>
      ) : boot.phase === 'error' ? (
        <main className="page">
          <ErrorBanner action="abrir o app" error={boot.error} onRetry={retry} />
        </main>
      ) : (
        <>
          <Screen />
          <AppearancePanel />
          <GuideLayer />
        </>
      )}
    </ToastProvider>
  );
}
