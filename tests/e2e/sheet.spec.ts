import { expect, test } from './fixtures';
import { blockText, createRundown, fetchSheet, plain, sheetBlocks, waitSaved, writeNewBlock } from './helpers';

/**
 * The sheet through the real interface: one column where the presenter writes,
 * with autosave to disk. Every assertion reads the screen first and the API or
 * a reload second.
 */

test('AC-pauta-revelavel-07 and -08 — one column, with name, counter and save state on the ruler', async ({ page }) => {
  await createRundown(page, 'Folha única');

  await expect(page.getByTestId('sheet-column')).toHaveCount(1);
  await expect(page.getByText('Folha em branco.')).toBeVisible();
  const ruler = page.getByTestId('sheet-ruler');
  await expect(ruler.getByLabel('Nome da pauta')).toHaveValue('Folha única');
  await expect(ruler.getByTestId('sheet-counter')).toHaveText(/0\s+de\s+0\s+na tela/);
  await expect(ruler.getByTestId('save-state')).toHaveText(/Salvo às \d{2}:\d{2}/);

  await writeNewBlock(page, 'Primeiro bloco');
  // Editing happens on the same route, without an edit modal.
  await expect(page.getByTestId('modal')).toHaveCount(0);
  await expect(page).toHaveURL(/#\/rundown\//);
  await expect(ruler.getByTestId('sheet-counter')).toHaveText(/1\s+de\s+1\s+na tela/);
  await waitSaved(page);
});

test('AC-pauta-revelavel-10 — clicking the end of the sheet creates a focused block that shows at once and is planned hidden', async ({
  page,
  request
}) => {
  const id = await createRundown(page, 'Escrevendo ao vivo');
  await page.getByRole('button', { name: 'Clique para escrever, cole (Ctrl+V) ou solte um arquivo' }).click();
  await expect(blockText(page, 0)).toBeFocused();
  await page.keyboard.type('Aparece na hora');
  await expect(sheetBlocks(page).first()).toContainText('Aparece na hora');
  await expect(sheetBlocks(page).first()).toHaveAttribute('data-shown', 'true');
  await waitSaved(page);

  const sheet = await fetchSheet(request, id);
  expect(plain(sheet)).toEqual(['Aparece na hora']);
  expect(sheet.blocks[0].plannedVisible).toBe(false);
  expect(sheet.blocks[0].takeVisible).toBe(true);
});

test('AC-pauta-revelavel-11 — Enter breaks the line, Enter twice opens the next block, Backspace on an empty block removes it', async ({
  page,
  request
}) => {
  const id = await createRundown(page, 'Teclas da folha');
  await writeNewBlock(page, 'linha 1');
  await page.keyboard.press('Enter');
  await page.keyboard.type('linha 2');
  await expect(sheetBlocks(page)).toHaveCount(1);

  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await expect(sheetBlocks(page)).toHaveCount(2);
  await expect(blockText(page, 1)).toBeFocused();
  await expect(sheetBlocks(page).nth(1)).toHaveAttribute('data-depth', '0');
  await page.keyboard.type('segundo');
  await waitSaved(page);
  expect(plain(await fetchSheet(request, id))).toEqual(['linha 1\nlinha 2', 'segundo']);

  for (let index = 0; index < 'segundo'.length; index += 1) await page.keyboard.press('Backspace');
  await page.keyboard.press('Backspace');
  await expect(sheetBlocks(page)).toHaveCount(1);
  await expect(blockText(page, 0)).toBeFocused();
  await waitSaved(page);
  expect(plain(await fetchSheet(request, id))).toEqual(['linha 1\nlinha 2']);
});

test('AC-pauta-revelavel-09 — every change saves without a button and comes back after a restart', async ({
  page
}) => {
  await createRundown(page, 'Salva sozinha');
  await writeNewBlock(page, 'Abertura');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Desenvolvimento');
  await waitSaved(page);

  await page.reload();
  await expect(blockText(page, 0)).toHaveText('Abertura');
  await expect(blockText(page, 1)).toHaveText('Desenvolvimento');
  // Nothing of the product lives in the browser storage (RULE-pauta-revelavel-08).
  expect(await page.evaluate(() => Object.keys(window.localStorage))).toEqual([]);
});

test('AC-pauta-revelavel-09 — a failed save shows "Falha ao salvar · nova tentativa em 5 s" and retries on its own', async ({
  page,
  request
}) => {
  const id = await createRundown(page, 'Falha de gravação');
  await page.route('**/api/rundowns/*/sheet', (route) =>
    route.request().method() === 'PUT' ? route.abort() : route.continue()
  );
  await writeNewBlock(page, 'Texto que espera o disco');
  await expect(page.getByTestId('save-state')).toHaveText('Falha ao salvar · nova tentativa em 5 s');
  // The screen never goes back.
  await expect(blockText(page, 0)).toHaveText('Texto que espera o disco');

  await page.unroute('**/api/rundowns/*/sheet');
  await waitSaved(page);
  expect(plain(await fetchSheet(request, id))).toEqual(['Texto que espera o disco']);
});

test('AC-pauta-revelavel-03 — the name edited on the ruler saves and shows the same in the list', async ({ page }) => {
  await createRundown(page, 'Nome antigo da folha');
  const name = page.getByTestId('sheet-ruler').getByLabel('Nome da pauta');
  await name.fill('Nome novo da folha');
  await waitSaved(page);
  await page.reload();
  await expect(page.getByTestId('sheet-ruler').getByLabel('Nome da pauta')).toHaveValue('Nome novo da folha');

  await page.getByRole('link', { name: 'Voltar para as pautas' }).click();
  await expect(page.getByRole('button', { name: 'Nome novo da folha', exact: true })).toBeVisible();
});

test('AC-pauta-revelavel-53 — Esc leaves the text and Tab goes back to the controls with visible focus', async ({
  page
}) => {
  await createRundown(page, 'Teclado');
  await writeNewBlock(page, 'Saindo do texto');
  await page.keyboard.press('Escape');
  await expect(blockText(page, 0)).not.toBeFocused();
  await page.keyboard.press('Tab');
  const focused = page.locator(':focus');
  await expect(focused).toHaveCount(1);
  const outline = await focused.evaluate((element) => getComputedStyle(element).outlineStyle);
  expect(outline).not.toBe('none');
});

test('AC-pauta-revelavel-54 — at 360 px there is no horizontal scroll and targets have at least 44 px', async ({
  page
}) => {
  await createRundown(page, 'Uma pauta com um nome bem comprido para caber no celular');
  await writeNewBlock(page, 'Um texto longo que precisa quebrar a linha sem empurrar a página para o lado');
  await page.setViewportSize({ width: 360, height: 740 });

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  for (const target of await page.getByTestId('sheet-ruler').locator('a, button, input').all()) {
    const box = await target.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }

  await page.goto('/#/rundowns');
  await expect(page.getByRole('heading', { level: 1, name: 'Pautas' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  for (const target of await page.locator('.rundown-row button').all()) {
    const box = await target.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
});

test('AC-pauta-revelavel-57 — loading shows the skeleton, a dead server shows "Tentar de novo", a missing rundown leads to the list', async ({
  page
}) => {
  const id = await createRundown(page, 'Carregamento');

  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/rundowns/*/sheet', async (route) => {
    await gate;
    await route.continue();
  });
  await page.reload();
  await expect(page.getByTestId('loading-skeleton')).toBeVisible();
  release();
  await expect(page.getByTestId('sheet-column')).toBeVisible();
  await page.unroute('**/api/rundowns/*/sheet');

  await page.route('**/api/**', (route) => route.abort());
  await page.reload();
  const banner = page.getByTestId('error-banner');
  await expect(banner).toBeVisible();
  await page.unroute('**/api/**');
  await banner.getByRole('button', { name: 'Tentar de novo' }).click();
  await expect(page.getByLabel('Nome da pauta')).toHaveValue('Carregamento');

  await page.goto('/#/rundown/nao-existe-mais');
  await expect(page).toHaveURL(/#\/rundowns$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Pautas' })).toBeVisible();
  expect(id).toBeTruthy();
});
