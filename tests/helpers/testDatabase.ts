import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Cada suíte parte de um banco limpo: `AIOSON_APP_DIR` aponta para um diretório
 * descartável antes de qualquer import do servidor, e o módulo do banco é
 * reimportado do zero.
 */
export function useTemporaryAppDir(): { dir: () => string; cleanup: () => void } {
  let current: string | null = null;

  const dir = () => {
    if (!current) {
      current = fs.mkdtempSync(path.join(os.tmpdir(), 'clave-test-'));
      process.env.AIOSON_APP_DIR = current;
    }
    return current;
  };

  const cleanup = () => {
    if (current) fs.rmSync(current, { recursive: true, force: true });
    current = null;
    delete process.env.AIOSON_APP_DIR;
  };

  return { dir, cleanup };
}
