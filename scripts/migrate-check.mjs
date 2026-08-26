// RG-migrate — aplica todas as migrações num banco descartável e confere que as
// tabelas do produto existem. Roda sem tocar o banco real do criador.
//
// O script importa `runMigrations` e `EXPECTED_TABLES` do próprio servidor, em
// vez de repetir a lista aqui: uma cópia local silenciosamente deixaria de
// cobrir a migração seguinte no dia em que ela aparecesse. Por isso roda sob
// `tsx` (`pnpm exec tsx scripts/migrate-check.mjs`).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { openDatabase } from '../server/src/db/database.js';
import { EXPECTED_TABLES, LATEST_VERSION, runMigrations } from '../server/src/db/migrations.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'clave-migrate-'));
const file = path.join(dir, 'clave.db');

try {
  const db = openDatabase(file);
  const version = runMigrations(db, file);

  const found = db
    .all("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    .map((row) => row.name);

  const missing = EXPECTED_TABLES.filter((table) => !found.includes(table));
  if (missing.length) {
    throw new Error(`tabelas ausentes depois da migração: ${missing.join(', ')}`);
  }

  if (version !== LATEST_VERSION) {
    throw new Error(`user_version esperado ${LATEST_VERSION}, obtido ${version}`);
  }

  db.close();
  process.stdout.write(
    `migrate-check OK — schema v${version}, tabelas: ${EXPECTED_TABLES.join(', ')}\n`
  );
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
