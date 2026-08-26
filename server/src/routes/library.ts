import { Router } from 'express';
import { db } from '../db/database.js';
import * as libraryService from '../services/libraryService.js';

export const libraryRoutes = Router();

libraryRoutes.get('/library', (_request, response) => {
  response.json({ items: libraryService.listAll(db()) });
});

libraryRoutes.post('/library', (request, response) => {
  response.status(201).json({ item: libraryService.promoteBlock(db(), request.body) });
});

libraryRoutes.patch('/library/:id', (request, response) => {
  response.json({ item: libraryService.rename(db(), request.params.id, request.body) });
});

libraryRoutes.put('/library/:id/attachments', (request, response) => {
  response.json({
    item: libraryService.replaceItemAttachments(db(), request.params.id, request.body)
  });
});

libraryRoutes.delete('/library/:id', (request, response) => {
  libraryService.remove(db(), request.params.id);
  response.status(204).end();
});

libraryRoutes.post('/library/:id/copy-to/:rundownId', (request, response) => {
  response
    .status(201)
    .json(libraryService.copyToRundown(db(), request.params.id, request.params.rundownId));
});
