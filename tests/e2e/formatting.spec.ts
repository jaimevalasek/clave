import { expect, test } from './fixtures';
import type { Page } from '@playwright/test';
import { blockText, createRundown, fetchSheet, seedSheet, sheetBlocks, waitSaved } from './helpers';
import { textDraft } from '../helpers/sheetFixtures';

/**
 * Formatting through the real interface (CAP-pauta-revelavel-formatacao):
 * the size bar above a text block, A−/A+ inside the range of the size, and
 * bold and color on a selected passage. Every change is read on the screen,
 * then on the server, then again after a reload.
 */

const shown = { plannedVisible: true, takeVisible: true };

function sizeBar(page: Page, index: number) {
  return sheetBlocks(page).nth(index).getByTestId('size-bar');
}

/** Selects the characters `start..end` of a block text with the keyboard, as a presenter would. */
async function selectPassage(page: Page, index: number, start: number, end: number): Promise<void> {
  await blockText(page, index).click();
  await page.keyboard.press('Control+Home');
  for (let step = 0; step < start; step += 1) await page.keyboard.press('ArrowRight');
  for (let step = start; step < end; step += 1) await page.keyboard.press('Shift+ArrowRight');
}

async function runsOf(request: Parameters<typeof fetchSheet>[0], id: string, index = 0) {
  return (await fetchSheet(request, id)).blocks[index].content;
}

test('AC-pauta-revelavel-35 — focusing a text shows P, M, G and Título with the default sizes; Ctrl+Alt+1 to 4 do the same', async ({
  page,
  request
}) => {
  const id = await createRundown(page, 'Tamanhos do bloco');
  await seedSheet(page, request, id, [textDraft('a', 'Abertura do episódio', shown), textDraft('b', 'Depois', shown)]);

  await expect(sizeBar(page, 0)).toHaveCSS('opacity', '0');
  await blockText(page, 0).click();
  const bar = sizeBar(page, 0);
  await expect(bar).toHaveCSS('opacity', '1');
  await expect(bar.getByRole('radio')).toHaveText(['P', 'M', 'G', 'Título']);
  await expect(bar.getByRole('radio', { name: 'Médio' })).toHaveAttribute('aria-checked', 'true');

  const expected: [string, string, string][] = [
    ['Pequeno', 'small', '22px'],
    ['Médio', 'medium', '30px'],
    ['Grande', 'large', '38px'],
    ['Título', 'title', '52px']
  ];
  for (const [name, size, px] of expected) {
    await bar.getByRole('radio', { name }).click();
    await expect(sheetBlocks(page).nth(0)).toHaveAttribute('data-size', size);
    await expect(blockText(page, 0)).toHaveCSS('font-size', px);
    await expect(bar.getByTestId('size-px')).toHaveText(px);
    // The caret stays in the text: the presenter keeps writing.
    await expect(blockText(page, 0)).toBeFocused();
  }

  // Ctrl+Alt+1 to 4 with the caret in the text.
  for (const [key, [, size, px]] of expected.entries()) {
    await page.keyboard.press(`Control+Alt+Digit${key + 1}`);
    await expect(sheetBlocks(page).nth(0)).toHaveAttribute('data-size', size);
    await expect(blockText(page, 0)).toHaveCSS('font-size', px);
  }
  await expect(blockText(page, 0)).toHaveText('Abertura do episódio');

  // The title uses a tight line height and completes its height up to the
  // ruled-paper step, so the next block lands back on the lines.
  await expect(blockText(page, 0)).toHaveCSS('line-height', '58.24px');
  const height = await sheetBlocks(page).nth(0).evaluate((element) => element.getBoundingClientRect().height);
  expect(Math.abs(height / 44 - Math.round(height / 44))).toBeLessThan(0.02);

  // A new size starts at its default: the fine adjustment goes back to zero.
  await bar.getByRole('button', { name: 'Aumentar tamanho' }).click();
  await expect(blockText(page, 0)).toHaveCSS('font-size', '56px');
  await bar.getByRole('radio', { name: 'Grande' }).click();
  await expect(blockText(page, 0)).toHaveCSS('font-size', '38px');
  await waitSaved(page);
  expect((await fetchSheet(request, id)).blocks[0]).toMatchObject({ size: 'large', fontPx: 38 });
});

