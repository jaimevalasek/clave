import { expect, test } from './fixtures';
import {
  blockText,
  createRundown,
  deleteAllRundowns,
  fetchSheet,
  listRundowns,
  plain,
  rundownIdFromUrl,
  waitSaved,
  writeNewBlock
} from './helpers';

/**
 * The rundown list through the real form: create, open, rename, duplicate, pin
 * and delete, always identified by the persisted id.
 */

test('AC-pauta-revelavel-01 — with no rundown the list shows the empty state', async ({ page, request }) => {
  await deleteAllRundowns(request);
  await page.goto('/');
  await expect(page).toHaveURL(/#\/rundowns$/);
  await expect(page.getByText('Nenhuma pauta ainda.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Criar a primeira pauta' })).toBeVisible();
});

test('AC-pauta-revelavel-01 — opening the app reopens the last rundown opened, even with another one pinned', async ({
  page,
  request
}) => {
  const pinned = await createRundown(page, 'Pauta fixada antiga');
  await request.post(`/api/rundowns/${pinned}/toggle-pin`);
  const latest = await createRundown(page, 'Pauta aberta por último');

  await page.goto('about:blank');
  await page.goto('/');
  await expect(page).toHaveURL(new RegExp(`#/rundown/${latest}$`));
  await expect(page.getByLabel('Nome da pauta')).toHaveValue('Pauta aberta por último');

  await page.goto('/#/rundowns');
  const rows = page.locator('.rundown-row');
  await expect(rows.first()).toHaveAttribute('data-testid', `rundown-${pinned}`);
});

