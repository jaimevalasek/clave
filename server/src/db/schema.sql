-- Schema inicial do Clave (migração 1). Apenas aditivo: novas migrações
-- acrescentam colunas/tabelas, nunca reescrevem estas.

CREATE TABLE IF NOT EXISTS rundowns (
  id             TEXT PRIMARY KEY,
  title          TEXT NOT NULL,
  date           TEXT NOT NULL,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL,
  last_opened_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS library_items (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  type          TEXT NOT NULL,
  air_count     INTEGER NOT NULL DEFAULT 0,
  last_aired_on TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS blocks (
  id               TEXT PRIMARY KEY,
  rundown_id       TEXT NOT NULL REFERENCES rundowns(id) ON DELETE CASCADE,
  type             TEXT NOT NULL,
  title            TEXT NOT NULL,
  note             TEXT NOT NULL DEFAULT '',
  energy           INTEGER NOT NULL,
  duration_minutes INTEGER NOT NULL,
  position         INTEGER,
  library_item_id  TEXT REFERENCES library_items(id) ON DELETE SET NULL,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL,
  -- Invariante da fonte: resgate fica fora do trilho; os demais tipos sempre têm posição.
  CHECK ((type = 'rescue' AND position IS NULL) OR (type <> 'rescue' AND position IS NOT NULL)),
  CHECK (energy BETWEEN 1 AND 5),
  CHECK (duration_minutes BETWEEN 1 AND 600)
);

CREATE INDEX IF NOT EXISTS idx_blocks_rundown ON blocks(rundown_id);

CREATE TABLE IF NOT EXISTS attachments (
  id              TEXT PRIMARY KEY,
  block_id        TEXT REFERENCES blocks(id) ON DELETE CASCADE,
  library_item_id TEXT REFERENCES library_items(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,
  label           TEXT NOT NULL,
  path            TEXT NOT NULL DEFAULT '',
  content         TEXT NOT NULL DEFAULT '',
  fullscreen      INTEGER NOT NULL DEFAULT 0,
  position        INTEGER NOT NULL DEFAULT 0,
  -- Um anexo pertence a um bloco ou a um item do acervo, nunca aos dois.
  CHECK ((block_id IS NOT NULL) <> (library_item_id IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_attachments_block ON attachments(block_id);
CREATE INDEX IF NOT EXISTS idx_attachments_library_item ON attachments(library_item_id);

CREATE TABLE IF NOT EXISTS runs (
  id            TEXT PRIMARY KEY,
  -- Apagar a pauta não apaga o relatório: o trajeto gravado é preservado.
  rundown_id    TEXT REFERENCES rundowns(id) ON DELETE SET NULL,
  rundown_title TEXT NOT NULL,
  started_at    TEXT NOT NULL,
  ended_at      TEXT
);

CREATE INDEX IF NOT EXISTS idx_runs_rundown ON runs(rundown_id);

CREATE TABLE IF NOT EXISTS run_steps (
  id                    TEXT PRIMARY KEY,
  run_id                TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  -- Sem chave estrangeira de propósito (AC-clave-47): excluir o bloco não pode
  -- apagar nem corromper o passo já registrado.
  block_id              TEXT,
  block_title           TEXT NOT NULL,
  block_type            TEXT NOT NULL,
  library_item_id       TEXT,
  start_offset_seconds  INTEGER NOT NULL,
  actual_seconds        INTEGER,
  planned_seconds       INTEGER NOT NULL,
  was_rescue            INTEGER NOT NULL DEFAULT 0,
  sequence              INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_run_steps_run ON run_steps(run_id, sequence);

CREATE TABLE IF NOT EXISTS run_cuts (
  id            TEXT PRIMARY KEY,
  run_id        TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  label         TEXT NOT NULL,
  start_seconds INTEGER NOT NULL,
  end_seconds   INTEGER
);

CREATE INDEX IF NOT EXISTS idx_run_cuts_run ON run_cuts(run_id, start_seconds);
