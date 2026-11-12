import { expect, test } from './fixtures';
import {
  blockText,
  createRundown,
  fetchSheet,
  outline,
  screenOutline,
  seedSheet,
  sheetBlocks,
  uploadPng,
  writeNewBlock
} from './helpers';
import { mediaDraft, textDraft } from '../helpers/sheetFixtures';

/**
 * Sub-items through the real interface: Tab and Shift+Tab (or Alt+→/←) on the
 * sheet, the marks of each level, and the subtree that goes along when a topic
 * moves or leaves. Each change is read on the screen and then on the server.
 */

const shown = { plannedVisible: true, takeVisible: true };

test('AC-pauta-revelavel-40 — Tab indents the text in edition and Shift+Tab brings it back, one size down and up', async ({
  page,
  request
}) => {
  const id = await createRundown(page, 'Recuo com Tab');
  await writeNewBlock(page, 'Tópico');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Ponto');

  const point = sheetBlocks(page).nth(1);
  await page.keyboard.press('Tab');
  await expect(point).toHaveAttribute('data-depth', '1');
  await expect(point).toHaveAttribute('data-size', 'small');
  await expect(blockText(page, 1)).toHaveCSS('font-size', '22px');
  // The caret stays in the text: typing goes on in the same block, with no tab character.
  await expect(blockText(page, 1)).toBeFocused();
  await page.keyboard.type(' um');
  await expect(blockText(page, 1)).toHaveText('Ponto um');
  await expect.poll(() => outline(request, id)).toEqual(['0:Tópico', '1:Ponto um']);

  await page.keyboard.press('Shift+Tab');
  await expect(point).toHaveAttribute('data-depth', '0');
  await expect(point).toHaveAttribute('data-size', 'medium');
  await expect(blockText(page, 1)).toHaveCSS('font-size', '30px');

  await page.keyboard.press('Alt+ArrowRight');
  await expect(point).toHaveAttribute('data-depth', '1');
  await expect.poll(async () => (await fetchSheet(request, id)).blocks.map((block) => [block.depth, block.size, block.fontPx])).toEqual([
    [0, 'medium', 30],
    [1, 'small', 22]
  ]);
  await page.keyboard.press('Alt+ArrowLeft');
  await expect(point).toHaveAttribute('data-depth', '0');
  await expect.poll(() => outline(request, id)).toEqual(['0:Tópico', '0:Ponto um']);
});

test('AC-pauta-revelavel-40 — Enter then Tab on the new line makes it a sub-item with "–" and leaves the topic as it was', async ({
  page,
  request
}) => {
  const id = await createRundown(page, 'Enter e Tab');
  await writeNewBlock(page, 'Tópico 01');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');

  const topic = sheetBlocks(page).nth(0);
  const item = sheetBlocks(page).nth(1);
  await expect(sheetBlocks(page)).toHaveCount(2);
  await expect(topic).toHaveAttribute('data-depth', '0');
  await expect(topic).toHaveAttribute('data-size', 'medium');
  await expect(topic.getByTestId('block-bullet')).toHaveCount(0);
  await expect(blockText(page, 0)).toHaveText('Tópico 01');
  await expect(item).toHaveAttribute('data-depth', '1');
  await expect(item).toHaveAttribute('data-size', 'small');
  await expect(item.getByTestId('block-bullet')).toHaveText('–');
  // The caret goes to the sub-item: typing lands there, with no tab character.
  await expect(blockText(page, 1)).toBeFocused();
  await page.keyboard.type('teste do topico 01');
  await expect(blockText(page, 1)).toHaveText('teste do topico 01');
  await expect.poll(() => outline(request, id)).toEqual(['0:Tópico 01', '1:teste do topico 01']);

  // In a sub-item Enter opens the next item; Tab takes it one level down, and
  // past level 2 the toast refuses and nothing changes.
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await page.keyboard.type('detalhe');
  await expect.poll(() => screenOutline(page)).toEqual(['0:Tópico 01', '1:teste do topico 01', '2:detalhe']);
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('toast').filter({ hasText: 'A pauta vai até 3 níveis: o tópico e dois níveis de sub-item.' })).toBeVisible();
  await expect.poll(() => screenOutline(page)).toEqual(['0:Tópico 01', '1:teste do topico 01', '2:detalhe', '2:']);
  await expect(blockText(page, 3)).toBeFocused();
});

