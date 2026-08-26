import type { Server } from 'node:http';
import { useTemporaryAppDir } from './testDatabase';

export interface TestServer {
  url: string;
  request<T>(method: string, path: string, body?: unknown): Promise<{ status: number; body: T }>;
  close(): Promise<void>;
}

/**
 * Sobe o app Express de verdade (mesmo `createApp` do processo de produção)
 * numa porta efêmera, com banco descartável e migrações aplicadas.
 */
export async function startTestServer(): Promise<TestServer> {
  const appDir = useTemporaryAppDir();
  appDir.dir();

  // Import depois de fixar AIOSON_APP_DIR: os módulos resolvem o caminho no load.
  const { createApp } = await import('../../server/src/app.js');
  const { db, closeDatabase } = await import('../../server/src/db/database.js');
  const { runMigrations } = await import('../../server/src/db/migrations.js');
  const { databaseFile } = await import('../../server/src/db/paths.js');

  runMigrations(db(), databaseFile());

  const server: Server = await new Promise((resolve) => {
    const instance = createApp().listen(0, '127.0.0.1', () => resolve(instance));
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('servidor de teste sem porta.');
  const url = `http://127.0.0.1:${address.port}`;

  return {
    url,
    async request<T>(method: string, path: string, body?: unknown) {
      const response = await fetch(`${url}${path}`, {
        method,
        headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body)
      });
      const text = await response.text();
      return { status: response.status, body: (text ? JSON.parse(text) : null) as T };
    },
    async close() {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      closeDatabase();
      appDir.cleanup();
    }
  };
}
