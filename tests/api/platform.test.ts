import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { startTestServer } from '../helpers/testServer';
import type { TestServer } from '../helpers/testServer';
import { API_ENDPOINTS } from '../../server/src/http/apiCatalog.js';
import { registeredApiRoutes } from '../../server/src/app.js';

const manifest = JSON.parse(fs.readFileSync(path.resolve('manifest.json'), 'utf8'));

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

const entries = (routes: { method: string; path: string }[]) => routes.map((route) => `${route.method} ${route.path}`);

/** The live-show surface the previous version exposed (execution, report, library, old blocks, open-url). */
const RETIRED_ROUTE = /\/api\/(runs|library|blocks|beats|open-url)\b|\/(preflight|open-run|report|track\/reorder)\b/;

describe('AC-pauta-revelavel-51 — the app runs on the ports the Play injects', () => {
  it('manifest.json declares a node split stack with PORT for the frontend and BACKEND_PORT for the backend', () => {
    expect(manifest.slug).toBe('clave');
    expect(manifest.runtime).toBe('node');
    expect(manifest.stack).toBe('split');
    expect(manifest.has_api).toBe(true);
    expect(manifest.processes.frontend.port_env).toBe('PORT');
    expect(manifest.processes.backend.port_env).toBe('BACKEND_PORT');
    expect(manifest.webview_target).toBe('frontend');
    expect(Object.keys(manifest.processes)).toContain(manifest.webview_target);
    expect(manifest.requires_services).toBeUndefined();
  });

  it('backend and frontend read their ports from the environment, never from a literal', () => {
    const serverMain = fs.readFileSync(path.resolve('server/src/main.ts'), 'utf8');
    const viteConfig = fs.readFileSync(path.resolve('vite.config.ts'), 'utf8');
    expect(serverMain).toContain('process.env.BACKEND_PORT');
    expect(viteConfig).toContain('process.env.PORT');
    expect(viteConfig).toContain('process.env.BACKEND_PORT');
    expect(serverMain).not.toMatch(/listen\(\s*\d{4}/);
  });
});

describe('AC-pauta-revelavel-51 — GET /api/aioson-play lists only routes that exist', () => {
  it('answers the capabilities schema with the slug, name and version of the manifest', async () => {
    const { status, body } = await server.request<{
      slug: string;
      name: string;
      version: string;
      api_base_url: string;
      endpoints: { method: string; path: string }[];
      events: unknown[];
    }>('GET', '/api/aioson-play');

    expect(status).toBe(200);
    expect(body.slug).toBe(manifest.slug);
    expect(body.name).toBe(manifest.name);
    expect(body.version).toBe(manifest.version);
    expect(body.api_base_url).toMatch(/^http:\/\/localhost:/);
    expect(entries(body.endpoints)).toEqual(entries(API_ENDPOINTS));
    expect(body.events).toEqual([]);
  });

  it('every announced route is registered in Express', () => {
    const registered = entries(registeredApiRoutes());
    expect(entries(API_ENDPOINTS).filter((entry) => !registered.includes(entry))).toEqual([]);
  });

  it('no registered route is left out of the catalog', () => {
    const announced = entries(API_ENDPOINTS);
    expect(entries(registeredApiRoutes()).filter((entry) => !announced.includes(entry))).toEqual([]);
  });

  it('announces exactly the sheet, rundown, media and preference routes', () => {
    expect(entries(API_ENDPOINTS).sort()).toEqual(
      [
        'GET /api/health',
        'GET /api/aioson-play',
        'GET /api/rundowns',
        'POST /api/rundowns',
        'PATCH /api/rundowns/:id',
        'DELETE /api/rundowns/:id',
        'POST /api/rundowns/:id/duplicate',
        'POST /api/rundowns/:id/toggle-pin',
        'POST /api/rundowns/:id/open',
        'GET /api/rundowns/:id/sheet',
        'PUT /api/rundowns/:id/sheet',
        'POST /api/media',
        'GET /api/media/{*relativePath}',
        'GET /api/preferences',
        'PUT /api/preferences'
      ].sort()
    );
  });

  it('carries no execution, report, library, old block or open-url route, and no GET /api/rundowns/:id', () => {
    const announced = entries(API_ENDPOINTS);
    const registered = entries(registeredApiRoutes());
    expect(announced.filter((entry) => RETIRED_ROUTE.test(entry))).toEqual([]);
    expect(registered.filter((entry) => RETIRED_ROUTE.test(entry))).toEqual([]);
    expect(announced).not.toContain('GET /api/rundowns/:id');
    expect(registered).not.toContain('GET /api/rundowns/:id');
  });

  it('the retired routes answer the typed 404 of the app', async () => {
    const created = await server.request<{ rundown: { id: string } }>('POST', '/api/rundowns', { title: 'Catálogo' });
    const id = created.body.rundown.id;
    const probes: [string, string][] = [
      ['GET', `/api/rundowns/${id}`],
      ['GET', `/api/rundowns/${id}/preflight`],
      ['GET', `/api/rundowns/${id}/open-run`],
      ['POST', '/api/runs'],
      ['GET', '/api/library'],
      ['POST', '/api/blocks'],
      ['POST', '/api/open-url']
    ];
    for (const [method, route] of probes) {
      const { status, body } = await server.request<{ code: string }>(method, route, method === 'GET' ? undefined : {});
      expect(status, `${method} ${route}`).toBe(404);
      expect(body.code).toBe('not_found');
    }
  });

  it('every announced GET without a parameter answers 200', async () => {
    // Routes with a parameter (`:id`) or a wildcard need a real target and are
    // driven by the suite of each capability.
    const parameterized = /[:{*]/;
    for (const endpoint of API_ENDPOINTS) {
      if (endpoint.method !== 'GET' || parameterized.test(endpoint.path)) continue;
      const { status } = await server.request('GET', endpoint.path);
      expect(status, `announced route ${endpoint.path}`).toBe(200);
    }
  });

  it('the rundown summary keeps the sheet counts and drops the live-show fields', async () => {
    await server.request('POST', '/api/rundowns', { title: 'Resumo' });
    const { body } = await server.request<{ rundowns: Record<string, unknown>[] }>('GET', '/api/rundowns');
    const summary = body.rundowns[0];
    expect(summary).toHaveProperty('blockCount');
    expect(summary).toHaveProperty('initiallyVisibleCount');
    for (const field of ['trackBlockCount', 'rescueBlockCount', 'plannedMinutes', 'openRunId', 'lastFinishedRunId']) {
      expect(summary, field).not.toHaveProperty(field);
    }
  });
});

describe('GET /api/health — light probe for the Play', () => {
  it('answers ok with the slug and the version', async () => {
    const { status, body } = await server.request<{ ok: boolean; slug: string; version: string }>('GET', '/api/health');
    expect(status).toBe(200);
    expect(body).toEqual({ ok: true, slug: manifest.slug, version: manifest.version });
  });
});

describe('AC-pauta-revelavel-01 — the app opens straight on the product', () => {
  it('has no authentication or binding route, and the manifest declares no auth', () => {
    const paths = registeredApiRoutes().map((route) => route.path);
    expect(paths.some((entry) => entry.includes('auth'))).toBe(false);
    expect(paths.some((entry) => entry.includes('binding'))).toBe(false);
    expect(manifest.auth).toBeUndefined();
  });

  it('an unknown route under /api answers the typed error, not a page', async () => {
    const { status, body } = await server.request<{ code: string }>('GET', '/api/does-not-exist');
    expect(status).toBe(404);
    expect(body.code).toBe('not_found');
  });
});
