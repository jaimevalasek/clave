/**
 * Timecode em mono, usado pelo Palco e pelo relatório: `MM:SS` até 59:59 e
 * `H:MM:SS` a partir de uma hora de live. É sempre tempo relativo à execução —
 * o Clave não tenta adivinhar em que segundo da gravação a pauta começou.
 */
export function formatTimecode(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  return hours ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Minutos arredondados para cima — o "faltam X min" nunca promete tempo que não existe. */
export function minutesFromSeconds(seconds: number): number {
  return Math.ceil(Math.max(0, seconds) / 60);
}
