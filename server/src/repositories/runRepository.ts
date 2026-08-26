import { randomUUID } from 'node:crypto';
import type { Database } from '../db/database.js';
import type { BlockType, Run, RunStep } from '../../../shared/types.js';

interface RunRow {
  id: string;
  rundown_id: string | null;
  rundown_title: string;
  started_at: string;
  ended_at: string | null;
}

interface StepRow {
  id: string;
  run_id: string;
  block_id: string | null;
  block_title: string;
  block_type: string;
  library_item_id: string | null;
  start_offset_seconds: number;
  actual_seconds: number | null;
  planned_seconds: number;
  was_rescue: number;
  sequence: number;
}

function toStep(row: StepRow): RunStep {
  return {
    id: row.id,
    runId: row.run_id,
    blockId: row.block_id,
    blockTitle: row.block_title,
    blockType: row.block_type as BlockType,
    libraryItemId: row.library_item_id,
    startOffsetSeconds: row.start_offset_seconds,
    actualSeconds: row.actual_seconds,
    plannedSeconds: row.planned_seconds,
    wasRescue: row.was_rescue === 1,
    sequence: row.sequence
  };
}

export function listSteps(db: Database, runId: string): RunStep[] {
  return db
    .all<StepRow>('SELECT * FROM run_steps WHERE run_id = ? ORDER BY sequence', [runId])
    .map(toStep);
}

function hydrate(db: Database, row: RunRow): Run {
  return {
    id: row.id,
    rundownId: row.rundown_id,
    rundownTitle: row.rundown_title,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    steps: listSteps(db, row.id)
  };
}

export function findRun(db: Database, id: string): Run | null {
  const row = db.get<RunRow>('SELECT * FROM runs WHERE id = ?', [id]);
  return row ? hydrate(db, row) : null;
}

/** A execução em aberto de uma pauta: a que ainda não tem fim gravado. */
export function findOpenRun(db: Database, rundownId: string): Run | null {
  const row = db.get<RunRow>(
    'SELECT * FROM runs WHERE rundown_id = ? AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1',
    [rundownId]
  );
  return row ? hydrate(db, row) : null;
}

export function insertRun(
  db: Database,
  rundownId: string,
  rundownTitle: string,
  startedAt: string
): string {
  const id = randomUUID();
  db.run(
    'INSERT INTO runs (id, rundown_id, rundown_title, started_at, ended_at) VALUES (?, ?, ?, ?, NULL)',
    [id, rundownId, rundownTitle, startedAt]
  );
  return id;
}

export function finishRun(db: Database, runId: string, endedAt: string): void {
  db.run('UPDATE runs SET ended_at = ? WHERE id = ?', [endedAt, runId]);
}

export interface StepWrite {
  blockId: string;
  blockTitle: string;
  blockType: BlockType;
  libraryItemId: string | null;
  startOffsetSeconds: number;
  plannedSeconds: number;
  wasRescue: boolean;
}

export function insertStep(db: Database, runId: string, input: StepWrite, sequence: number): string {
  const id = randomUUID();
  db.run(
    `INSERT INTO run_steps (id, run_id, block_id, block_title, block_type, library_item_id,
                            start_offset_seconds, actual_seconds, planned_seconds, was_rescue, sequence)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)`,
    [
      id,
      runId,
      input.blockId,
      input.blockTitle,
      input.blockType,
      input.libraryItemId,
      input.startOffsetSeconds,
      input.plannedSeconds,
      input.wasRescue,
      sequence
    ]
  );
  return id;
}

/** Fecha o passo ainda aberto do trajeto com a duração real medida. */
export function closeOpenStep(db: Database, runId: string, elapsedSeconds: number): void {
  const open = db.get<StepRow>(
    'SELECT * FROM run_steps WHERE run_id = ? AND actual_seconds IS NULL ORDER BY sequence DESC LIMIT 1',
    [runId]
  );
  if (!open) return;
  const duration = Math.max(0, elapsedSeconds - open.start_offset_seconds);
  db.run('UPDATE run_steps SET actual_seconds = ? WHERE id = ?', [duration, open.id]);
}

export function nextSequence(db: Database, runId: string): number {
  const row = db.get<{ total: number }>('SELECT COUNT(*) AS total FROM run_steps WHERE run_id = ?', [
    runId
  ]);
  return row?.total ?? 0;
}
