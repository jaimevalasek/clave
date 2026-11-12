import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { startTestServer } from '../helpers/testServer';
import type { TestServer } from '../helpers/testServer';
import { MAX_MEDIA_BYTES, MEDIA_EXTENSIONS } from '../../shared/media';

let server: TestServer;

const bytes = (...values: number[]) => Buffer.from(values);
const ascii = (text: string) => Buffer.from(text, 'latin1');

/** The first bytes of a real file of each accepted format (RULE-pauta-revelavel-07). */
const SAMPLES: Record<string, Buffer> = {
  '.png': bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a),
  '.jpg': bytes(0xff, 0xd8, 0xff, 0xe0),
  '.jpeg': bytes(0xff, 0xd8, 0xff, 0xe1),
  '.gif': ascii('GIF89a'),
  '.webp': Buffer.concat([ascii('RIFF'), bytes(0x24, 0, 0, 0), ascii('WEBPVP8 ')]),
  '.mp4': Buffer.concat([bytes(0, 0, 0, 0x20), ascii('ftypisom')]),
  '.m4v': Buffer.concat([bytes(0, 0, 0, 0x20), ascii('ftypM4V ')]),
  '.mov': Buffer.concat([bytes(0, 0, 0, 0x14), ascii('ftypqt  ')]),
  '.webm': bytes(0x1a, 0x45, 0xdf, 0xa3, 0x9f),
  '.mkv': bytes(0x1a, 0x45, 0xdf, 0xa3, 0x93),
  '.mp3': Buffer.concat([ascii('ID3'), bytes(4, 0, 0)]),
  '.wav': Buffer.concat([ascii('RIFF'), bytes(0x24, 0, 0, 0), ascii('WAVEfmt ')])
};

function mediaDir(): string {
  return path.join(process.env.AIOSON_APP_DIR as string, 'data', 'media');
}

