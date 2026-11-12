/** Relative edit time of the rundown list ("editada há…"), pt-BR. */
export function editedAgo(iso: string, now: Date = new Date()): string {
  const minutes = Math.round((now.getTime() - new Date(iso).getTime()) / 60_000);
  if (!Number.isFinite(minutes) || minutes < 2) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.round(hours / 24);
  return `há ${days} ${days === 1 ? 'dia' : 'dias'}`;
}

/** Most recently opened rundown: the one the app reopens (AC-pauta-revelavel-01). */
export function lastOpened<T extends { lastOpenedAt: string }>(rundowns: T[]): T | null {
  return rundowns.reduce<T | null>(
    (latest, rundown) => (!latest || rundown.lastOpenedAt > latest.lastOpenedAt ? rundown : latest),
    null
  );
}
