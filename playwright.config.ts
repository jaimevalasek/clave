import { defineConfig, devices } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

// Portas próprias do e2e para não brigar com um preview do Play aberto ao lado.
const frontendPort = Number(process.env.CLAVE_E2E_PORT) || 5199;
const backendPort = Number(process.env.CLAVE_E2E_BACKEND_PORT) || 3399;

/**
 * A suíte parte sempre de um banco limpo (crud-surface-integrity): o app de teste
 * vive num `AIOSON_APP_DIR` descartável. A limpeza acontece uma única vez, no
 * processo principal, antes de o servidor subir — os workers herdam a variável
 * já resolvida e por isso não apagam um arquivo que o backend já abriu.
 */
function resolveAppDir(): string {
  const inherited = process.env.CLAVE_E2E_APP_DIR;
  if (inherited) return inherited;
  const dir = path.join(rootDir, 'test-results', 'app-data');
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  process.env.CLAVE_E2E_APP_DIR = dir;
  return dir;
}

const appDir = resolveAppDir();

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: process.env.CI ? 'line' : [['list']],
  use: {
    baseURL: `http://127.0.0.1:${frontendPort}`,
    trace: 'retain-on-failure',
    permissions: ['clipboard-read', 'clipboard-write']
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm dev',
    url: `http://127.0.0.1:${frontendPort}`,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      PORT: String(frontendPort),
      BACKEND_PORT: String(backendPort),
      AIOSON_APP_DIR: appDir,
      AIOSON_APP_SLUG: 'clave'
    }
  }
});
