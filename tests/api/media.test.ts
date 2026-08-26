import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { startTestServer } from '../helpers/testServer';
import type { TestServer } from '../helpers/testServer';

let server: TestServer;

const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const WEBM_HEADER = Buffer.from([0x1a, 0x45, 0xdf, 0xa3]);

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

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('AC-clave-26 — anexar arquivo copia para a pasta de mídia com caminho relativo', () => {
  it('grava o arquivo e devolve um caminho relativo, nunca o caminho da máquina', async () => {
    const content = Buffer.concat([PNG_HEADER, Buffer.from('conteúdo de imagem')]);
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

  it('serve de volta o arquivo gravado', async () => {
    const content = Buffer.concat([WEBM_HEADER, Buffer.from('bytes do vídeo')]);
    const { body } = await upload('curva.webm', content);

    const response = await fetch(`${server.url}/api/media/${body.media.path}`);
    expect(response.status).toBe(200);
    expect(Buffer.from(await response.arrayBuffer())).toEqual(content);
  });

  it('recusa extensão forjada: o conteúdo é conferido contra a assinatura', async () => {
    const { status, body } = await upload('mentira.png', Buffer.from('isto não é um PNG'));
    expect(status).toBe(400);
    expect(body.code).toBe('media_signature_mismatch');
    // Nenhum registro nasce sem o arquivo final no lugar.
    expect(fs.readdirSync(mediaDir()).filter((name) => name.startsWith('.upload-'))).toHaveLength(0);
  });

  it('recusa tipo de arquivo fora da lista aceita', async () => {
    const { status, body } = await upload('script.exe', Buffer.from('MZ'));
    expect(status).toBe(400);
    expect(body.code).toBe('unsupported_media');
  });

  it('recusa upload sem nome de arquivo', async () => {
    const response = await fetch(`${server.url}/api/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: new Uint8Array(PNG_HEADER)
    });
    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe('missing_filename');
  });
});

describe('caminho de mídia nunca escapa da pasta do app', () => {
  it('recusa travessia por ..', async () => {
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

  it('recusa caminho absoluto disfarçado de relativo', async () => {
    const response = await fetch(`${server.url}/api/media/C:%5CWindows%5Cwin.ini`);
    expect(response.status).not.toBe(200);
  });

  it('arquivo inexistente devolve o erro tipado, nunca uma página', async () => {
    const response = await fetch(`${server.url}/api/media/nao-existe.png`);
    expect(response.status).toBe(404);
    expect((await response.json()).code).toBe('not_found');
  });
});
