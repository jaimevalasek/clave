import { Router } from 'express';
import { db } from '../db/database.js';
import * as reportService from '../services/reportService.js';
import * as runService from '../services/runService.js';

export const runRoutes = Router();

runRoutes.get('/rundowns/:id/preflight', (request, response) => {
  response.json({ problems: runService.preflight(db(), request.params.id) });
});

runRoutes.get('/rundowns/:id/open-run', (request, response) => {
  response.json({ run: runService.openRunOf(db(), request.params.id) });
});

runRoutes.post('/runs', (request, response) => {
  const rundownId = String((request.body ?? {}).rundownId ?? '');
  response.status(201).json({ run: runService.start(db(), rundownId) });
});

runRoutes.get('/runs/:id', (request, response) => {
  response.json({ run: runService.get(db(), request.params.id) });
});

runRoutes.post('/runs/:id/steps', (request, response) => {
  response.json({ run: runService.registerStep(db(), request.params.id, request.body) });
});

runRoutes.post('/runs/:id/finish', (request, response) => {
  response.json({ run: runService.finish(db(), request.params.id, request.body) });
});

runRoutes.get('/runs/:id/report', (request, response) => {
  response.json({ report: reportService.build(db(), request.params.id) });
});
