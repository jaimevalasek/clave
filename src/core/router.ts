import { useEffect, useState } from 'react';

/**
 * Hash router. Two screens: the rundown list and one rundown's sheet. Any
 * other hash (the retired board, stage, library and report included) is not a
 * route and leads to the list (AC-pauta-revelavel-12).
 */
export type RouteName = 'rundowns' | 'rundown';

export interface Route {
  name: RouteName;
  arg: string | null;
}

export function parseHash(hash: string): Route | null {
  const cleaned = hash.replace(/^#\/?/, '').split('?')[0];
  if (!cleaned) return null;
  const [name, arg, ...rest] = cleaned.split('/');
  if (name === 'rundowns' && !arg) return { name: 'rundowns', arg: null };
  if (name === 'rundown' && arg && !rest.length) return { name: 'rundown', arg: decodeURIComponent(arg) };
  return null;
}

export function navigate(path: string, { replace = false } = {}): void {
  const hash = `#${path.startsWith('/') ? path : `/${path}`}`;
  if (replace) {
    window.history.replaceState(null, '', hash);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    return;
  }
  window.location.hash = hash;
}

export function useHash(): string {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return hash;
}

export const routes = {
  rundowns: () => '/rundowns',
  rundown: (rundownId: string) => `/rundown/${encodeURIComponent(rundownId)}`
};
