// RG-boot — sobe o backend real numa porta livre, com um AIOSON_APP_DIR
// descartável, e confere o caminho de produção: health, catálogo de rotas e a
// gravação de uma pauta que sobrevive à reabertura do processo.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clave-smoke-'));

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

async function waitForHealth(baseUrl, timeoutMs = 40_000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return await response.json();
    } catch {
      // o processo ainda está subindo
    }
    if (Date.now() > deadline) throw new Error('backend não respondeu /api/health a tempo');
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

// O executor de TypeScript é invocado pelo próprio Node, sem passar por um
// wrapper `.cmd`: `spawn` de `.cmd` sem shell falha com EINVAL no Windows.
const tsxCli = createRequire(import.meta.url).resolve('tsx/cli');

function startBackend(port) {
  const child = spawn(process.execPath, [tsxCli, path.join(root, 'server/src/main.ts')], {
    cwd: root,
    env: { ...process.env, BACKEND_PORT: String(port), AIOSON_APP_DIR: appDir },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  child.stderr.on('data', (chunk) => process.stderr.write(`[backend] ${chunk}`));
  return child;
}

async function run() {
  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;

  let backend = startBackend(port);
  const health = await waitForHealth(baseUrl);
  if (!health.ok || health.slug !== 'clave') {
    throw new Error(`/api/health inesperado: ${JSON.stringify(health)}`);
  }

  const catalog = await (await fetch(`${baseUrl}/api/aioson-play`)).json();
  if (catalog.slug !== 'clave' || !Array.isArray(catalog.endpoints) || !catalog.endpoints.length) {
    throw new Error(`/api/aioson-play inesperado: ${JSON.stringify(catalog)}`);
  }
  // Rotas com parâmetro (`:id`) ou curinga (`{*resto}`) precisam de um alvo real
  // e são exercidas pelas suítes de cada capacidade.
  const parameterized = /[:{*]/;
  for (const endpoint of catalog.endpoints) {
    if (endpoint.method === 'GET' && !parameterized.test(endpoint.path)) {
      const response = await fetch(`${baseUrl}${endpoint.path}`);
      if (!response.ok) throw new Error(`rota anunciada ${endpoint.path} respondeu ${response.status}`);
    }
  }

  const created = await (
    await fetch(`${baseUrl}/api/rundowns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Live do smoke de boot', date: '2026-08-18' })
    })
  ).json();
  if (!created.rundown?.id) throw new Error('POST /api/rundowns não devolveu a pauta criada');

  // Fechar e reabrir o processo: os dados vivem em disco, não em memória.
  backend.kill();
  await new Promise((resolve) => backend.once('exit', resolve));

  backend = startBackend(port);
  await waitForHealth(baseUrl);
  const listed = await (await fetch(`${baseUrl}/api/rundowns`)).json();
  const survived = listed.rundowns.some((rundown) => rundown.id === created.rundown.id);
  backend.kill();
  await new Promise((resolve) => backend.once('exit', resolve));

  if (!survived) throw new Error('a pauta criada não sobreviveu ao restart do backend');

  const dbFile = path.join(appDir, 'data', 'clave.db');
  if (!fs.existsSync(dbFile)) throw new Error(`banco não encontrado em ${dbFile}`);

  process.stdout.write(
    `smoke-boot OK — porta ${port}, ${catalog.endpoints.length} rotas no catálogo, pauta persistida em ${dbFile}\n`
  );
}

try {
  await run();
} finally {
  // No Windows o handle do banco pode demorar a ser liberado depois do kill; a
  // limpeza espera um instante, tenta de novo e nunca mascara o erro do smoke.
  await new Promise((resolve) => setTimeout(resolve, 500));
  try {
    fs.rmSync(appDir, { recursive: true, force: true, maxRetries: 20, retryDelay: 200 });
  } catch (error) {
    process.stderr.write(`[smoke-boot] não consegui limpar ${appDir}: ${error.message}\n`);
  }
}