test('AC-pauta-revelavel-36 — A− and A+ move 4 px inside the range, show the value, stop at the limit and persist', async ({
  page,
  request
}) => {
  const id = await createRundown(page, 'Ajuste fino');
  await seedSheet(page, request, id, [textDraft('a', 'Título da live', { ...shown, size: 'title', fontPx: 52 })]);

  await blockText(page, 0).click();
  const bar = sizeBar(page, 0);
  const smaller = bar.getByRole('button', { name: 'Diminuir tamanho' });
  const larger = bar.getByRole('button', { name: 'Aumentar tamanho' });
  await expect(bar.getByTestId('size-px')).toHaveText('52px');

  await larger.click();
  await expect(bar.getByTestId('size-px')).toHaveText('56px');
  await expect(blockText(page, 0)).toHaveCSS('font-size', '56px');

  for (const px of ['52px', '48px', '44px']) {
    await smaller.click();
    await expect(bar.getByTestId('size-px')).toHaveText(px);
  }
  await expect(smaller).toBeDisabled();
  await expect(larger).toBeEnabled();

  // Ctrl+Alt+= and Ctrl+Alt+− with the caret in the text; at the limit a toast explains the range.
  await blockText(page, 0).click();
  await page.keyboard.press('Control+Alt+Equal');
  await expect(bar.getByTestId('size-px')).toHaveText('48px');
  await page.keyboard.press('Control+Alt+Minus');
  await expect(bar.getByTestId('size-px')).toHaveText('44px');
  await page.keyboard.press('Control+Alt+Minus');
  await expect(
    page.getByTestId('toast').filter({ hasText: 'Título vai de 44 a 72px. Para passar disso, troque o tamanho.' })
  ).toBeVisible();
  await expect(bar.getByTestId('size-px')).toHaveText('44px');
  await page.keyboard.press('Control+Alt+Equal');
  await expect(blockText(page, 0)).toHaveText('Título da live');

  await expect.poll(async () => (await fetchSheet(request, id)).blocks[0].fontPx).toBe(48);
  await page.reload();
  await expect(blockText(page, 0)).toHaveCSS('font-size', '48px');
  await blockText(page, 0).click();
  await expect(sizeBar(page, 0).getByTestId('size-px')).toHaveText('48px');

  // The small size goes up to 26 px and stops there.
  await sizeBar(page, 0).getByRole('radio', { name: 'Pequeno' }).click();
  await larger.click();
  await expect(sizeBar(page, 0).getByTestId('size-px')).toHaveText('26px');
  await expect(sizeBar(page, 0).getByRole('button', { name: 'Aumentar tamanho' })).toBeDisabled();
  await expect.poll(async () => (await fetchSheet(request, id)).blocks[0]).toMatchObject({ size: 'small', fontPx: 26 });
});

test('AC-pauta-revelavel-37 — a selected passage gets bold and a color of the theme; "Normal" removes both; it persists', async ({
  page,
  request
}) => {
  const id = await createRundown(page, 'Destaque no trecho');
  await seedSheet(page, request, id, [textDraft('a', 'Hoje vamos falar de filas', shown)]);

  await selectPassage(page, 0, 5, 10);
  const bar = page.getByRole('toolbar', { name: 'Formatar trecho' });
  await expect(bar).toBeVisible();
  // The format bar is in charge while a passage is selected: the size bar steps aside.
  await expect(sizeBar(page, 0)).toHaveCSS('opacity', '0');
  const names = ['Negrito', 'Cor: Texto', 'Cor: Destaque', 'Cor: Vermelho', 'Cor: Verde', 'Cor: Cobre', 'Cor: Lilás', 'Normal'];
  await expect(bar.getByRole('button')).toHaveCount(names.length);
  for (const [index, name] of names.entries()) {
    await expect(bar.getByRole('button').nth(index)).toHaveAccessibleName(name);
  }

  await bar.getByRole('button', { name: 'Cor: Vermelho' }).click();
  const red = blockText(page, 0).locator('[data-color="red"]');
  await expect(red).toHaveText('vamos');
  await expect(red).toHaveCSS('color', 'rgb(239, 111, 111)');
  // The selection is still on the passage: Ctrl+B goes to the same five letters.
  await page.keyboard.press('Control+b');
  await expect(blockText(page, 0).locator('b')).toHaveText('vamos');
  await expect(blockText(page, 0).locator('b')).toHaveCSS('font-weight', '700');
  await expect(bar.getByRole('button', { name: 'Negrito' })).toHaveAttribute('aria-pressed', 'true');
  await expect(blockText(page, 0)).toHaveText('Hoje vamos falar de filas');

  await expect
    .poll(() => runsOf(request, id))
    .toEqual([{ text: 'Hoje ' }, { text: 'vamos', bold: true, color: 'red' }, { text: ' falar de filas' }]);

  await page.reload();
  await expect(blockText(page, 0).locator('b [data-color="red"]')).toHaveText('vamos');

  // Ctrl+B on a passage that is all bold takes the bold away; "Normal" clears the rest.
  await selectPassage(page, 0, 20, 25);
  await page.keyboard.press('Control+b');
  await expect(blockText(page, 0).locator('b')).toHaveText(['vamos', 'filas']);
  await page.keyboard.press('Control+b');
  await expect(blockText(page, 0).locator('b')).toHaveText(['vamos']);

  await selectPassage(page, 0, 0, 10);
  await page.getByRole('toolbar', { name: 'Formatar trecho' }).getByRole('button', { name: 'Normal' }).click();
  await expect(blockText(page, 0).locator('b, [data-color]')).toHaveCount(0);
  await expect.poll(() => runsOf(request, id)).toEqual([{ text: 'Hoje vamos falar de filas' }]);

  // A collapsed caret has no passage: no bar, and Ctrl+B changes nothing.
  await blockText(page, 0).click();
  await page.keyboard.press('End');
  await expect(page.getByRole('toolbar', { name: 'Formatar trecho' })).toHaveCount(0);
  await page.keyboard.press('Control+b');
  await page.keyboard.type(' hoje');
  await expect(blockText(page, 0).locator('b')).toHaveCount(0);
  await waitSaved(page);
  expect(await runsOf(request, id)).toEqual([{ text: 'Hoje vamos falar de filas hoje' }]);
});

