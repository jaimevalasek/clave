import { Router } from 'express';
import { APP_SLUG, APP_VERSION, apiCatalog } from '../http/apiCatalog.js';

export const platformRoutes = Router();

/** Probe leve para o Play e para o estado de carregamento: não toca o banco. */
platformRoutes.get('/health', (_request, response) => {
  response.json({ ok: true, slug: APP_SLUG, version: APP_VERSION });
});

platformRoutes.get('/aioson-play', (request, response) => {
  const port = process.env.BACKEND_PORT ?? String(request.socket.localPort ?? '');
  response.json(apiCatalog(`http://localhost:${port}`));
});
