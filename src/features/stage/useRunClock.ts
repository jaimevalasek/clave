import { useEffect, useState } from 'react';
import type { Run } from '../../../shared/types';

export interface RunClock {
  /** Segundos desde que a execução entrou no ar. */
  elapsedSeconds: number;
  /** Segundos no bloco que está no ar. */
  blockSeconds: number;
  /** Previsto do bloco atual, em segundos. */
  plannedSeconds: number;
  /** O bloco passou do previsto: sinalizado sem esconder o timecode. */
  overrun: boolean;
}

/**
 * Os dois cronômetros correm juntos, atualizados a cada segundo — nunca por
 * frame. O relógio sai do `startedAt` gravado, então recarregar o app não zera
 * a live.
 */
export function useRunClock(run: Run | null): RunClock {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!run || run.endedAt) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [run?.id, run?.endedAt]);

  if (!run) {
    return { elapsedSeconds: 0, blockSeconds: 0, plannedSeconds: 0, overrun: false };
  }

  const startedAt = new Date(run.startedAt).getTime();
  const endedAt = run.endedAt ? new Date(run.endedAt).getTime() : now;
  const elapsedSeconds = Math.max(0, Math.round((endedAt - startedAt) / 1000));

  const current = run.steps[run.steps.length - 1];
  const blockSeconds = current ? Math.max(0, elapsedSeconds - current.startOffsetSeconds) : 0;
  const plannedSeconds = current?.plannedSeconds ?? 0;

  return {
    elapsedSeconds,
    blockSeconds,
    plannedSeconds,
    overrun: plannedSeconds > 0 && blockSeconds > plannedSeconds
  };
}
