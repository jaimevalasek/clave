import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDatabase } from '../../server/src/db/database.js';
import type { Database } from '../../server/src/db/database.js';
import { LATEST_VERSION, MIGRATIONS, runMigrations } from '../../server/src/db/migrations.js';
import { listRundowns, insertRundown } from '../../server/src/repositories/rundownRepository.js';
import { listSheetBlocks } from '../../server/src/repositories/sheetRepository.js';

const temporaryDirs: string[] = [];

function temporaryDatabaseFile(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'clave-legacy-'));
  temporaryDirs.push(dir);
  return path.join(dir, 'clave.db');
}

afterEach(() => {
  while (temporaryDirs.length) {
    fs.rmSync(temporaryDirs.pop() as string, { recursive: true, force: true });
  }
});

/** Brings a fresh database to v5, the last schema of the previous app version. */
function migrateToV5(db: Database): void {
  for (const migration of MIGRATIONS.filter((entry) => entry.version <= 5)) {
    db.transaction(() => {
      migration.apply(db);
      db.setUserVersion(migration.version);
    })();
  }
}

const NOW = '2026-09-01T10:00:00.000Z';

function insertBlock(
  db: Database,
  id: string,
  rundownId: string,
  type: string,
  title: string,
  position: number | null,
  createdAt = NOW
) {
  db.run(
    `INSERT INTO blocks (id, rundown_id, type, title, note, energy, duration_minutes, position,
                         library_item_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'nota privada', 3, 5, ?, NULL, ?, ?)`,
    [id, rundownId, type, title, position, createdAt, createdAt]
  );
}

function insertBeat(db: Database, id: string, blockId: string, text: string, position: number, depth = 0, image = '') {
  db.run(
    `INSERT INTO beats (id, block_id, library_item_id, text, image_path, done, depth, position)
     VALUES (?, ?, NULL, ?, ?, 1, ?, ?)`,
    [id, blockId, text, image, depth, position]
  );
}

function insertAttachment(
  db: Database,
  id: string,
  blockId: string,
  type: string,
  label: string,
  position: number,
  pathValue = '',
  content = ''
) {
  db.run(
    `INSERT INTO attachments (id, block_id, library_item_id, type, label, path, content, fullscreen, position)
     VALUES (?, ?, NULL, ?, ?, ?, ?, 0, ?)`,
    [id, blockId, type, label, pathValue, content, position]
  );
}

function insertRundownRow(db: Database, id: string, title: string) {
  db.run(
    `INSERT INTO rundowns (id, title, date, created_at, updated_at, last_opened_at)
     VALUES (?, ?, '2026-09-01', ?, ?, ?)`,
    [id, title, NOW, NOW, NOW]
  );
}

/** A v5 database with every shape of legacy content the conversion handles. */
function seedLegacy(db: Database): void {
  insertRundownRow(db, 'r1', 'Live antiga');
  insertBlock(db, 'b1', 'r1', 'topic', 'Abertura', 0);
  insertBeat(db, 'p1', 'b1', 'ponto A', 0, 0, 'img-a.png');
  insertBeat(db, 'p2', 'b1', 'sub-ponto', 1, 1);
  insertBeat(db, 'p3', 'b1', 'neto', 2, 2);
  insertAttachment(db, 'a1', 'b1', 'image', 'Foto', 0, 'foto.png');
  insertAttachment(db, 'a2', 'b1', 'video', '', 1, 'clip.mp4');
  insertAttachment(db, 'a3', 'b1', 'video', 'YouTube', 2, 'https://youtu.be/xyz');
  insertAttachment(db, 'a4', 'b1', 'link', 'Site', 3, 'https://exemplo.com');
  insertAttachment(db, 'a5', 'b1', 'code', 'Trecho', 4, '', 'console.log(1)');
  insertAttachment(db, 'a6', 'b1', 'chat', 'Mensagem', 5, '', 'Olá, chat!');
  insertAttachment(db, 'a7', 'b1', 'file', 'Planilha', 6, 'planilha.xlsx');
  insertBlock(db, 'b2', 'r1', 'media', 'Desenvolvimento', 1);
  insertBeat(db, 'p4', 'b2', 'ponto B', 0, 0, 'https://imagens.com/a.png');
  insertBlock(db, 'b3', 'r1', 'rescue', 'Resgate guardado', null);

  insertRundownRow(db, 'r2', 'Só resgate');
  insertBlock(db, 'b4', 'r2', 'rescue', 'Primeiro resgate', null, '2026-09-01T10:00:00.000Z');
  insertBlock(db, 'b5', 'r2', 'rescue', 'Segundo resgate', null, '2026-09-01T11:00:00.000Z');

  insertRundownRow(db, 'r3', 'Pauta antiga vazia');

  db.run(
    `INSERT INTO runs (id, rundown_id, rundown_title, started_at, ended_at)
     VALUES ('run1', 'r1', 'Live antiga', ?, ?)`,
    [NOW, NOW]
  );
  db.run(
    `INSERT INTO library_items (id, title, type, air_count, created_at, updated_at)
     VALUES ('lib1', 'Bloco do acervo', 'topic', 2, ?, ?)`,
    [NOW, NOW]
  );
}

