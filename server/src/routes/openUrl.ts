import { Router } from 'express';
import { openHttpUrl } from '../services/openUrl.js';

export const openUrlRoutes = Router();

/**
 * Play's webview does not follow target=_blank. The Palco asks this route to
 * open an attachment URL in the system browser.
 */
openUrlRoutes.post('/open-url', (request, response, next) => {
  const body = (request.body ?? {}) as { url?: unknown };
  openHttpUrl(body.url)
    .then((opened) => response.json(opened))
    .catch(next);
});
