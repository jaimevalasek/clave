import type { Database } from '../db/database.js';
import { notFound } from '../http/errors.js';
import type { BlockType, Run } from '../../../shared/types.js';
import { findRun } from '../repositories/runRepository.js';

export interface ReportLine {
  stepId: string;
  blockTitle: string;
  blockType: BlockType;
  startOffsetSeconds: number;
  plannedSeconds: number;
  actualSeconds: number;
  /** Positivo estourou o previsto; negativo encolheu. */
  deltaSeconds: number;
  wasRescue: boolean;
}

export interface Report {
  run: Run;
  lines: ReportLine[];
  totals: {
    plannedSeconds: number;
    actualSeconds: number;
    deltaSeconds: number;
    rescueCount: number;
  };
}

/**
 * O relatório é montado a partir dos passos gravados, nunca relendo o bloco
 * atual: o snapshot sobrevive à edição e à exclusão do bloco. Ele responde uma
 * pergunta só — quanto tempo cada assunto levou contra o que estava previsto.
 * O tempo é relativo à execução, então nada aqui vira timecode do vídeo.
 */
export function build(db: Database, runId: string): Report {
  const run = findRun(db, runId);
  if (!run) throw notFound('Relatório não encontrado: esta execução não existe.');

  const lines: ReportLine[] = run.steps.map((step) => {
    const actual = step.actualSeconds ?? 0;
    return {
      stepId: step.id,
      blockTitle: step.blockTitle,
      blockType: step.blockType,
      startOffsetSeconds: step.startOffsetSeconds,
      plannedSeconds: step.plannedSeconds,
      actualSeconds: actual,
      deltaSeconds: actual - step.plannedSeconds,
      wasRescue: step.wasRescue
    };
  });

  const plannedSeconds = lines.reduce((total, line) => total + line.plannedSeconds, 0);
  const actualSeconds = lines.reduce((total, line) => total + line.actualSeconds, 0);

  return {
    run,
    lines,
    totals: {
      plannedSeconds,
      actualSeconds,
      deltaSeconds: actualSeconds - plannedSeconds,
      rescueCount: lines.filter((line) => line.wasRescue).length
    }
  };
}
