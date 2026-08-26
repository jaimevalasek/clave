import { describe, expect, it } from 'vitest';
import { formatTimecode, minutesFromSeconds } from '../../shared/time';

describe('AC-clave-29 — o tempo do Palco e do relatório é sempre relativo à execução', () => {
  it('usa MM:SS até 59:59', () => {
    expect(formatTimecode(0)).toBe('00:00');
    expect(formatTimecode(7)).toBe('00:07');
    expect(formatTimecode(65)).toBe('01:05');
    expect(formatTimecode(3599)).toBe('59:59');
  });

  it('passa a H:MM:SS a partir de uma hora', () => {
    expect(formatTimecode(3600)).toBe('1:00:00');
    expect(formatTimecode(3725)).toBe('1:02:05');
    expect(formatTimecode(7322)).toBe('2:02:02');
  });

  it('arredonda os segundos e nunca devolve tempo negativo', () => {
    expect(formatTimecode(64.6)).toBe('01:05');
    expect(formatTimecode(-30)).toBe('00:00');
  });
});

describe('AC-clave-30 — "quanto falta" não promete tempo que não existe', () => {
  it('arredonda os minutos para cima', () => {
    expect(minutesFromSeconds(0)).toBe(0);
    expect(minutesFromSeconds(1)).toBe(1);
    expect(minutesFromSeconds(60)).toBe(1);
    expect(minutesFromSeconds(61)).toBe(2);
    expect(minutesFromSeconds(599)).toBe(10);
  });

  it('trata tempo negativo como pauta já vencida', () => {
    expect(minutesFromSeconds(-120)).toBe(0);
  });
});
