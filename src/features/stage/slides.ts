/**
 * Páginas de anexo do bloco no ar. O avanço do Palco percorre estes índices
 * depois dos pontos e antes de trocar de bloco.
 */

export type SlideLanding = 'start' | 'end';

/** Próxima página. `null` significa: saia do bloco. */
export function nextSlideIndex(index: number, count: number): number | null {
  if (count <= 0) return null;
  if (index < count - 1) return index + 1;
  return null;
}

/** Página anterior. `null` significa: volte aos pontos ou ao bloco anterior. */
export function previousSlideIndex(index: number): number | null {
  return index > 0 ? index - 1 : null;
}

/** Página em que o bloco deve abrir, conforme o sentido da condução. */
export function landingSlideIndex(count: number, from: SlideLanding): number {
  if (count <= 0) return 0;
  return from === 'end' ? count - 1 : 0;
}
