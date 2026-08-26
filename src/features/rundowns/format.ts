/** Formatações de apresentação da lista de pautas — locale pt-BR. */

export function formatBrDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

export function formatMinutes(minutes: number): string {
  if (minutes >= 60) {
    return `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}`;
  }
  return `${minutes} min`;
}

export function daysSince(iso: string, now: Date = new Date()): number {
  const target = new Date(`${iso}T12:00:00`).getTime();
  return Math.max(0, Math.floor((now.getTime() - target) / 86_400_000));
}