test('AC-pauta-revelavel-53 — after Esc the size controls of a block are reachable with Tab and work with the keyboard', async ({
  page,
  request
}) => {
  const id = await createRundown(page, 'Teclado nos tamanhos');
  await seedSheet(page, request, id, [textDraft('a', 'Bloco', shown)]);

  await blockText(page, 0).click();
  await page.keyboard.press('Escape');
  await expect(blockText(page, 0)).not.toBeFocused();
  await page.keyboard.press('Tab');
  const small = sizeBar(page, 0).getByRole('radio', { name: 'Pequeno' });
  await expect(small).toBeFocused();
  await expect(sizeBar(page, 0)).toHaveCSS('opacity', '1');
  await page.keyboard.press('Enter');
  await expect(sheetBlocks(page).nth(0)).toHaveAttribute('data-size', 'small');

  for (let step = 0; step < 4; step += 1) await page.keyboard.press('Tab');
  await expect(sizeBar(page, 0).getByRole('button', { name: 'Diminuir tamanho' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(sizeBar(page, 0).getByTestId('size-px')).toHaveText('18px');
  await expect.poll(async () => (await fetchSheet(request, id)).blocks[0]).toMatchObject({ size: 'small', fontPx: 18 });
});

test('AC-pauta-revelavel-54 — at 360 px the size and format bars wrap inside the screen with 44 px targets', async ({
  page,
  request
}) => {
  const id = await createRundown(page, 'Barras no celular');
  await seedSheet(page, request, id, [
    textDraft('a', 'Um título que ocupa a largura do celular', { ...shown, size: 'title', fontPx: 52 })
  ]);
  await page.setViewportSize({ width: 360, height: 740 });

  await blockText(page, 0).click();
  const bar = sizeBar(page, 0);
  await expect(bar).toHaveCSS('opacity', '1');
  const box = await bar.boundingBox();
  expect(box).not.toBeNull();
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(360);
  // Two rows: the sizes, then A−, A+ and the value.
  expect(box?.height ?? 0).toBeGreaterThan(88);
  for (const button of await bar.getByRole('button').all()) {
    expect((await button.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
  }

  await selectPassage(page, 0, 3, 9);
  const toolbar = page.getByRole('toolbar', { name: 'Formatar trecho' });
  await expect(toolbar).toBeVisible();
  const toolbarBox = await toolbar.boundingBox();
  expect(toolbarBox?.x ?? -1).toBeGreaterThanOrEqual(0);
  expect((toolbarBox?.x ?? 0) + (toolbarBox?.width ?? 999)).toBeLessThanOrEqual(360);
  for (const button of await toolbar.getByRole('button').all()) {
    const target = await button.boundingBox();
    expect(target?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(target?.width ?? 0).toBeGreaterThanOrEqual(44);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});
