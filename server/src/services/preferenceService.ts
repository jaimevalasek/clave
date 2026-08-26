import type { Database } from '../db/database.js';
import type { Preferences } from '../../../shared/types.js';
import { validationFailed } from '../http/errors.js';
import { readPreferences, writePreferences } from '../repositories/preferenceRepository.js';

const nowIso = () => new Date().toISOString();

export function read(db: Database): Preferences {
  return readPreferences(db);
}

/**
 * O patch aceita apenas as chaves conhecidas, e cada uma no seu tipo. Chave
 * desconhecida é ignorada em silêncio; chave conhecida com tipo errado é erro
 * de validação, para o cliente não gravar `"undefined"` como preferência.
 */
export function update(db: Database, payload: unknown): Preferences {
  const body = (payload ?? {}) as Record<string, unknown>;
  const patch: Partial<Preferences> = {};

  if ('tourSeen' in body) {
    if (typeof body.tourSeen !== 'boolean') {
      throw validationFailed([
        { field: 'tourSeen', message: 'A preferência do tour aceita apenas verdadeiro ou falso.' }
      ]);
    }
    patch.tourSeen = body.tourSeen;
  }

  return writePreferences(db, patch, nowIso());
}