test('AC-pauta-revelavel-40 — in a sub-item Enter opens the next item with "–", Shift+Tab goes up a level, Enter on an empty item leaves the list; the items sit line under line', async ({
  page,
  request
}) => {
  const id = await createRundown(page, 'Lista com Enter');
  await writeNewBlock(page, 'Teste');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await page.keyboard.type('Teste item 1');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await page.keyboard.type('Teste 1.1');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.type('Teste item 2');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await page.keyboard.type('Teste 2.1');
  // Enter on an empty item goes one level up, down to a topic.
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Outro tópico');

  const expected = ['0:Teste', '1:Teste item 1', '2:Teste 1.1', '1:Teste item 2', '2:Teste 2.1', '0:Outro tópico'];
  await expect.poll(() => screenOutline(page)).toEqual(expected);
  await expect.poll(() => outline(request, id)).toEqual(expected);
  const marks = await sheetBlocks(page).evaluateAll((elements) =>
    elements.map((element) => element.querySelector('[data-testid="block-bullet"]')?.textContent ?? '')
  );
  expect(marks).toEqual(['', '–', '–', '–', '–', '']);
  // Back up a level, the item takes the size of the item above it in the list.
  await expect(sheetBlocks(page).nth(3)).toHaveAttribute('data-size', 'small');
  await expect(blockText(page, 3)).toHaveCSS('font-size', '22px');
  await expect(blockText(page, 1)).toHaveCSS('font-size', '22px');

  // No blank line inside the list: each item lands on the next line of the paper.
  const top = await sheetBlocks(page).evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().top));
  const lines = top.slice(1).map((y, index) => Math.round(y - top[index]));
  expect(lines.slice(0, 4)).toEqual([44, 44, 44, 44]);
  // A new topic keeps the blank line that separates the groups.
  expect(lines[4]).toBe(88);
});

test('AC-pauta-revelavel-40 — Shift+Enter breaks the line inside an item; Shift+Tab on that line takes it one level up as its own item', async ({
  page,
  request
}) => {
  const id = await createRundown(page, 'Linha dentro do item');
  await seedSheet(page, request, id, [
    textDraft('a', 'Teste', shown),
    textDraft('b', 'Teste item 1', { ...shown, depth: 1, size: 'medium', fontPx: 30 }),
    textDraft('c', 'Teste 1.1', { ...shown, depth: 2, size: 'small', fontPx: 22 })
  ]);

  await blockText(page, 2).click();
  await page.keyboard.press('End');
  await page.keyboard.press('Shift+Enter');
  await page.keyboard.type('Teste item 2');
  await expect.poll(() => outline(request, id)).toEqual(['0:Teste', '1:Teste item 1', '2:Teste 1.1\nTeste item 2']);

  await page.keyboard.press('Shift+Tab');
  await expect.poll(() => screenOutline(page)).toEqual(['0:Teste', '1:Teste item 1', '2:Teste 1.1', '1:Teste item 2']);
  await expect(sheetBlocks(page).nth(3)).toHaveAttribute('data-size', 'medium');
  await expect(blockText(page, 3)).toBeFocused();
  await expect.poll(() => outline(request, id)).toEqual(['0:Teste', '1:Teste item 1', '2:Teste 1.1', '1:Teste item 2']);
});

test('AC-pauta-revelavel-40 — Tab after typing the second line makes that line the sub-item, caret kept; the topic under a title has no mark', async ({
  page,
  request
}) => {
  const id = await createRundown(page, 'Tab no fim da linha');
  await writeNewBlock(page, 'Teste de titulo');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Tópico 01');
  await page.keyboard.press('Enter');
  await page.keyboard.type('teste do topico');
  await page.keyboard.press('Tab');

  await expect.poll(() => screenOutline(page)).toEqual(['0:Teste de titulo', '0:Tópico 01', '1:teste do topico']);
  await expect(sheetBlocks(page).nth(1).getByTestId('block-bullet')).toHaveCount(0);
  await expect(sheetBlocks(page).nth(2).getByTestId('block-bullet')).toHaveText('–');
  // The caret stays at the end of the line it was on.
  await expect(blockText(page, 2)).toBeFocused();
  await page.keyboard.type(' 01');
  await expect.poll(() => outline(request, id)).toEqual(['0:Teste de titulo', '0:Tópico 01', '1:teste do topico 01']);

  // On the first line of a text, Tab still indents the whole block with its sub-items.
  await blockText(page, 1).click();
  await page.keyboard.press('End');
  await page.keyboard.press('Tab');
  await expect.poll(() => screenOutline(page)).toEqual(['0:Teste de titulo', '1:Tópico 01', '2:teste do topico 01']);
});