function summary(blocks: ReturnType<typeof listSheetBlocks>) {
  return blocks.map((block) => ({
    kind: block.kind,
    depth: block.depth,
    text: block.content.map((run) => run.text).join(''),
    mediaPath: block.mediaPath,
    mediaName: block.mediaName,
    size: block.size
  }));
}

describe('AC-pauta-revelavel-47 — legacy rundowns become revealable sheets', () => {
  it('AC-pauta-revelavel-47 converts titles, beats, beat images and attachments in order, with rescue blocks last', () => {
    const file = temporaryDatabaseFile();
    const db = openDatabase(file);
    migrateToV5(db);
    seedLegacy(db);

    expect(runMigrations(db, file)).toBe(LATEST_VERSION);

    expect(summary(listSheetBlocks(db, 'r1'))).toEqual([
      { kind: 'text', depth: 0, text: 'Abertura', mediaPath: '', mediaName: '', size: 'medium' },
      { kind: 'text', depth: 1, text: 'ponto A', mediaPath: '', mediaName: '', size: 'small' },
      { kind: 'image', depth: 1, text: '', mediaPath: 'img-a.png', mediaName: 'img-a.png', size: 'medium' },
      { kind: 'text', depth: 2, text: 'sub-ponto', mediaPath: '', mediaName: '', size: 'small' },
      { kind: 'text', depth: 2, text: 'neto', mediaPath: '', mediaName: '', size: 'small' },
      { kind: 'image', depth: 1, text: '', mediaPath: 'foto.png', mediaName: 'Foto', size: 'medium' },
      { kind: 'video', depth: 1, text: '', mediaPath: 'clip.mp4', mediaName: 'clip.mp4', size: 'medium' },
      { kind: 'text', depth: 1, text: 'https://youtu.be/xyz', mediaPath: '', mediaName: '', size: 'small' },
      { kind: 'text', depth: 1, text: 'https://exemplo.com', mediaPath: '', mediaName: '', size: 'small' },
      { kind: 'text', depth: 1, text: 'console.log(1)', mediaPath: '', mediaName: '', size: 'small' },
      { kind: 'text', depth: 1, text: 'Olá, chat!', mediaPath: '', mediaName: '', size: 'small' },
      { kind: 'text', depth: 1, text: 'Planilha', mediaPath: '', mediaName: '', size: 'small' },
      { kind: 'text', depth: 0, text: 'Desenvolvimento', mediaPath: '', mediaName: '', size: 'medium' },
      { kind: 'text', depth: 1, text: 'ponto B', mediaPath: '', mediaName: '', size: 'small' },
      { kind: 'text', depth: 1, text: 'https://imagens.com/a.png', mediaPath: '', mediaName: '', size: 'small' },
      { kind: 'text', depth: 0, text: 'Resgate guardado', mediaPath: '', mediaName: '', size: 'medium' }
    ]);
    db.close();
  });

  it('AC-pauta-revelavel-47 starts every converted block hidden, with no take progress', () => {
    const file = temporaryDatabaseFile();
    const db = openDatabase(file);
    migrateToV5(db);
    seedLegacy(db);
    runMigrations(db, file);

    const blocks = listSheetBlocks(db, 'r1');
    expect(blocks.every((block) => !block.plannedVisible && !block.takeVisible && block.revealStep === null)).toBe(
      true
    );
    db.close();
  });

  it('AC-pauta-revelavel-47 keeps rescue blocks when the track is empty and seals every legacy rundown', () => {
    const file = temporaryDatabaseFile();
    const db = openDatabase(file);
    migrateToV5(db);
    seedLegacy(db);
    runMigrations(db, file);

    expect(summary(listSheetBlocks(db, 'r2')).map((block) => block.text)).toEqual([
      'Primeiro resgate',
      'Segundo resgate'
    ]);
    expect(listSheetBlocks(db, 'r3')).toEqual([]);
    const rows = listRundowns(db);
    expect(rows.map((row) => [row.id, row.legacyImported]).sort()).toEqual([
      ['r1', true],
      ['r2', true],
      ['r3', true]
    ]);
    expect(rows.find((row) => row.id === 'r1')?.blockCount).toBe(16);
    db.close();
  });
});

