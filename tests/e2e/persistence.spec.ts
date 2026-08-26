import { expect, test } from './fixtures';

/**
 * Nada do que o criador compôs se perde: os dados vivem em disco, o boot mostra
 * carregamento em vez de vazio, e a falha de escrita aparece na tela sem apagar
 * o que foi digitado.
 */

test('AC-clave-40 — a pauta criada sobrevive a recarregar o app', async ({ page }) => {
  await page.goto('/#/rundowns');
  await page.getByTestId('acao-criar-pauta').click();
  await page.getByLabel('Título da live').fill('Live que precisa sobreviver');
  await page.getByRole('button', { name: 'Criar', exact: true }).click();
  await expect(page).toHaveURL(/#\/board\//);

  await page.reload();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Live que precisa sobreviver' })
  ).toBeVisible();

  await page.goto('/#/rundowns');
  await expect(page.locator('.linha-pauta', { hasText: 'Live que precisa sobreviver' })).toBeVisible();
});

test('AC-clave-40 — nenhum dado do produto vai para o localStorage', async ({ page }) => {
  await page.goto('/#/rundowns');
  await page.getByTestId('acao-criar-pauta').click();
  await page.getByLabel('Título da live').fill('Live fora do localStorage');
  await page.getByRole('button', { name: 'Criar', exact: true }).click();
  await expect(page).toHaveURL(/#\/board\//);

  const storage = await page.evaluate(() => ({
    local: Object.entries(window.localStorage),
    session: Object.entries(window.sessionStorage)
  }));
  expect(storage.local).toEqual([]);
  expect(storage.session).toEqual([]);
});

test('AC-clave-45 — o boot mostra o estado de carregamento em vez de conteúdo vazio', async ({
  page
}) => {
  // Segura a primeira leitura para que o esqueleto fique observável.
  await page.route('**/api/rundowns', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    await route.continue();
  });

  await page.goto('/#/rundowns');
  await expect(page.getByTestId('estado-loading')).toBeVisible();
  await expect(page.getByTestId('pautas-lista')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId('estado-loading')).toBeHidden();
});

test('AC-clave-48 — falha de escrita aparece na tela e preserva o que foi digitado', async ({
  page
}) => {
  await page.goto('/#/rundowns');

  // O backend recusa a gravação: nada pode ser dado como salvo.
  await page.route('**/api/rundowns', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 500,
        code: 'internal_error',
        message: 'disco cheio',
        fields: []
      })
    });
  });

  await page.getByTestId('acao-criar-pauta').click();
  await page.getByLabel('Título da live').fill('Live que não vai salvar');
  await page.getByRole('button', { name: 'Criar', exact: true }).click();

  const banner = page.getByTestId('faixa-erro');
  await expect(banner).toBeVisible();
  await expect(banner).toContainText('criar a pauta');
  // O que o criador digitou continua no formulário.
  await expect(page.getByLabel('Título da live')).toHaveValue('Live que não vai salvar');
  await expect(page).toHaveURL(/#\/rundowns/);
});

test('AC-clave-48 — backend fora do ar é dito na tela, não engolido', async ({ page }) => {
  await page.route('**/api/rundowns', (route) => route.abort('connectionrefused'));
  await page.goto('/#/rundowns');

  const banner = page.getByTestId('faixa-erro');
  await expect(banner).toBeVisible();
  await expect(banner).toContainText('abrir o Clave');
  await expect(banner).toContainText('não conseguiu falar com o próprio servidor');
});
