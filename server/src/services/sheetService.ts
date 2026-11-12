import type { Database } from '../db/database.js';
import { nowIso } from './clock.js';
import { notFound, validationFailed } from '../http/errors.js';
import { validateSheet } from '../../../shared/validation/sheet.js';
import type { SheetPayload, SheetSaveResult } from '../../../shared/types.js';
import { findRundown, findRundownSummary, touchRundownUpdated } from '../repositories/rundownRepository.js';
import { listSheetBlocks, replaceSheet } from '../repositories/sheetRepository.js';
import { mediaFileExists } from './mediaService.js';

/**
 * The sheet as stored, with every media block whose file left the media folder
 * marked `mediaMissing`: the screen shows "Arquivo não encontrado" in its
 * place, never an empty block (AC-pauta-revelavel-34).
 */
export function getSheet(db: Database, rundownId: string): SheetPayload {
  const rundown = findRundownSummary(db, rundownId);
  if (!rundown) throw notFound('Pauta não encontrada.');
  const blocks = listSheetBlocks(db, rundownId).map((block) =>
    block.kind === 'text' ? block : { ...block, mediaMissing: !mediaFileExists(block.mediaPath) }
  );
  return { rundown, blocks };
}

/**
 * Saves the whole sheet (autosave, RULE-pauta-revelavel-08). The payload is
 * validated before any write and rewritten in a single transaction, so a
 * rejected or failed save never leaves a partial sheet behind.
 */
export function saveSheet(db: Database, rundownId: string, payload: unknown): SheetSaveResult {
  if (!findRundown(db, rundownId)) throw notFound('Pauta não encontrada.');
  const result = validateSheet(payload);
  if (!result.ok) throw validationFailed(result.errors);

  const savedAt = nowIso();
  const ids = db.transaction(() => {
    const written = replaceSheet(db, rundownId, result.value, savedAt);
    touchRundownUpdated(db, rundownId, savedAt);
    return written;
  })();

  return { ...getSheet(db, rundownId), ids, savedAt };
}
