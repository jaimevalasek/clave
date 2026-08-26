import { describe, expect, it } from 'vitest';
import {
  localMediaUrl,
  resolveFileSource,
  resolveVideoSource
} from '../../src/features/attachments/videoSource';

describe('AC-clave-25 — o vídeo aceita arquivo local e URL web/YouTube', () => {
  it('caminho relativo vira URL same-origin da pasta de mídia do app', () => {
    expect(resolveVideoSource('curva-ao-vivo.webm')).toEqual({
      kind: 'local',
      url: '/api/media/curva-ao-vivo.webm'
    });
  });

  it('nome com espaço e acento é codificado sem quebrar o caminho', () => {
    expect(localMediaUrl('demo do estúdio.mp4')).toBe('/api/media/demo%20do%20est%C3%BAdio.mp4');
  });

  it('URL direta na web é usada como está', () => {
    const source = resolveVideoSource('https://exemplo.test/video.mp4');
    expect(source).toMatchObject({ kind: 'web', url: 'https://exemplo.test/video.mp4' });
  });

  it('reconhece as formas do YouTube e devolve o embed', () => {
    const cases = [
      'https://youtube.com/watch?v=clave123',
      'https://www.youtube.com/watch?v=clave123&t=30s',
      'https://youtu.be/clave123',
      'https://www.youtube.com/embed/clave123',
      'https://www.youtube.com/shorts/clave123'
    ];
    for (const raw of cases) {
      const source = resolveVideoSource(raw);
      expect(source, raw).toMatchObject({
        kind: 'youtube',
        videoId: 'clave123',
        url: 'https://www.youtube-nocookie.com/embed/clave123'
      });
    }
  });

  it('caminho vazio e URL malformada não viram origem válida', () => {
    expect(resolveVideoSource('')).toEqual({ kind: 'unknown' });
    expect(resolveVideoSource('   ')).toEqual({ kind: 'unknown' });
    expect(resolveVideoSource('http://')).toEqual({ kind: 'unknown' });
  });

  it('imagem e arquivo seguem a mesma regra, sem o caso do YouTube', () => {
    expect(resolveFileSource('print.png')).toEqual({ kind: 'local', url: '/api/media/print.png' });
    expect(resolveFileSource('https://youtu.be/clave123')).toMatchObject({ kind: 'web' });
  });
});
