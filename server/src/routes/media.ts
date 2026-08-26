import { Router } from 'express';
import { badRequest, notFound } from '../http/errors.js';
import { mediaDir } from '../db/paths.js';
import { resolveInsideMedia, storeUpload } from '../services/mediaService.js';

export const mediaRoutes = Router();

/**
 * Anexar arquivo: o corpo chega em streaming e o arquivo passa a viver na pasta
 * de mídia do app. O registro guarda o caminho relativo devolvido aqui.
 */
mediaRoutes.post('/media', (request, response, next) => {
  const fileName = String(request.header('x-clave-filename') ?? '').trim();
  if (!fileName) {
    next(badRequest('Informe o nome do arquivo no cabeçalho x-clave-filename.', 'missing_filename'));
    return;
  }

  const declared = Number(request.header('content-length'));
  storeUpload(request, fileName, Number.isFinite(declared) ? declared : null)
    .then((stored) => response.status(201).json({ media: stored }))
    .catch(next);
});

/**
 * Servir mídia local. `sendFile` resolve sempre a partir da raiz da pasta de
 * mídia e qualquer caminho que escape dela é recusado antes de tocar o disco.
 */
mediaRoutes.get('/media/{*relativePath}', (request, response, next) => {
  const segments = request.params.relativePath;
  const relative = Array.isArray(segments) ? segments.join('/') : String(segments ?? '');

  if (!resolveInsideMedia(relative)) {
    next(badRequest('Caminho de mídia fora da pasta do app.', 'media_path_outside_root'));
    return;
  }

  response.sendFile(
    relative,
    { root: mediaDir(), dotfiles: 'deny', acceptRanges: true },
    (error) => {
      if (!error) return;
      if (response.headersSent) {
        response.end();
        return;
      }
      next(notFound('Arquivo de mídia não encontrado.'));
    }
  );
});
