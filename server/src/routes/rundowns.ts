import { Router } from 'express';
import { db } from '../db/database.js';
import * as rundownService from '../services/rundownService.js';
import * as sheetService from '../services/sheetService.js';

export const rundownRoutes = Router();

rundownRoutes.get('/rundowns', (_request, response) => {
  response.json({ rundowns: rundownService.listAll(db()) });
});

rundownRoutes.post('/rundowns', (request, response) => {
  const rundown = rundownService.create(db(), request.body);
  response.status(201).json({ rundown });
});

rundownRoutes.patch('/rundowns/:id', (request, response) => {
  response.json({ rundown: rundownService.update(db(), request.params.id, request.body) });
});

rundownRoutes.post('/rundowns/:id/toggle-pin', (request, response) => {
  response.json({ rundown: rundownService.togglePin(db(), request.params.id) });
});

rundownRoutes.delete('/rundowns/:id', (request, response) => {
  rundownService.remove(db(), request.params.id);
  response.status(204).end();
});

rundownRoutes.post('/rundowns/:id/duplicate', (request, response) => {
  response.status(201).json({ rundown: rundownService.duplicate(db(), request.params.id) });
});

rundownRoutes.post('/rundowns/:id/open', (request, response) => {
  response.json({ rundown: rundownService.open(db(), request.params.id) });
});

rundownRoutes.get('/rundowns/:id/sheet', (request, response) => {
  response.json(sheetService.getSheet(db(), request.params.id));
});

rundownRoutes.put('/rundowns/:id/sheet', (request, response) => {
  response.json(sheetService.saveSheet(db(), request.params.id, request.body));
});
