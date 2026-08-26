import { useEffect, useState } from 'react';

/**
 * Roteador por hash — o mesmo do protótipo aprovado. Rotas em inglês
 * (`source-code-language-convention.md`); o vocabulário do produto vive nas
 * strings de interface.
 */
export type RouteName = 'rundowns' | 'board' | 'stage' | 'library' | 'report';

export interface Route {
  name: RouteName;
  arg: string | null;
  /** Parâmetros de consulta da rota — o Palco carrega o id da execução aqui. */
  params: Record<string, string>;
}

const KNOWN: RouteName[] = ['rundowns', 'board', 'stage', 'library', 'report'];

export function parseHash(hash: string): Route | null {
  const cleaned = hash.replace(/^#\/?/, '');
  if (!cleaned) return null;
  const [path, query = ''] = cleaned.split('?');
  const [name, arg] = path.split('/');
  if (!KNOWN.includes(name as RouteName)) return null;

  const params: Record<string, string> = {};
  for (const [key, value] of new URLSearchParams(query)) params[key] = value;

  return { name: name as RouteName, arg: arg || null, params };
}

export function navigate(path: string): void {
  window.location.hash = path.startsWith('/') ? path : `/${path}`;
}

export function useRoute(): Route | null {
  const [route, setRoute] = useState<Route | null>(() => parseHash(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export const routes = {
  rundowns: () => '/rundowns',
  board: (rundownId: string) => `/board/${rundownId}`,
  stage: (rundownId: string) => `/stage/${rundownId}`,
  library: () => '/library',
  report: (runId: string) => `/report/${runId}`
};
