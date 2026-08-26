import { Router } from 'express';
import { db } from '../db/database.js';
import * as blockService from '../services/blockService.js';

export const attachmentRoutes = Router();

/**
 * A gaveta manda a lista inteira de anexos do bloco; o servidor reescreve
 * preservando o id de quem já existia.
 */
attachmentRoutes.put('/blocks/:id/attachments', (request, response) => {
  response.json(blockService.replaceBlockAttachments(db(), request.params.id, request.body));
});
