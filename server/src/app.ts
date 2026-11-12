import express from 'express';
import type { Express, Router } from 'express';
import { errorHandler, notFound } from './http/errors.js';
import { mediaRoutes } from './routes/media.js';
import { platformRoutes } from './routes/platform.js';
import { preferenceRoutes } from './routes/preferences.js';
import { rundownRoutes } from './routes/rundowns.js';

const API_PREFIX = '/api';

/**
 * The only list of mounted routers: the catalog is checked against it. The
 * live-show routers (blocks, attachments, runs, library, open-url) left with
 * the previous version of the app.
 */
const API_ROUTERS: Router[] = [platformRoutes, rundownRoutes, mediaRoutes, preferenceRoutes];

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
 * The `/api` routes actually registered. `tests/api/platform.test.ts` compares
 * this list with `API_ENDPOINTS`: no route announced without existing, no
 * existing route left out of the catalog.
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
