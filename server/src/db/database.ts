import fs from 'node:fs';
import BetterSqlite3 from 'better-sqlite3';
import { databaseFile, ensureDataDirs } from './paths.js';

export type SqlParam = string | number | boolean | null | undefined;

/**
 * Superfície síncrona única de acesso ao banco. Todo repositório fala só com esta
 * interface: trocar o motor (por exemplo para `node:sqlite`, também síncrono e do
 * mesmo dialeto) mexe apenas no `import` e em `openDatabase` abaixo.
 */
export interface Database {
  run(sql: string, params?: SqlParam[]): void;
  get<T>(sql: string, params?: SqlParam[]): T | undefined;
  all<T>(sql: string, params?: SqlParam[]): T[];
  exec(sql: string): void;
  transaction<T>(fn: () => T): () => T;
  userVersion(): number;
  setUserVersion(version: number): void;
  /** Descarrega o WAL no arquivo principal. Ver `checkpoint` em `openDatabase`. */
  checkpoint(): void;
  close(): void;
}

/** better-sqlite3 aceita apenas string/number/bigint/buffer/null nos binds. */
function normalize(params: SqlParam[]): (string | number | null)[] {
  return params.map((value) => {
    if (value === undefined || value === null) return null;
    if (typeof value === 'boolean') return value ? 1 : 0;
    return value;
  });
}

export function openDatabase(file: string): Database {
  const handle = new BetterSqlite3(file);
  handle.pragma('journal_mode = WAL');
  handle.pragma('synchronous = NORMAL');
  handle.pragma('busy_timeout = 5000');
  handle.pragma('foreign_keys = ON');

  return {
    run(sql, params = []) {
      handle.prepare(sql).run(...normalize(params));
    },
    get<T>(sql: string, params: SqlParam[] = []) {
      return handle.prepare(sql).get(...normalize(params)) as T | undefined;
    },
    all<T>(sql: string, params: SqlParam[] = []) {
      return handle.prepare(sql).all(...normalize(params)) as T[];
    },
    exec(sql) {
      handle.exec(sql);
    },
    transaction<T>(fn: () => T) {
      return handle.transaction(fn) as () => T;
    },
    userVersion() {
      return handle.pragma('user_version', { simple: true }) as number;
    },
    setUserVersion(version) {
      handle.pragma(`user_version = ${Number(version)}`);
    },
    /**
     * Em WAL, o arquivo `.db` sozinho é o banco do último checkpoint: copiá-lo
     * sem descarregar o `-wal` produz uma cópia que perde tudo o que foi escrito
     * desde então. A migração chama isto antes de tirar o backup.
     */
    checkpoint() {
      handle.pragma('wal_checkpoint(TRUNCATE)');
    },
    close() {
      handle.close();
    }
  };
}

let shared: Database | null = null;

/** Banco do app, em `AIOSON_APP_DIR/data/clave.db`. Aberto uma vez por processo. */
export function db(): Database {
  if (!shared) {
    ensureDataDirs();
    shared = openDatabase(databaseFile());
  }
  return shared;
}

export function closeDatabase(): void {
  shared?.close();
  shared = null;
}

/** Banco descartável em memória, usado pelos testes e pelo migrate-check. */
export function openMemoryDatabase(): Database {
  return openDatabase(':memory:');
}

export function databaseExists(): boolean {
  return fs.existsSync(databaseFile());
}