test('AC-pauta-revelavel-02 — "Nova pauta" asks for a name, refuses an empty one and opens a blank sheet', async ({
  page,
  request
}) => {
  const before = (await listRundowns(request)).length;
  await page.goto('/#/rundowns');
  await page.getByRole('button', { name: 'Nova pauta', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Nova pauta' });
  await expect(dialog).toBeVisible();

  await dialog.getByRole('button', { name: 'Criar pauta' }).click();
  const field = dialog.getByLabel('Nome da pauta');
  await expect(dialog.getByText('Dê um nome à pauta, por exemplo "Episódio 12: filas".')).toBeVisible();
  await expect(field).toHaveAttribute('aria-invalid', 'true');
  expect((await listRundowns(request)).length).toBe(before);

  await field.fill('Episódio 12: filas');
  await field.press('Enter');
  await expect(page).toHaveURL(/#\/rundown\//);
  await expect(page.getByText('Folha em branco.')).toBeVisible();
});

test('AC-pauta-revelavel-03 — renaming from the list changes only that row and survives a restart', async ({ page }) => {
  const target = await createRundown(page, 'Pauta a renomear pela lista');
  const neighbour = await createRundown(page, 'Pauta vizinha da lista');
  await page.goto('/#/rundowns');

  await page.getByTestId(`rundown-${target}`).getByRole('button', { name: 'Renomear', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Renomear pauta' });
  await dialog.getByLabel('Nome da pauta').fill('Nome trocado pela lista');
  await dialog.getByRole('button', { name: 'Salvar nome' }).click();
  await expect(page.getByTestId(`rundown-${target}`)).toContainText('Nome trocado pela lista');

  await page.reload();
  await expect(page.getByTestId(`rundown-${target}`)).toContainText('Nome trocado pela lista');
  await expect(page.getByTestId(`rundown-${neighbour}`)).toContainText('Pauta vizinha da lista');
});

test('AC-pauta-revelavel-04 — "Duplicar" creates "{nome} (cópia)" right below with every block', async ({
  page,
  request
}) => {
  const source = await createRundown(page, 'Roteiro para copiar');
  await writeNewBlock(page, 'Bloco copiado');
  await waitSaved(page);
  await page.goto('/#/rundowns');

  await page.getByTestId(`rundown-${source}`).getByRole('button', { name: 'Duplicar', exact: true }).click();
  await expect(page.getByText('Cópia criada. Ela começa do zero: tudo como planejado.')).toBeVisible();
  const sourceRow = page.getByTestId(`rundown-${source}`);
  const copyRow = sourceRow.locator('xpath=following-sibling::div[1]');
  await expect(copyRow).toContainText('Roteiro para copiar (cópia)');

  await copyRow.getByRole('button', { name: 'Roteiro para copiar (cópia)', exact: true }).click();
  // The take of the copy starts from the plan: the block, planned hidden, is not on screen until revealed.
  await expect(page.getByTestId('sheet-counter')).toHaveText(/0\s+de\s+1\s+na tela/);
  await page.keyboard.press('PageDown');
  await expect(blockText(page, 0)).toHaveText('Bloco copiado');
  const copyId = rundownIdFromUrl(page);
  const copy = await fetchSheet(request, copyId);
  expect(plain(copy)).toEqual(['Bloco copiado']);
  expect(copy.blocks[0].plannedVisible).toBe(false);
});

test('AC-pauta-revelavel-05 — deleting asks "Apagar pauta?"; Cancel and Esc keep it, confirming removes it', async ({
  page
}) => {
  const id = await createRundown(page, 'Pauta descartável');
  await page.goto('/#/rundowns');
  const row = page.getByTestId(`rundown-${id}`);

  await row.getByRole('button', { name: 'Apagar Pauta descartável' }).click();
  const dialog = page.getByRole('dialog', { name: 'Apagar pauta?' });
  await expect(dialog).toContainText('Não dá para desfazer.');
  await dialog.getByRole('button', { name: 'Cancelar' }).click();
  await expect(dialog).toBeHidden();
  await expect(row).toBeVisible();

  await row.getByRole('button', { name: 'Apagar Pauta descartável' }).click();
  await expect(dialog).toBeVisible();
  // Focus stays inside the modal while it is open (AC-pauta-revelavel-53).
  for (let step = 0; step < 4; step += 1) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(row).toBeVisible();

  await row.getByRole('button', { name: 'Apagar Pauta descartável' }).click();
  await dialog.getByRole('button', { name: 'Apagar pauta' }).click();
  await expect(page.getByText('Pauta apagada.')).toBeVisible();
  await expect(row).toHaveCount(0);
});

test('AC-pauta-revelavel-06 — each row shows blocks, "na tela no início", "editada há…", the pin control and pinned rows first', async ({
  page,
  request
}) => {
  const id = await createRundown(page, 'Pauta com contagem');
  await writeNewBlock(page, 'um');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await page.keyboard.type('dois');
  await waitSaved(page);
  await page.goto('/#/rundowns');

  const row = page.getByTestId(`rundown-${id}`);
  await expect(row).toContainText('2 blocos');
  await expect(row).toContainText('0 na tela no início');
  await expect(row).toContainText(/editada (agora|há)/);

  await row.getByRole('button', { name: 'Fixar', exact: true }).click();
  await expect(page.getByText('Pauta fixada no topo.')).toBeVisible();
  await expect(page.locator('.rundown-row').first()).toHaveAttribute('data-testid', `rundown-${id}`);
  await expect(row.getByRole('button', { name: 'Desafixar', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await row.getByRole('button', { name: 'Desafixar', exact: true }).click();
  await expect(row.getByRole('button', { name: 'Fixar', exact: true })).toBeVisible();
  expect((await listRundowns(request)).find((rundown) => rundown.id === id)?.pinned).toBe(false);
});

test('AC-pauta-revelavel-57 — the list shows the skeleton while loading and "Tentar de novo" when the server is down', async ({
  page
}) => {
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/rundowns', async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto('/#/rundowns');
  await expect(page.getByTestId('loading-skeleton')).toBeVisible();
  release();
  await expect(page.getByRole('heading', { level: 1, name: 'Pautas' })).toBeVisible();
  await page.unroute('**/api/rundowns');

  await page.route('**/api/**', (route) => route.abort());
  await page.goto('/');
  await expect(page.getByTestId('error-banner')).toBeVisible();
  await page.unroute('**/api/**');
  await page.getByRole('button', { name: 'Tentar de novo' }).click();
  await expect(page).toHaveURL(/#\/(rundowns|rundown\/)/);
});
