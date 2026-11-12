import { expect, test } from './fixtures';
import { seedSheet, uploadPng } from './helpers';
import { mediaDraft, textDraft } from '../helpers/sheetFixtures';

/**
 * The AIOSON Play contract checked on the running app: the catalog announces
 * only routes that exist, and the first screen is the product, with no login.
 */

test('AC-pauta-revelavel-51 — GET /api/aioson-play announces only routes that answer', async ({
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

  // Execution, report, library, old blocks and open-url left with the live model.
  const retired = /\/api\/(runs|library|blocks|beats|open-url)\b|\/(preflight|open-run|report|track\/reorder)\b/;
  expect(catalog.endpoints.filter((endpoint) => retired.test(endpoint.path)).map((endpoint) => endpoint.path)).toEqual([]);
  expect(catalog.endpoints.some((endpoint) => endpoint.method === 'GET' && endpoint.path === '/api/rundowns/:id')).toBe(false);

  const parameterized = /[:{*]/;
  for (const endpoint of catalog.endpoints) {
    expect(endpoint.description.length, endpoint.path).toBeGreaterThan(10);
    if (endpoint.method !== 'GET' || parameterized.test(endpoint.path)) continue;
    const probe = await request.get(endpoint.path);
    expect(probe.status(), `announced route ${endpoint.path}`).toBe(200);
  }

  // No invented route: an unknown one answers the app's typed error.
  const missing = await request.get('/api/rota-que-nao-existe');
  expect(missing.status()).toBe(404);
  expect((await missing.json()).code).toBe('not_found');
});

test('AC-pauta-revelavel-01 — the app opens straight on the product, with no login and no setup screen', async ({
  page
}) => {
  await page.goto('/');

  // The first screen is the product: the rundown list or the last rundown's sheet.
  await expect(page).toHaveURL(/#\/(rundowns|rundown\/)/);
  const productSurface = page.getByTestId('rundown-list').or(page.getByTestId('sheet-column'));
  await expect(productSurface.first()).toBeVisible();

  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  const body = (await page.locator('body').innerText()).toLowerCase();
  for (const term of ['entrar com', 'fazer login', 'senha', 'auth url', 'binding id']) {
    expect(body, `the first screen asks for "${term}"`).not.toContain(term);
  }

  // Nothing of the product is kept in the browser (RULE-pauta-revelavel-08).
  const storage = await page.evaluate(() => Object.keys(window.localStorage));
  expect(storage).toEqual([]);
});

test('AC-pauta-revelavel-56 — the interface makes no request to an external domain: fonts and media come from the app itself', async ({
  page,
  request
}) => {
  const requests: string[] = [];
  page.on('request', (outgoing) => requests.push(outgoing.url()));

  // A rundown with text and an image from the media folder, opened as the presenter would.
  const created = await request.post('/api/rundowns', { data: { title: 'Rede local' } });
  const id = ((await created.json()) as { rundown: { id: string } }).rundown.id;
  const image = await uploadPng(request, 'capa.png');
  await page.goto(`/#/rundown/${id}`);
  await seedSheet(page, request, id, [
    textDraft('a', 'Abertura', { plannedVisible: true, takeVisible: true }),
    mediaDraft('b', 'image', image, { plannedVisible: true, takeVisible: true })
  ]);
  await expect(page.locator('img[src*="/api/media/"]')).toBeVisible();

  // Every surface that loads something: the list, the appearance panel and the tour.
  const ruler = page.getByTestId('sheet-ruler');
  await ruler.getByRole('button', { name: 'Aparência', exact: true }).click();
  await expect(page.getByRole('complementary', { name: 'Aparência' })).toBeVisible();
  await page.getByRole('button', { name: 'Fechar a Aparência' }).click();
  await ruler.getByRole('button', { name: 'Como usar' }).click();
  await expect(page.getByTestId('tour-card')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.goto('/#/rundowns');
  await expect(page.getByTestId('rundown-list')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  // Same host as the app (the backend answers through the /api proxy of the frontend).
  const appHost = new URL(page.url()).host;
  expect(requests.length).toBeGreaterThan(5);
  const external = requests.filter((url) => {
    const parsed = new URL(url);
    if (parsed.protocol === 'data:' || parsed.protocol === 'blob:') return false;
    return parsed.host !== appHost;
  });
  expect(external).toEqual([]);

  // Inter and JetBrains Mono are served by the app, from public/fonts.
  const fonts = requests.filter((url) => url.endsWith('.woff2')).map((url) => new URL(url).pathname);
  expect(fonts).toEqual(expect.arrayContaining(['/fonts/inter-variable.woff2', '/fonts/jetbrains-mono-variable.woff2']));
  expect(await page.evaluate(() => document.fonts.check('16px Inter') && document.fonts.check('12px "JetBrains Mono"'))).toBe(true);

  // The media came from the local media folder, through the app's own route.
  expect(requests.some((url) => new URL(url).pathname.startsWith('/api/media/'))).toBe(true);
});
