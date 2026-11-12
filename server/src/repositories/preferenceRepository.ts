import type { Database } from '../db/database.js';
import { DEFAULT_SHEET_OPACITY, DEFAULT_THEME, isHexColor } from '../../../shared/types.js';
import type { Preferences } from '../../../shared/types.js';
import { isSheetOpacity, isThemeId, parseBackground } from '../../../shared/validation/preferences.js';

interface PreferenceRow {
  key: string;
  value: string;
}

/**
 * Preferência ausente no banco vale o padrão: instalação nova nunca viu o tour
 * e abre no tema Tinta & Ouro, com o destaque e o fundo do tema e a folha
 * cobrindo 90% do fundo.
 */
const DEFAULTS: Preferences = {
  tourSeen: false,
  theme: DEFAULT_THEME,
  accent: null,
  background: { kind: 'theme' },
  sheetOpacity: DEFAULT_SHEET_OPACITY
};

function parseJson(text: string | undefined): unknown {
  if (text === undefined) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

export function readPreferences(db: Database): Preferences {
  const rows = db.all<PreferenceRow>('SELECT key, value FROM preferences');
  const stored = new Map(rows.map((row) => [row.key, row.value]));
  const theme = stored.get('theme');
  const accent = stored.get('accent');
  const sheetOpacity = Number(stored.get('sheetOpacity'));
  return {
    tourSeen: stored.has('tourSeen') ? stored.get('tourSeen') === 'true' : DEFAULTS.tourSeen,
    theme: isThemeId(theme) ? theme : DEFAULTS.theme,
    accent: isHexColor(accent) ? accent.toUpperCase() : DEFAULTS.accent,
    background: parseBackground(parseJson(stored.get('background'))) ?? DEFAULTS.background,
    sheetOpacity: stored.has('sheetOpacity') && isSheetOpacity(sheetOpacity) ? sheetOpacity : DEFAULTS.sheetOpacity
  };
}

/** How each preference is written as text: the background as JSON, the rest as is. */
function storedValue(key: string, value: unknown): string {
  return key === 'background' ? JSON.stringify(value) : String(value);
}

/**
 * Escrita parcial: só as chaves presentes no patch são gravadas, e o retorno é
 * sempre o documento inteiro já relido do disco. `accent: null` apaga a linha:
 * o destaque volta a ser o do tema.
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
        if (value === null) {
          db.run('DELETE FROM preferences WHERE key = ?', [key]);
          continue;
        }
        db.run(
          `INSERT INTO preferences (key, value, updated_at) VALUES (?, ?, ?)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
          [key, storedValue(key, value), now]
        );
      }
    })();
  }
  return readPreferences(db);
}