test('AC-pauta-revelavel-40 — without a topic right above, or past level 2, a toast refuses and nothing changes', async ({
  page,
  request
}) => {
  const id = await createRundown(page, 'Recusas do Tab');
  await seedSheet(page, request, id, [
    textDraft('a', 'Primeiro', shown),
    textDraft('b', 'Ponto', { ...shown, depth: 1, size: 'small', fontPx: 22 }),
    textDraft('c', 'Detalhe', { ...shown, depth: 2, size: 'small', fontPx: 22 }),
    textDraft('d', 'Outro detalhe', { ...shown, depth: 2, size: 'small', fontPx: 22 })
  ]);
  const before = await screenOutline(page);

  await blockText(page, 0).click();
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('toast').filter({ hasText: 'Para virar sub-item, o bloco precisa de um tópico logo acima.' })).toBeVisible();
  await expect(blockText(page, 0)).toBeFocused();
  expect(await screenOutline(page)).toEqual(before);

  // A level-2 block right under a level-1 one has no topic right above it either.
  await blockText(page, 2).click();
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('toast').filter({ hasText: 'Para virar sub-item, o bloco precisa de um tópico logo acima.' })).toHaveCount(2);

  await blockText(page, 3).click();
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('toast').filter({ hasText: 'A pauta vai até 3 níveis: o tópico e dois níveis de sub-item.' })).toBeVisible();
  expect(await screenOutline(page)).toEqual(before);
  expect(await outline(request, id)).toEqual(['0:Primeiro', '1:Ponto', '2:Detalhe', '2:Outro detalhe']);
});

test('AC-pauta-revelavel-40 — a topic takes its sub-items along, and a media block indents with Tab too', async ({
  page,
  request
}) => {
  const id = await createRundown(page, 'Recuo da subárvore');
  const png = await uploadPng(request, 'quadro.png');
  await seedSheet(page, request, id, [
    textDraft('a', 'Abertura', shown),
    textDraft('b', 'Tema', shown),
    textDraft('c', 'Ponto do tema', { ...shown, depth: 1, size: 'small', fontPx: 22 }),
    mediaDraft('m', 'image', png, { ...shown, mediaName: 'quadro.png' })
  ]);

  await blockText(page, 1).click();
  await page.keyboard.press('Tab');
  await expect.poll(() => screenOutline(page)).toEqual(['0:Abertura', '1:Tema', '2:Ponto do tema', '0:image']);

  // A media block has no text: clicking it puts the focus on the block itself.
  await sheetBlocks(page).nth(3).getByTestId('media-image').click();
  await expect(sheetBlocks(page).nth(3)).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(sheetBlocks(page).nth(3)).toHaveAttribute('data-depth', '1');
  await expect.poll(() => outline(request, id)).toEqual(['0:Abertura', '1:Tema', '2:Ponto do tema', '1:image']);

  await page.keyboard.press('Shift+Tab');
  await expect(sheetBlocks(page).nth(3)).toHaveAttribute('data-depth', '0');
  await page.reload();
  await expect.poll(() => screenOutline(page)).toEqual(['0:Abertura', '1:Tema', '2:Ponto do tema', '0:image']);
});

test('AC-pauta-revelavel-41 — levels 1 and 2 show "–", in the accent colour, indented with a guide line; a topic has no mark', async ({
  page,
  request
}) => {
  const id = await createRundown(page, 'Marcadores');
  await seedSheet(page, request, id, [
    textDraft('a', 'Tópico', shown),
    textDraft('b', 'Ponto', { ...shown, depth: 1, size: 'small', fontPx: 22 }),
    textDraft('c', 'Detalhe', { ...shown, depth: 2, size: 'small', fontPx: 22 })
  ]);

  await expect(sheetBlocks(page).nth(0).getByTestId('block-bullet')).toHaveCount(0);
  await expect(sheetBlocks(page).nth(0).locator('.guide')).toHaveCount(0);
  await expect(sheetBlocks(page).nth(1).getByTestId('block-bullet')).toHaveText('–');
  await expect(sheetBlocks(page).nth(2).getByTestId('block-bullet')).toHaveText('–');

  const accent = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
  expect(accent.toLowerCase()).toBe('#e8ba52');
  await expect(sheetBlocks(page).nth(1).getByTestId('block-bullet')).toHaveCSS('color', 'rgb(232, 186, 82)');
  await expect(sheetBlocks(page).nth(2).getByTestId('block-bullet')).toHaveCSS('color', 'rgb(232, 186, 82)');

  const x = await sheetBlocks(page).evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().left));
  expect(x[1] - x[0]).toBe(56);
  expect(x[2] - x[1]).toBe(56);
  // The guide line climbs from the sub-item into the gap under its topic.
  const guide = await sheetBlocks(page).nth(1).locator('.guide').boundingBox();
  const topic = await sheetBlocks(page).nth(0).boundingBox();
  expect(guide && topic && guide.y).toBeLessThanOrEqual((topic?.y ?? 0) + (topic?.height ?? 0) + 1);
  expect(guide?.x ?? 0).toBeGreaterThan(topic?.x ?? 0);
});

