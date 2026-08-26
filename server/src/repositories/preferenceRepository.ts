import type { Database } from '../db/database.js';
import type { Preferences } from '../../../shared/types.js';

interface PreferenceRow {
  key: string;
  value: string;
}

/** Preferência ausente no banco vale o padrão: instalação nova nunca viu o tour. */
const DEFAULTS: Preferences = { tourSeen: false };

export function readPreferences(db: Database): Preferences {
  const rows = db.all<PreferenceRow>('SELECT key, value FROM preferences');
  const stored = new Map(rows.map((row) => [row.key, row.value]));
  return {
    tourSeen: stored.has('tourSeen') ? stored.get('tourSeen') === 'true' : DEFAULTS.tourSeen
  };
}

/**
 * Escrita parcial: só as chaves presentes no patch são gravadas, e o retorno é
 * sempre o documento inteiro já relido do disco.
 */
export function writePreferences(
  db: Database,
  patch: Partial<Preferences>,
  now: string
): Preferences {
  const entries = Object.entries(patch).filter(([, value]) => value !== undefined);
  if (entries.length) {
    db.transaction(() => {
      for (const [key, value] of entries) {
        db.run(
          `INSERT INTO preferences (key, value, updated_at) VALUES (?, ?, ?)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
          [key, String(value), now]
        );
      }
    })();
  }
  return readPreferences(db);
}
