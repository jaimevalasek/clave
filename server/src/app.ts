import express from 'express';
import type { Express, Router } from 'express';
import { errorHandler, notFound } from './http/errors.js';
import { attachmentRoutes } from './routes/attachments.js';
import { blockRoutes } from './routes/blocks.js';
import { platformRoutes } from './routes/platform.js';
import { libraryRoutes } from './routes/library.js';
import { mediaRoutes } from './routes/media.js';
import { openUrlRoutes } from './routes/openUrl.js';
import { preferenceRoutes } from './routes/preferences.js';
import { rundownRoutes } from './routes/rundowns.js';
import { runRoutes } from './routes/runs.js';

const API_PREFIX = '/api';

/** Única lista de routers montados: o catálogo é conferido contra ela. */
const API_ROUTERS: Router[] = [
  platformRoutes,
  rundownRoutes,
  blockRoutes,
  attachmentRoutes,
  runRoutes,
  mediaRoutes,
  libraryRoutes,
  preferenceRoutes,
  openUrlRoutes
];

export function createApp(): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  for (const router of API_ROUTERS) {
    app.use(API_PREFIX, router);
  }

  app.use(API_PREFIX, (_request, _response, next) => {
    next(notFound('Rota não encontrada.'));
  });

  app.use(errorHandler);
  return app;
}

interface RouteLayer {
  route?: { path: string; methods: Record<string, boolean> };
}

/**
 * Rotas `/api` realmente registradas. `tests/api/platform.test.ts` compara esta
 * lista com `API_ENDPOINTS`: nenhuma rota anunciada sem existir, nenhuma rota
 * existente fora do catálogo.
 */
export function registeredApiRoutes(): { method: string; path: string }[] {
  const found: { method: string; path: string }[] = [];
  for (const router of API_ROUTERS) {
    const stack = (router as unknown as { stack: RouteLayer[] }).stack ?? [];
    for (const layer of stack) {
      if (!layer.route) continue;
      for (const [method, enabled] of Object.entries(layer.route.methods)) {
        if (enabled) found.push({ method: method.toUpperCase(), path: `${API_PREFIX}${layer.route.path}` });
      }
    }
  }
  return found;
}
