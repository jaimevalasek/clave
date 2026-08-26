import { Router } from 'express';
import { db } from '../db/database.js';
import * as blockService from '../services/blockService.js';

export const blockRoutes = Router();

blockRoutes.post('/blocks', (request, response) => {
  response.status(201).json(blockService.create(db(), request.body));
});

blockRoutes.patch('/blocks/:id', (request, response) => {
  response.json(blockService.update(db(), request.params.id, request.body));
});

blockRoutes.delete('/blocks/:id', (request, response) => {
  response.json(blockService.remove(db(), request.params.id));
});

blockRoutes.patch('/beats/:id', (request, response) => {
  response.json(blockService.setBeatState(db(), request.params.id, request.body));
});

blockRoutes.post('/rundowns/:id/track/reorder', (request, response) => {
  response.json(blockService.reorderTrack(db(), request.params.id, request.body));
});
