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

describe('AC-clave-41 — manifest.json descreve o app real', () => {
  it('declara runtime node, split-stack com port_env dos dois processos e nenhum requires_services', () => {
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
});

describe('AC-clave-42 — nenhuma porta fixada no código', () => {
  it('backend e frontend leem a porta do ambiente injetado pelo Play', () => {
    const serverMain = fs.readFileSync(path.resolve('server/src/main.ts'), 'utf8');
    const viteConfig = fs.readFileSync(path.resolve('vite.config.ts'), 'utf8');
    expect(serverMain).toContain('process.env.BACKEND_PORT');
    expect(viteConfig).toContain('process.env.PORT');
    expect(viteConfig).toContain('process.env.BACKEND_PORT');
    // `listen` só recebe a variável, nunca um literal.
    expect(serverMain).not.toMatch(/listen\(\s*\d{4}/);
  });
});

describe('AC-clave-43 — GET /api/aioson-play lista apenas rotas que existem', () => {
  it('responde com o schema de capabilities e o mesmo slug do manifesto', async () => {
    const { status, body } = await server.request<{
      slug: string;
      name: string;
      version: string;
      api_base_url: string;
      endpoints: unknown[];
      events: unknown[];
    }>('GET', '/api/aioson-play');

    expect(status).toBe(200);
    expect(body.slug).toBe(manifest.slug);
    expect(body.name).toBe(manifest.name);
    expect(body.version).toBe(manifest.version);
    expect(body.api_base_url).toMatch(/^http:\/\/localhost:/);
    expect(body.endpoints.length).toBeGreaterThan(0);
    expect(body.events).toEqual([]);
  });

  it('toda rota anunciada está registrada no Express', () => {
    const registered = registeredApiRoutes().map((route) => `${route.method} ${route.path}`);
    const announced = API_ENDPOINTS.map((endpoint) => `${endpoint.method} ${endpoint.path}`);
    const invented = announced.filter((entry) => !registered.includes(entry));
    expect(invented).toEqual([]);
  });

  it('nenhuma rota registrada fica fora do catálogo', () => {
    const registered = registeredApiRoutes().map((route) => `${route.method} ${route.path}`);
    const announced = API_ENDPOINTS.map((endpoint) => `${endpoint.method} ${endpoint.path}`);
    const hidden = registered.filter((entry) => !announced.includes(entry));
    expect(hidden).toEqual([]);
  });

  it('cada rota GET sem parâmetro anunciada responde de verdade', async () => {
    // Rotas com parâmetro (`:id`) ou curinga (`{*resto}`) precisam de um alvo
    // real e são exercidas pelas suítes de cada capacidade.
    const parameterized = /[:{*]/;
    for (const endpoint of API_ENDPOINTS) {
      if (endpoint.method !== 'GET' || parameterized.test(endpoint.path)) continue;
      const { status } = await server.request('GET', endpoint.path);
      expect(status, `rota anunciada ${endpoint.path}`).toBe(200);
    }
  });
});

describe('GET /api/health — probe leve para o Play', () => {
  it('responde ok com slug e versão', async () => {
    const { status, body } = await server.request<{ ok: boolean; slug: string; version: string }>(
      'GET',
      '/api/health'
    );
    expect(status).toBe(200);
    expect(body).toEqual({ ok: true, slug: manifest.slug, version: manifest.version });
  });
});

describe('AC-clave-44 — o app abre direto no produto', () => {
  it('não existe rota de autenticação nem de configuração de binding', () => {
    const paths = registeredApiRoutes().map((route) => route.path);
    expect(paths.some((entry) => entry.includes('auth'))).toBe(false);
    expect(paths.some((entry) => entry.includes('binding'))).toBe(false);
    expect(manifest.auth).toBeUndefined();
  });

  it('rota inexistente sob /api devolve o erro tipado, não uma página', async () => {
    const { status, body } = await server.request<{ code: string }>('GET', '/api/nao-existe');
    expect(status).toBe(404);
    expect(body.code).toBe('not_found');
  });
});