test('AC-pauta-revelavel-11 — Enter twice at the end of a topic with sub-items opens its first sub-item; Backspace on an empty topic lifts its sub-items', async ({
  page,
  request
}) => {
  const id = await createRundown(page, 'Enter e Backspace com sub-itens');
  await seedSheet(page, request, id, [
    textDraft('a', 'Tópico', shown),
    textDraft('b', 'Ponto', { ...shown, depth: 1, size: 'small', fontPx: 22 }),
    textDraft('e', '', { ...shown, content: [] }),
    textDraft('f', 'Filho', { ...shown, depth: 1, size: 'small', fontPx: 22 }),
    textDraft('g', 'Neto', { ...shown, depth: 2, size: 'small', fontPx: 22 })
  ]);

  await blockText(page, 0).click();
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await expect(sheetBlocks(page)).toHaveCount(6);
  await expect(blockText(page, 1)).toBeFocused();
  await expect(sheetBlocks(page).nth(1)).toHaveAttribute('data-depth', '1');
  await expect(sheetBlocks(page).nth(1)).toHaveAttribute('data-size', 'small');
  await page.keyboard.type('Primeiro ponto');
  await expect.poll(() => outline(request, id)).toEqual(['0:Tópico', '1:Primeiro ponto', '1:Ponto', '0:', '1:Filho', '2:Neto']);

  await blockText(page, 3).click();
  await page.keyboard.press('Backspace');
  await expect(sheetBlocks(page)).toHaveCount(5);
  await expect.poll(() => screenOutline(page)).toEqual(['0:Tópico', '1:Primeiro ponto', '1:Ponto', '0:Filho', '1:Neto']);
  await expect.poll(() => outline(request, id)).toEqual(['0:Tópico', '1:Primeiro ponto', '1:Ponto', '0:Filho', '1:Neto']);
});

test('AC-pauta-revelavel-42 — moving a topic takes the subtree; deleting it lifts the sub-items and says so in the modal', async ({
  page,
  request
}) => {
  const id = await createRundown(page, 'Subárvore inteira');
  await seedSheet(page, request, id, [
    textDraft('a', 'Abertura', shown),
    textDraft('a1', 'Ponto A', { ...shown, depth: 1, size: 'small', fontPx: 22 }),
    textDraft('b', 'Meio', shown),
    textDraft('b1', 'Ponto B', { ...shown, depth: 1, size: 'small', fontPx: 22 }),
    textDraft('b2', 'Detalhe B', { ...shown, depth: 2, size: 'small', fontPx: 22 }),
    textDraft('c', 'Fim', shown)
  ]);

  await blockText(page, 2).click();
  await page.keyboard.press('Alt+ArrowUp');
  const moved = ['0:Meio', '1:Ponto B', '2:Detalhe B', '0:Abertura', '1:Ponto A', '0:Fim'];
  await expect.poll(() => screenOutline(page)).toEqual(moved);
  await expect.poll(() => outline(request, id)).toEqual(moved);

  const topic = sheetBlocks(page).nth(0);
  await topic.hover();
  await topic.getByTestId('block-remove').click();
  const dialog = page.getByRole('dialog', { name: 'Apagar bloco?' });
  await expect(dialog).toContainText('Os sub-itens dele sobem um nível.');
  await expect(dialog).toContainText('Não dá para desfazer.');
  await dialog.getByRole('button', { name: 'Apagar bloco' }).click();
  await expect(dialog).toHaveCount(0);

  const lifted = ['0:Ponto B', '1:Detalhe B', '0:Abertura', '1:Ponto A', '0:Fim'];
  await expect.poll(() => screenOutline(page)).toEqual(lifted);
  await expect.poll(() => outline(request, id)).toEqual(lifted);
  await page.reload();
  await expect.poll(() => screenOutline(page)).toEqual(lifted);
});
