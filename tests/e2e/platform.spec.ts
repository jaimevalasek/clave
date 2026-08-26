import { expect, test } from './fixtures';

/**
 * O contrato com o AIOSON Play conferido no app rodando: o catálogo só anuncia
 * rota que existe, e a primeira tela é o produto — sem login e sem configuração.
 */

test('AC-clave-43 — GET /api/aioson-play anuncia só rotas que respondem de verdade', async ({
  request
}) => {
  const response = await request.get('/api/aioson-play');
  expect(response.status()).toBe(200);

  const catalog = (await response.json()) as {
    slug: string;
    name: string;
    version: string;
    api_base_url: string;
    endpoints: { path: string; method: string; description: string }[];
    events: string[];
  };

  expect(catalog.slug).toBe('clave');
  expect(catalog.name).toBe('Clave');
  expect(catalog.api_base_url).toMatch(/^http:\/\/localhost:\d+$/);
  expect(catalog.endpoints.length).toBeGreaterThan(10);

  const parameterized = /[:{*]/;
  for (const endpoint of catalog.endpoints) {
    expect(endpoint.description.length, endpoint.path).toBeGreaterThan(10);
    if (endpoint.method !== 'GET' || parameterized.test(endpoint.path)) continue;
    const probe = await request.get(endpoint.path);
    expect(probe.status(), `rota anunciada ${endpoint.path}`).toBe(200);
  }

  // Nada de rota inventada: uma que não existe devolve o erro tipado do app.
  const missing = await request.get('/api/rota-que-nao-existe');
  expect(missing.status()).toBe(404);
  expect((await missing.json()).code).toBe('not_found');
});

test('AC-clave-44 — o app abre direto no produto, sem login e sem tela de configuração', async ({
  page
}) => {
  await page.goto('/');
  await expect(page.locator('#topbar')).toBeVisible();

  // A primeira tela é o produto: Pautas ou a última pauta usada na Bancada.
  await expect(page).toHaveURL(/#\/(rundowns|board)/);
  const productSurface = page.getByTestId('pautas-lista').or(page.getByTestId('bancada-canvas'));
  await expect(productSurface.first()).toBeVisible();

  // Nenhum campo de senha, nenhum formulário de login.
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  const body = (await page.locator('body').innerText()).toLowerCase();
  for (const term of ['entrar com', 'fazer login', 'senha', 'auth url', 'binding id']) {
    expect(body, `a primeira tela pede "${term}"`).not.toContain(term);
  }

  // O produto não guarda token nenhum: não há sessão para configurar.
  const storage = await page.evaluate(() => Object.keys(window.localStorage));
  expect(storage).toEqual([]);
});
