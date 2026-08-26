import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDatabase } from '../../server/src/db/database.js';
import { EXPECTED_TABLES, LATEST_VERSION, runMigrations } from '../../server/src/db/migrations.js';
import { insertRundown, listRundowns } from '../../server/src/repositories/rundownRepository.js';

const temporaryDirs: string[] = [];

function temporaryDatabaseFile(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'clave-persist-'));
  temporaryDirs.push(dir);
  return path.join(dir, 'clave.db');
}

afterEach(() => {
  while (temporaryDirs.length) {
    fs.rmSync(temporaryDirs.pop() as string, { recursive: true, force: true });
  }
});

describe('AC-clave-40 — os dados vivem em disco', () => {
  it('cria as tabelas do produto e marca a versão do schema', () => {
    const file = temporaryDatabaseFile();
    const db = openDatabase(file);
    const version = runMigrations(db, file);

    expect(version).toBe(LATEST_VERSION);
    const tables = db
      .all<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table'")
      .map((row) => row.name);
    for (const table of EXPECTED_TABLES) {
      expect(tables, `tabela ${table}`).toContain(table);
    }
    db.close();
  });

  it('a pauta gravada continua lá depois de fechar e reabrir o banco', () => {
    const file = temporaryDatabaseFile();
    const first = openDatabase(file);
    runMigrations(first, file);
    const created = insertRundown(first, { title: 'Live #99', date: '2026-08-18' }, new Date().toISOString());
    first.close();

    const second = openDatabase(file);
    const rundowns = listRundowns(second);
    expect(rundowns.map((rundown) => rundown.id)).toContain(created.id);
    expect(rundowns[0].title).toBe('Live #99');
    second.close();
  });

  it('migrar de novo é idempotente e não reescreve o que já existe', () => {
    const file = temporaryDatabaseFile();
    const db = openDatabase(file);
    runMigrations(db, file);
    insertRundown(db, { title: 'Live #100', date: '2026-08-18' }, new Date().toISOString());

    const version = runMigrations(db, file);
    expect(version).toBe(LATEST_VERSION);
    expect(listRundowns(db)).toHaveLength(1);
    db.close();
  });

  it('guarda cópia do banco antes de aplicar migração nova', () => {
    const file = temporaryDatabaseFile();
    const db = openDatabase(file);
    runMigrations(db, file);
    db.close();
    // A primeira migração roda sobre um arquivo recém-criado; a cópia existe a
    // partir do momento em que há banco no disco para preservar.
    const second = openDatabase(file);
    second.setUserVersion(0);
    runMigrations(second, file);
    second.close();
    expect(fs.existsSync(`${file}.bak`)).toBe(true);
  });
});

describe('invariantes do domínio guardadas pelo próprio banco', () => {
  it('rejeita bloco de resgate com posição no trilho', () => {
    const file = temporaryDatabaseFile();
    const db = openDatabase(file);
    runMigrations(db, file);
    const rundown = insertRundown(db, { title: 'Live', date: '2026-08-18' }, new Date().toISOString());

    expect(() =>
      db.run(
        `INSERT INTO blocks (id, rundown_id, type, title, note, energy, duration_minutes, position,
                             library_item_id, created_at, updated_at)
         VALUES ('x', ?, 'rescue', 'Resgate no trilho', '', 3, 5, 0, NULL, '', '')`,
        [rundown.id]
      )
    ).toThrow();
    db.close();
  });

  it('rejeita bloco do trilho sem posição', () => {
    const file = temporaryDatabaseFile();
    const db = openDatabase(file);
    runMigrations(db, file);
    const rundown = insertRundown(db, { title: 'Live', date: '2026-08-18' }, new Date().toISOString());

    expect(() =>
      db.run(
        `INSERT INTO blocks (id, rundown_id, type, title, note, energy, duration_minutes, position,
                             library_item_id, created_at, updated_at)
         VALUES ('y', ?, 'topic', 'Tema sem posição', '', 3, 5, NULL, NULL, '', '')`,
        [rundown.id]
      )
    ).toThrow();
    db.close();
  });
});
