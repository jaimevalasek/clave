import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Database } from './database.js';

const here = path.dirname(fileURLToPath(import.meta.url));

interface Migration {
  version: number;
  name: string;
  apply(db: Database): void;
}

/**
 * `schema.sql` mora ao lado do fonte. Em desenvolvimento (tsx) o irmão direto
 * resolve; depois de `tsc` o arquivo continua só na árvore de fontes, então o
 * segundo candidato sobe de `server/dist/server/src/db` até `server/src/db`.
 */
function readSchemaSql(): string {
  const candidates = [
    path.join(here, 'schema.sql'),
    path.resolve(here, '../../../..', 'src/db/schema.sql')
  ];
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) {
    throw new Error(`schema.sql não encontrado. Procurado em: ${candidates.join(', ')}`);
  }
  return fs.readFileSync(found, 'utf8');
}

/**
 * Migrações versionadas por `PRAGMA user_version`, sempre aditivas. Cada entrada
 * roda uma única vez, em ordem, dentro de uma transação.
 */
export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'initial-schema',
    apply(db) {
      db.exec(readSchemaSql());
    }
  },
  {
    version: 2,
    name: 'preferences',
    apply(db) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS preferences (
          key        TEXT PRIMARY KEY,
          value      TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
    }
  },
  {
    // Pontos do bloco: o checklist que aparece no Palco conforme a live anda.
    // Mesmo desenho de dono duplo dos anexos, para o Acervo guardar os pontos
    // junto com o bloco promovido.
    version: 3,
    name: 'beats',
    apply(db) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS beats (
          id              TEXT PRIMARY KEY,
          block_id        TEXT REFERENCES blocks(id) ON DELETE CASCADE,
          library_item_id TEXT REFERENCES library_items(id) ON DELETE CASCADE,
          text            TEXT NOT NULL,
          image_path      TEXT NOT NULL DEFAULT '',
          done            INTEGER NOT NULL DEFAULT 0,
          position        INTEGER NOT NULL DEFAULT 0,
          -- Um ponto pertence a um bloco ou a um item do acervo, nunca aos dois.
          CHECK ((block_id IS NOT NULL) <> (library_item_id IS NOT NULL))
        );

        CREATE INDEX IF NOT EXISTS idx_beats_block ON beats(block_id, position);
        CREATE INDEX IF NOT EXISTS idx_beats_library_item ON beats(library_item_id, position);
      `);
    }
  },
  {
    // Sub-pontos: o ponto ganha nível (0, 1 ou 2). A árvore mora na lista plana
    // — o pai é o ponto anterior mais próximo com nível menor —, então nada de
    // chave estrangeira nova nem risco de órfão. Aditiva: ponto já gravado
    // nasce no nível 0 e a leitura antiga continua idêntica.
    version: 4,
    name: 'beat-depth',
    apply(db) {
      // `ADD COLUMN` não tem `IF NOT EXISTS` no SQLite, e as migrações daqui
      // precisam aguentar rodar de novo sobre um banco que já as tem — é o que
      // acontece quando o `user_version` volta atrás. O PRAGMA faz o papel.
      const columns = db.all<{ name: string }>('PRAGMA table_info(beats)');
      if (columns.some((column) => column.name === 'depth')) return;
      db.exec(`ALTER TABLE beats ADD COLUMN depth INTEGER NOT NULL DEFAULT 0;`);
    }
  },
  {
    // Classificação de tipo (Pauta / Apresentação / Evento) e fixação (pin) de pauta.
    // Aditiva e idempotente com PRAGMA table_info(rundowns).
    version: 5,
    name: 'rundown-kind-and-pinned',
    apply(db) {
      const columns = db.all<{ name: string }>('PRAGMA table_info(rundowns)');
      if (!columns.some((c) => c.name === 'kind')) {
        db.exec(`ALTER TABLE rundowns ADD COLUMN kind TEXT NOT NULL DEFAULT 'rundown';`);
      }
      if (!columns.some((c) => c.name === 'pinned')) {
        db.exec(`ALTER TABLE rundowns ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0;`);
      }
    }
  }
];

export const LATEST_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;

/**
 * Cópia do banco antes de aplicar migração nova — caminho de recuperação do
 * plano. O checkpoint vem antes da cópia: sem ele o `.bak` seria o banco do
 * último checkpoint, e não o banco de agora.
 */
function backupBeforeMigrating(db: Database, databasePath: string | null): void {
  if (!databasePath || !fs.existsSync(databasePath)) return;
  db.checkpoint();
  fs.copyFileSync(databasePath, `${databasePath}.bak`);
}

export function runMigrations(db: Database, databasePath: string | null = null): number {
  const current = db.userVersion();
  const pending = MIGRATIONS.filter((migration) => migration.version > current);
  if (!pending.length) return current;

  backupBeforeMigrating(db, databasePath);
  for (const migration of pending) {
    db.transaction(() => {
      migration.apply(db);
      db.setUserVersion(migration.version);
    })();
  }
  return db.userVersion();
}

/**
 * `run_cuts` continua na lista porque continua no disco: as migrações são só
 * aditivas, e o produto simplesmente parou de escrever nela quando os trechos
 * para corte saíram do produto.
 */
export const EXPECTED_TABLES = [
  'rundowns',
  'library_items',
  'blocks',
  'attachments',
  'beats',
  'runs',
  'run_steps',
  'run_cuts',
  'preferences'
] as const;