async function upload(fileName: string, body: Buffer) {
  const response = await fetch(`${server.url}/api/media`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'x-clave-filename': encodeURIComponent(fileName)
    },
    body: new Uint8Array(body)
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

function leftoverUploads(): string[] {
  return fs.readdirSync(mediaDir()).filter((name) => name.startsWith('.upload-'));
}

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('AC-pauta-revelavel-20 — accepted formats, checked against their signature (RULE-pauta-revelavel-07)', () => {
  it('accepts png, jpg, gif, webp, mp4, m4v, mov, webm, mkv, mp3 and wav', async () => {
    expect(Object.keys(SAMPLES).sort()).toEqual(Object.keys(MEDIA_EXTENSIONS).sort());
    for (const [extension, head] of Object.entries(SAMPLES)) {
      const { status, body } = await upload(`amostra${extension}`, Buffer.concat([head, ascii(' corpo')]));
      expect(status, extension).toBe(201);
      expect(body.media.path, extension).toMatch(new RegExp(`^[0-9a-f-]{36}\\${extension}$`));
    }
  });

  it('accepts an mp3 without an ID3 tag and a QuickTime mov that opens with a moov atom', async () => {
    expect((await upload('quadro.mp3', bytes(0xff, 0xfb, 0x90, 0x64))).status).toBe(201);
    expect((await upload('antigo.mov', Buffer.concat([bytes(0, 0, 0, 0x6c), ascii('moov')]))).status).toBe(201);
  });

  it('refuses a file whose content does not match its extension, and leaves nothing behind', async () => {
    const forged = await upload('mentira.png', ascii('isto não é um PNG'));
    expect(forged.status).toBe(400);
    expect(forged.body.code).toBe('media_signature_mismatch');

    const audioAsVideo = await upload('troca.mp4', SAMPLES['.wav']);
    expect(audioAsVideo.status).toBe(400);
    expect(audioAsVideo.body.code).toBe('media_signature_mismatch');
    expect(leftoverUploads()).toHaveLength(0);
  });

  it('refuses pdf, text and other formats the sheet does not use', async () => {
    for (const [name, body] of [
      ['roteiro.pdf', ascii('%PDF-1.7')],
      ['notas.txt', ascii('texto')],
      ['dados.json', ascii('{}')],
      ['script.exe', ascii('MZ')],
      ['sem-extensao', SAMPLES['.png']]
    ] as const) {
      const { status, body: answer } = await upload(name, body);
      expect(status, name).toBe(400);
      expect(answer.code, name).toBe('unsupported_media');
    }
  });

  it('refuses an upload without a file name', async () => {
    const response = await fetch(`${server.url}/api/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: new Uint8Array(SAMPLES['.png'])
    });
    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe('missing_filename');
  });

  it('refuses a declared size above 512 MB before reading the body', async () => {
    // The body is never completed: the server must answer from the declared length alone.
    const answer = await new Promise<{ status: number; code: string }>((resolve, reject) => {
      const request = http.request(
        `${server.url}/api/media`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/octet-stream',
            'x-clave-filename': 'enorme.mp4',
            'content-length': String(MAX_MEDIA_BYTES + 1)
          }
        },
        (response) => {
          let text = '';
          response.on('data', (chunk) => (text += chunk));
          response.on('end', () => {
            request.destroy();
            resolve({ status: response.statusCode ?? 0, code: JSON.parse(text).code });
          });
        }
      );
      request.on('error', reject);
      request.write(SAMPLES['.mp4']);
    });
    expect(answer).toEqual({ status: 400, code: 'media_too_large' });
    expect(leftoverUploads()).toHaveLength(0);
  });
});

describe('AC-pauta-revelavel-16 — a stored file lives in the media folder and is served back', () => {
  it('writes the file under a relative path, never a machine path', async () => {
    const content = Buffer.concat([SAMPLES['.png'], ascii('conteúdo de imagem')]);
    const { status, body } = await upload('print da planilha.png', content);

    expect(status).toBe(201);
    expect(body.media.path).toMatch(/^[0-9a-f-]{36}\.png$/);
    expect(body.media.path).not.toContain(path.sep);
    expect(body.media.path).not.toMatch(/^[A-Za-z]:/);
    expect(body.media.bytes).toBe(content.length);

    const stored = path.join(mediaDir(), body.media.path);
    expect(fs.existsSync(stored)).toBe(true);
    expect(fs.readFileSync(stored)).toEqual(content);
  });

  it('serves the stored audio back, byte for byte and by range', async () => {
    const content = Buffer.concat([SAMPLES['.wav'], ascii('amostras de áudio')]);
    const { body } = await upload('vinheta.wav', content);

    const whole = await fetch(`${server.url}/api/media/${body.media.path}`);
    expect(whole.status).toBe(200);
    expect(Buffer.from(await whole.arrayBuffer())).toEqual(content);

    const range = await fetch(`${server.url}/api/media/${body.media.path}`, { headers: { Range: 'bytes=0-3' } });
    expect(range.status).toBe(206);
    expect(Buffer.from(await range.arrayBuffer())).toEqual(ascii('RIFF'));
  });

  it('serves the stored file when AIOSON_APP_DIR is a relative path', async () => {
    const content = Buffer.concat([SAMPLES['.png'], ascii('print')]);
    const { body } = await upload('relativo.png', content);
    const absolute = process.env.AIOSON_APP_DIR as string;
    process.env.AIOSON_APP_DIR = path.relative(process.cwd(), absolute);
    try {
      const served = await fetch(`${server.url}/api/media/${body.media.path}`);
      expect(served.status).toBe(200);
      expect(Buffer.from(await served.arrayBuffer())).toEqual(content);
      expect((await fetch(`${server.url}/api/media/../package.json`)).status).toBeGreaterThanOrEqual(400);
    } finally {
      process.env.AIOSON_APP_DIR = absolute;
    }
  });
});

describe('a media path never escapes the app media folder', () => {
  it('refuses traversal with ..', async () => {
    for (const attempt of [
      '/api/media/../../package.json',
      '/api/media/..%2f..%2fpackage.json',
      '/api/media/subpasta/../../../package.json'
    ]) {
      const response = await fetch(`${server.url}${attempt}`);
      expect(response.status, attempt).not.toBe(200);
      expect(response.status, attempt).toBeGreaterThanOrEqual(400);
    }
  });

  it('refuses an absolute path disguised as a relative one', async () => {
    const response = await fetch(`${server.url}/api/media/C:%5CWindows%5Cwin.ini`);
    expect(response.status).not.toBe(200);
  });

  it('answers the typed error for a missing file, never a page', async () => {
    const response = await fetch(`${server.url}/api/media/nao-existe.png`);
    expect(response.status).toBe(404);
    expect((await response.json()).code).toBe('not_found');
  });
});
