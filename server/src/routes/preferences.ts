import { Router } from 'express';
import { db } from '../db/database.js';
import * as preferenceService from '../services/preferenceService.js';

export const preferenceRoutes = Router();

preferenceRoutes.get('/preferences', (_request, response) => {
  response.json({ preferences: preferenceService.read(db()) });
});

preferenceRoutes.put('/preferences', (request, response) => {
  response.json({ preferences: preferenceService.update(db(), request.body) });
});
