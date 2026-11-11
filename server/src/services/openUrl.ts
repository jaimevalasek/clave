import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { HttpError, validationFailed } from '../http/errors.js';

const HTTP_URL_MAX_LENGTH = 2048;

export type BrowserOpener = (url: string) => Promise<void>;

export function spawnSystemBrowser(url: string): Promise<void> {
  const { command, args, options } = openerFor(process.platform, url);
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
      ...options
    });
    child.once('error', reject);
    child.unref();
    resolve();
  });
}

function openerFor(platform: NodeJS.Platform, url: string) {
  if (platform === 'win32') {
    return {
      command: 'cmd.exe',
      args: ['/c', 'start', '""', url.replace(/[&|^]/g, '^$&')],
      options: { windowsVerbatimArguments: true }
    };
  }
  if (platform === 'darwin') {
    return { command: 'open', args: [url], options: {} };
  }
  return { command: 'xdg-open', args: [url], options: {} };
}

const defaultOpener: BrowserOpener =
  process.env.VITEST === 'true'
    ? async () => {
        throw new Error('openBrowser must be mocked in tests');
      }
    : spawnSystemBrowser;

let openBrowser: BrowserOpener = defaultOpener;

/** Test hook: swap the OS opener without spawning a real browser. */
export function setOpenBrowser(next: BrowserOpener): () => void {
  const previous = openBrowser;
  openBrowser = next;
  return () => {
    openBrowser = previous;
  };
}

const ALLOWED_STATIC_EXTENSIONS = new Set(['.html', '.htm', '.xhtml']);

/**
 * http(s) URLs and local static HTML file: URLs without credentials.
 * The server does not fetch the URL (no SSRF); it asks the OS to open the presenter's browser.
 */
export function parseHttpUrl(raw: unknown): string {
  if (typeof raw !== 'string' || !raw.trim()) {
    throw validationFailed([{ field: 'url', message: 'Informe a URL do anexo.' }]);
  }

  let trimmed = raw.trim();
  if (trimmed.length > HTTP_URL_MAX_LENGTH) {
    throw validationFailed([{ field: 'url', message: 'A URL do anexo é longa demais.' }]);
  }
  if (/[\u0000-\u001F\u007F]/.test(trimmed)) {
    throw validationFailed([{ field: 'url', message: 'A URL do anexo é inválida.' }]);
  }

  if (/^([a-zA-Z]:[/\\]|\/)/.test(trimmed) && ALLOWED_STATIC_EXTENSIONS.has(path.extname(trimmed).toLowerCase())) {
    try {
      trimmed = pathToFileURL(trimmed).href;
    } catch {
      // continua para new URL
    }
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw validationFailed([{ field: 'url', message: 'A URL do anexo é inválida.' }]);
  }

  if (parsed.protocol === 'file:') {
    if (parsed.username || parsed.password) {
      throw validationFailed([
        { field: 'url', message: 'A URL do anexo não pode trazer credenciais.' }
      ]);
    }
    const ext = path.extname(parsed.pathname).toLowerCase();
    if (!ALLOWED_STATIC_EXTENSIONS.has(ext)) {
      throw validationFailed([
        { field: 'url', message: 'Só é permitido abrir arquivos HTML locais no navegador.' }
      ]);
    }
    let localPath: string;
    try {
      localPath = fileURLToPath(parsed.href);
    } catch {
      throw validationFailed([{ field: 'url', message: 'A URL do arquivo local é inválida.' }]);
    }
    if (!fs.existsSync(localPath)) {
      throw validationFailed([
        { field: 'url', message: 'O arquivo local do anexo não foi encontrado.' }
      ]);
    }
    return parsed.href;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw validationFailed([
      { field: 'url', message: 'Só dá para abrir links http, https ou html local no navegador.' }
    ]);
  }
  if (!parsed.hostname) {
    throw validationFailed([{ field: 'url', message: 'A URL do anexo é inválida.' }]);
  }
  if (parsed.username || parsed.password) {
    throw validationFailed([
      { field: 'url', message: 'A URL do anexo não pode trazer credenciais.' }
    ]);
  }

  return parsed.href;
}

export async function openHttpUrl(raw: unknown): Promise<{ url: string }> {
  const url = parseHttpUrl(raw);
  try {
    await openBrowser(url);
  } catch {
    throw new HttpError(502, 'open_failed', 'Não foi possível abrir o navegador.');
  }
  return { url };
}
