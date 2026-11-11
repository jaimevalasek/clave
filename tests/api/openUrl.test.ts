import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { startTestServer } from '../helpers/testServer';
import type { TestServer } from '../helpers/testServer';
import { parseHttpUrl, setOpenBrowser } from '../../server/src/services/openUrl.js';

let server: TestServer;
const opened: string[] = [];

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

afterEach(() => {
  opened.length = 0;
});

describe('parseHttpUrl — SEC-SBD-06 scheme allowlist', () => {
  it('normaliza http e https', () => {
    expect(parseHttpUrl('https://exemplo.test/live')).toBe('https://exemplo.test/live');
    expect(parseHttpUrl('  http://exemplo.test  ')).toBe('http://exemplo.test/');
  });

  it('recusa scheme perigoso, credenciais, controle e excesso', () => {
    const rejected = [
      'javascript:alert(1)',
      'file:///C:/Windows/notepad.exe',
      'data:text/html,hi',
      'ftp://exemplo.test',
      'https://user:secret@exemplo.test',
      `https://exemplo.test/${'a'.repeat(2100)}`,
      'https://exemplo.test/foo\nbar',
      '',
      12
    ];
    for (const raw of rejected) {
      expect(() => parseHttpUrl(raw), String(raw)).toThrow();
    }
  });

  it('aceita file: apontando para arquivo HTML estático existente', () => {
    const tempFile = path.join(os.tmpdir(), 'clave-test-tutorial.html');
    fs.writeFileSync(tempFile, '<h1>Tutorial</h1>');
    try {
      const fileUrl = pathToFileURL(tempFile).href;
      expect(parseHttpUrl(fileUrl)).toBe(fileUrl);
      // Também aceita caminho absoluto e normaliza para file://
      expect(parseHttpUrl(tempFile)).toBe(fileUrl);
    } finally {
      fs.unlinkSync(tempFile);
    }
  });

  it('recusa file: quando o arquivo HTML não existe no disco', () => {
    const missing = pathToFileURL(path.join(os.tmpdir(), 'clave-nao-existe-xyz.html')).href;
    expect(() => parseHttpUrl(missing)).toThrow();
  });
});

describe('POST /api/open-url — abre no navegador do sistema', () => {
  it('pede ao SO para abrir uma URL http(s) válida', async () => {
    const restore = setOpenBrowser(async (url) => {
      opened.push(url);
    });
    try {
      const { status, body } = await server.request<{ url: string }>('POST', '/api/open-url', {
        url: 'https://exemplo.test/live'
      });
      expect(status).toBe(200);
      expect(body.url).toBe('https://exemplo.test/live');
      expect(opened).toEqual(['https://exemplo.test/live']);
    } finally {
      restore();
    }
  });

  it('pede ao SO para abrir arquivo HTML local válido via file:', async () => {
    const tempFile = path.join(os.tmpdir(), 'clave-test-tutorial-open.html');
    fs.writeFileSync(tempFile, '<h1>Tutorial</h1>');
    const fileUrl = pathToFileURL(tempFile).href;
    const restore = setOpenBrowser(async (url) => {
      opened.push(url);
    });
    try {
      const { status, body } = await server.request<{ url: string }>('POST', '/api/open-url', {
        url: fileUrl
      });
      expect(status).toBe(200);
      expect(body.url).toBe(fileUrl);
      expect(opened).toEqual([fileUrl]);
    } finally {
      restore();
      fs.unlinkSync(tempFile);
    }
  });

  it('não dispara o opener para javascript:', async () => {
    const restore = setOpenBrowser(async (url) => {
      opened.push(url);
    });
    try {
      const { status, body } = await server.request<{
        code: string;
        fields: { field: string }[];
      }>('POST', '/api/open-url', { url: 'javascript:alert(1)' });
      expect(status).toBe(422);
      expect(body.code).toBe('validation_failed');
      expect(body.fields[0].field).toBe('url');
      expect(opened).toEqual([]);
    } finally {
      restore();
    }
  });
});
