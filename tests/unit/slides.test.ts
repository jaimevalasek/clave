import { describe, expect, it } from 'vitest';
import { landingSlideIndex, nextSlideIndex, previousSlideIndex } from '../../src/features/stage/slides';

describe('páginas de anexo no Palco', () => {
  it('avança até a última página e depois sinaliza saída', () => {
    expect(nextSlideIndex(0, 3)).toBe(1);
    expect(nextSlideIndex(1, 3)).toBe(2);
    expect(nextSlideIndex(2, 3)).toBeNull();
  });

  it('bloco sem anexo não tem página para avançar', () => {
    expect(nextSlideIndex(0, 0)).toBeNull();
  });

  it('voltar na primeira página sinaliza saída para os pontos', () => {
    expect(previousSlideIndex(2)).toBe(1);
    expect(previousSlideIndex(0)).toBeNull();
  });

  it('entrar pelo avanço abre a primeira; voltar de bloco abre a última', () => {
    expect(landingSlideIndex(3, 'start')).toBe(0);
    expect(landingSlideIndex(3, 'end')).toBe(2);
    expect(landingSlideIndex(0, 'end')).toBe(0);
  });
});