describe('AC-pauta-revelavel-48 — the migration is backed up, idempotent and additive', () => {
  it('writes a backup that includes the content still pending in the WAL', () => {
    const file = temporaryDatabaseFile();
    const db = openDatabase(file);
    migrateToV5(db);
    seedLegacy(db);
    expect(fs.statSync(`${file}-wal`).size).toBeGreaterThan(0);

    runMigrations(db, file);
    db.close();

    const backup = openDatabase(`${file}.bak`);
    expect(backup.userVersion()).toBe(5);
    expect(backup.get<{ total: number }>('SELECT COUNT(*) AS total FROM rundowns')?.total).toBe(3);
    expect(backup.get<{ total: number }>('SELECT COUNT(*) AS total FROM beats')?.total).toBe(4);
    backup.close();
  });

  it('running the migration twice duplicates nothing and does not seal rundowns created later', () => {
    const file = temporaryDatabaseFile();
    const db = openDatabase(file);
    migrateToV5(db);
    seedLegacy(db);
    runMigrations(db, file);
    const created = insertRundown(db, { title: 'Pauta nova', date: '2026-11-11' }, NOW);
    const before = db.get<{ total: number }>('SELECT COUNT(*) AS total FROM sheet_blocks')?.total;

    db.setUserVersion(5);
    expect(runMigrations(db, file)).toBe(LATEST_VERSION);

    expect(db.get<{ total: number }>('SELECT COUNT(*) AS total FROM sheet_blocks')?.total).toBe(before);
    expect(listRundowns(db).find((row) => row.id === created.id)?.legacyImported).toBe(false);
    db.close();
  });

  it('keeps every legacy table and row on disk', () => {
    const file = temporaryDatabaseFile();
    const db = openDatabase(file);
    migrateToV5(db);
    seedLegacy(db);
    runMigrations(db, file);

    const count = (table: string) => db.get<{ total: number }>(`SELECT COUNT(*) AS total FROM ${table}`)?.total;
    expect(count('blocks')).toBe(5);
    expect(count('beats')).toBe(4);
    expect(count('attachments')).toBe(7);
    expect(count('runs')).toBe(1);
    expect(count('library_items')).toBe(1);
    for (const table of ['run_steps', 'run_cuts']) expect(count(table)).toBe(0);
    expect(db.get<{ note: string }>("SELECT note FROM blocks WHERE id = 'b1'")?.note).toBe('nota privada');
    db.close();
  });

  it('rolls the whole version back when the conversion fails', () => {
    const file = temporaryDatabaseFile();
    const db = openDatabase(file);
    migrateToV5(db);
    seedLegacy(db);
    // A table under the same name without the expected columns makes the insert fail.
    db.exec('CREATE TABLE sheet_blocks (id TEXT PRIMARY KEY)');

    expect(() => runMigrations(db, file)).toThrow();
    expect(db.userVersion()).toBe(5);
    const columns = db.all<{ name: string }>('PRAGMA table_info(rundowns)').map((column) => column.name);
    expect(columns).not.toContain('legacy_imported_at');
    db.close();
  });
});
