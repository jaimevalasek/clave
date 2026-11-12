import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { blockText, createRundown, fetchSheet, seedSheet, sheetBlocks, waitSaved } from './helpers';
import { textDraft } from '../helpers/sheetFixtures';
import type { SheetBlockDraft } from '../helpers/sheetFixtures';

/**
 * Reveal through the real interface: PageDown, Shift+PageDown, PageUp, the
 * ruler buttons, the eye, the preparation view (F2) and "Nova tomada". With
 * the preparation view off the page holds only what is on screen, so every
 * assertion reads the blocks that exist in the page, then the server.
 */

const visible = { plannedVisible: true, takeVisible: true };
const small = { size: 'small' as const, fontPx: 22 };

/** Ten blocks with sub-items: only "Abertura" starts visible. */
function script(): SheetBlockDraft[] {
  return [
    textDraft('k0', 'Abertura', visible),
    textDraft('k1', 'Tema do dia'),
    textDraft('k2', 'Contexto', { depth: 1, ...small }),
    textDraft('k3', 'Detalhe do contexto', { depth: 2, ...small }),
    textDraft('k4', 'Exemplo', { depth: 1, ...small }),
    textDraft('k5', 'Segunda parte'),
    textDraft('k6', 'Ponto A', { depth: 1, ...small }),
    textDraft('k7', 'Ponto B', { depth: 1, ...small }),
    textDraft('k8', 'Pergunta ao chat'),
    textDraft('k9', 'Encerramento')
  ];
}

/** The texts of the blocks that exist in the page, top to bottom. */
async function onScreen(page: Page): Promise<string[]> {
  return sheetBlocks(page).evaluateAll((elements) =>
    elements.map((element) => element.querySelector('[data-testid="block-text"]')?.textContent ?? '')
  );
}

function toast(page: Page, text: string) {
  return page.getByTestId('toast').filter({ hasText: text });
}

async function openScript(page: Page, request: Parameters<typeof seedSheet>[1], title: string, blocks = script()) {
  const id = await createRundown(page, title);
  await seedSheet(page, request, id, blocks);
  return id;
}

test('AC-pauta-revelavel-08 and AC-pauta-revelavel-22 — PageDown and "Revelar próximo" show one block at a time, crossing levels, and the sheet follows', async ({
  page,
  request
}) => {
  await page.setViewportSize({ width: 1280, height: 640 });
  await openScript(page, request, 'Um por vez');
  const ruler = page.getByTestId('sheet-ruler');
  for (const name of ['Ocultar último', 'Revelar próximo', 'Preparo', 'Nova tomada']) {
    await expect(ruler.getByRole('button', { name, exact: true })).toBeVisible();
  }
  await expect(page.getByTestId('sheet-counter')).toHaveText(/1\s+de\s+10\s+na tela/);
  expect(await onScreen(page)).toEqual(['Abertura']);

  await page.keyboard.press('PageDown');
  await expect.poll(() => onScreen(page)).toEqual(['Abertura', 'Tema do dia']);
  await ruler.getByRole('button', { name: 'Revelar próximo', exact: true }).click();
  await expect.poll(() => onScreen(page)).toEqual(['Abertura', 'Tema do dia', 'Contexto']);
  await page.keyboard.press('PageDown');
  await expect.poll(() => onScreen(page)).toEqual(['Abertura', 'Tema do dia', 'Contexto', 'Detalhe do contexto']);
  await expect(sheetBlocks(page).last()).toHaveAttribute('data-depth', '2');

  for (let press = 0; press < 6; press += 1) await page.keyboard.press('PageDown');
  await expect(page.getByTestId('sheet-counter')).toHaveText(/10\s+de\s+10\s+na tela/);
  // The last revealed block is brought into view.
  await expect(sheetBlocks(page).last()).toBeInViewport();
  await expect(sheetBlocks(page).last()).toContainText('Encerramento');
});

test('AC-pauta-revelavel-22 and AC-pauta-revelavel-32 — at the end "Fim da pauta · tudo na tela" shows and PageDown says everything is on screen; an empty sheet says so too', async ({
  page,
  request
}) => {
  await openScript(page, request, 'Fim da pauta', [textDraft('a', 'Primeiro', visible), textDraft('b', 'Último')]);
  await expect(page.getByTestId('sheet-end')).toHaveCount(0);
  await page.keyboard.press('PageDown');
  await expect(page.getByTestId('sheet-end')).toHaveText('Fim da pauta · tudo na tela');
  await page.keyboard.press('PageDown');
  await expect(toast(page, 'Tudo já está na tela.')).toBeVisible();

  await createRundown(page, 'Vazia');
  await page.keyboard.press('PageDown');
  await expect(toast(page, 'A pauta está vazia. Cole ou escreva o primeiro bloco.')).toBeVisible();
  await expect(sheetBlocks(page)).toHaveCount(0);
});

test('AC-pauta-revelavel-23 — PageUp and "Ocultar último" hide the last revealed block; with nothing revealed a toast says so', async ({
  page,
  request
}) => {
  await openScript(page, request, 'Ocultar último');
  await page.keyboard.press('PageDown');
  await page.keyboard.press('PageDown');
  await expect.poll(() => onScreen(page)).toEqual(['Abertura', 'Tema do dia', 'Contexto']);

  await page.keyboard.press('PageUp');
  await expect.poll(() => onScreen(page)).toEqual(['Abertura', 'Tema do dia']);
  await page.getByTestId('sheet-ruler').getByRole('button', { name: 'Ocultar último', exact: true }).click();
  await expect.poll(() => onScreen(page)).toEqual(['Abertura']);

  // "Abertura" starts visible: it was never revealed in this take.
  await page.keyboard.press('PageUp');
  await expect(toast(page, 'Nada foi revelado nesta tomada ainda.')).toBeVisible();
  expect(await onScreen(page)).toEqual(['Abertura']);
});

test('AC-pauta-revelavel-24 — Shift+PageDown reveals the next topic with all its sub-items and one PageUp hides the group', async ({
  page,
  request
}) => {
  await openScript(page, request, 'Tópico inteiro');
  await page.keyboard.press('Shift+PageDown');
  await expect
    .poll(() => onScreen(page))
    .toEqual(['Abertura', 'Tema do dia', 'Contexto', 'Detalhe do contexto', 'Exemplo']);
  await expect(toast(page, 'Tópico revelado com 3 sub-itens. PgUp oculta o grupo.')).toBeVisible();

  await page.keyboard.press('PageUp');
  await expect.poll(() => onScreen(page)).toEqual(['Abertura']);
});

test('AC-pauta-revelavel-25 and AC-pauta-revelavel-53 — the eye hides one block alone, a topic with its sub-items, with a toast, and is reachable by keyboard', async ({
  page,
  request
}) => {
  const id = await openScript(page, request, 'Olho', [
    textDraft('t', 'Tópico', visible),
    textDraft('a', 'Sub A', { ...visible, depth: 1, ...small }),
    textDraft('b', 'Sub B', { ...visible, depth: 1, ...small }),
    textDraft('u', 'Outro tópico', visible)
  ]);

  const subA = sheetBlocks(page).nth(1);
  await subA.hover();
  await subA.getByRole('button', { name: 'Ocultar este bloco' }).click();
  await expect.poll(() => onScreen(page)).toEqual(['Tópico', 'Sub B', 'Outro tópico']);
  await expect(toast(page, 'Bloco oculto. Ele volta com PgDn ou aparece esmaecido no preparo (F2).')).toBeVisible();

  // Keyboard only: from the first control of the ruler, Tab goes through the
  // ruler and reaches the eye of the first block before any text.
  await page.getByRole('link', { name: 'Voltar para as pautas' }).focus();
  let reached = false;
  for (let step = 0; step < 20 && !reached; step += 1) {
    await page.keyboard.press('Tab');
    reached = (await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))) === 'Ocultar este bloco';
  }
  expect(reached).toBe(true);
  await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'block-eye');
  const ring = await page.locator(':focus').evaluate((element) => getComputedStyle(element).outlineStyle);
  expect(ring).not.toBe('none');
  await page.keyboard.press('Enter');
  await expect.poll(() => onScreen(page)).toEqual(['Outro tópico']);
  await expect(toast(page, 'Tópico oculto junto com os sub-itens. Ele volta com PgDn.')).toBeVisible();
  await expect(page.getByTestId('sheet-counter')).toHaveText(/1\s+de\s+4\s+na tela/);

  // PageDown brings the topic back, and "Sub B" with it: it is still visible in the take.
  await page.keyboard.press('PageDown');
  await expect.poll(() => onScreen(page)).toEqual(['Tópico', 'Sub B', 'Outro tópico']);
  await waitSaved(page);
  const sheet = await fetchSheet(request, id);
  expect(sheet.blocks.map((block) => block.takeVisible)).toEqual([true, false, true, true]);
});

test('AC-pauta-revelavel-26 — PageDown, Shift+PageDown, PageUp and F2 work with the caret in a text and insert nothing', async ({
  page,
  request
}) => {
  await openScript(page, request, 'Atalhos no texto');
  await blockText(page, 0).click();
  await page.keyboard.press('End');

  await page.keyboard.press('PageDown');
  await expect.poll(() => onScreen(page)).toEqual(['Abertura', 'Tema do dia']);
  await page.keyboard.press('Shift+PageDown');
  await expect.poll(() => onScreen(page)).toEqual(['Abertura', 'Tema do dia', 'Contexto', 'Detalhe do contexto']);
  await page.keyboard.press('PageUp');
  await expect.poll(() => onScreen(page)).toEqual(['Abertura', 'Tema do dia']);
  await page.keyboard.press('F2');
  await expect(page.getByTestId('preparation-strip')).toBeVisible();
  await page.keyboard.press('F2');
  await expect(page.getByTestId('preparation-strip')).toHaveCount(0);

  // The caret never left "Abertura", and nothing was typed into it.
  await expect(blockText(page, 0)).toBeFocused();
  await expect(blockText(page, 0)).toHaveText('Abertura');
  await page.keyboard.type('!');
  await expect(blockText(page, 0)).toHaveText('Abertura!');
});

test('AC-pauta-revelavel-27 — with the preparation view off a hidden block is not in the page nor in the accessibility tree, and no text is spell checked', async ({
  page,
  request
}) => {
  await openScript(page, request, 'Captura', [
    textDraft('a', 'Na tela', visible),
    textDraft('s', 'Segredo da gravação'),
    textDraft('c', 'Filho do segredo', { ...visible, depth: 1, ...small })
  ]);
  await expect(page.getByText('Segredo da gravação')).toHaveCount(0);
  await expect(page.getByText('Filho do segredo')).toHaveCount(0);
  expect(await page.evaluate(() => document.body.innerHTML.includes('Segredo'))).toBe(false);
  const tree = await page.locator('body').ariaSnapshot();
  expect(tree).not.toContain('Segredo');
  expect(tree).not.toContain('Filho do segredo');
  await expect(page.getByRole('textbox', { name: 'Texto do bloco' })).toHaveCount(1);

  for (const editable of await page.locator('[contenteditable], input[type="text"]').all()) {
    await expect(editable).toHaveAttribute('spellcheck', 'false');
  }

  // Hiding by PageUp also takes the block out of the page.
  await page.keyboard.press('PageDown');
  await expect(page.getByText('Segredo da gravação')).toHaveCount(1);
  await page.keyboard.press('PageUp');
  await expect(page.getByText('Segredo da gravação')).toHaveCount(0);
});

test('AC-pauta-revelavel-28 — F2 and "Preparo" show the hidden blocks dimmed with hatching, the plan of each block and the warning strip', async ({
  page,
  request
}) => {
  const id = await openScript(page, request, 'Preparo', [
    textDraft('a', 'Visível', visible),
    textDraft('b', 'Oculto')
  ]);
  await page.keyboard.press('F2');
  const strip = page.getByTestId('preparation-strip');
  await expect(strip).toContainText('Preparo ligado');
  await expect(strip).toContainText('O que está esmaecido não aparece na gravação. Desligue com F2 antes de gravar.');
  await expect(toast(page, 'Preparo ligado: os ocultos aparecem esmaecidos só para você.')).toBeVisible();
  await expect(page.getByTestId('sheet-ruler').getByRole('button', { name: 'Preparo', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true'
  );

  await expect.poll(() => onScreen(page)).toEqual(['Visível', 'Oculto']);
  const ghost = sheetBlocks(page).nth(1);
  await expect(ghost).toHaveClass(/\bghost\b/);
  await expect(ghost.locator('.content')).toHaveCSS('opacity', '0.4');
  const hatch = await ghost.evaluate((element) => getComputedStyle(element, '::after').backgroundImage);
  expect(hatch).toContain('repeating-linear-gradient');
  await expect(sheetBlocks(page).nth(0).getByTestId('block-planned')).toHaveText('começa visível');
  await expect(ghost.getByTestId('block-planned')).toHaveText('começa oculto');

  // The plan changes; the take does not.
  await ghost.getByTestId('block-planned').click();
  await expect(ghost.getByTestId('block-planned')).toHaveText('começa visível');
  await expect(ghost).toHaveClass(/\bghost\b/);
  await waitSaved(page);
  expect((await fetchSheet(request, id)).blocks.map((block) => [block.plannedVisible, block.takeVisible])).toEqual([
    [true, true],
    [true, false]
  ]);

  // A block created in preparation is born dimmed and planned hidden (BR-pauta-revelavel-02).
  await page.getByTestId('sheet-continue').click();
  await page.keyboard.type('Preparado');
  await expect(sheetBlocks(page).nth(2)).toHaveClass(/\bghost\b/);
  await expect(sheetBlocks(page).nth(2).getByTestId('block-planned')).toHaveText('começa oculto');

  await page.getByTestId('sheet-ruler').getByRole('button', { name: 'Preparo', exact: true }).click();
  await expect(strip).toHaveCount(0);
  await expect(toast(page, 'Preparo desligado. A tela está pronta para gravar.')).toBeVisible();
  await expect.poll(() => onScreen(page)).toEqual(['Visível']);
  await expect(page.getByTestId('block-planned')).toHaveCount(0);
  await expect(page.locator('.ghost')).toHaveCount(0);
});

test('AC-pauta-revelavel-43 — in preparation "recolher" hides the sub-items from the edition and shows the count; with preparation off nothing changes', async ({
  page,
  request
}) => {
  const id = await openScript(page, request, 'Recolher', [
    textDraft('t', 'Tópico', visible),
    textDraft('a', 'Sub A', { ...visible, depth: 1, ...small }),
    textDraft('b', 'Sub B', { depth: 1, ...small }),
    textDraft('c', 'Sub C', { depth: 2, ...small }),
    textDraft('u', 'Depois', visible)
  ]);
  await page.keyboard.press('F2');
  const topic = sheetBlocks(page).first();
  const collapse = topic.getByTestId('block-collapse');
  await expect(collapse).toHaveText('recolher');
  await collapse.click();
  await expect.poll(() => onScreen(page)).toEqual(['Tópico', 'Depois']);
  await expect(page.getByTestId('collapsed-note')).toHaveText('3 sub-itens recolhidos');
  await expect(collapse).toHaveText('expandir');
  await expect(collapse).toHaveAttribute('aria-expanded', 'false');
  await waitSaved(page);
  expect((await fetchSheet(request, id)).blocks[0].collapsed).toBe(true);

  // Off the preparation view, collapsing changes nothing of what shows.
  await page.keyboard.press('F2');
  await expect.poll(() => onScreen(page)).toEqual(['Tópico', 'Sub A', 'Depois']);
  await expect(page.getByTestId('collapsed-note')).toHaveCount(0);

  await page.keyboard.press('F2');
  await topic.getByTestId('block-collapse').click();
  await expect.poll(() => onScreen(page)).toEqual(['Tópico', 'Sub A', 'Sub B', 'Sub C', 'Depois']);
  await expect(page.getByTestId('collapsed-note')).toHaveCount(0);
});

test('AC-pauta-revelavel-29 and AC-pauta-revelavel-10 — "Nova tomada" asks first, cancel and Esc keep the progress, confirming goes back to the plan from the top', async ({
  page,
  request
}) => {
  await page.setViewportSize({ width: 1280, height: 600 });
  const id = await openScript(page, request, 'Nova tomada', [
    textDraft('a', 'Começa na tela', visible),
    textDraft('b', 'Também começa', visible),
    textDraft('c', 'Revelado depois', { size: 'title', fontPx: 52 })
  ]);
  await page.keyboard.press('PageDown');
  // Written live: it shows at once and is planned hidden (AC-pauta-revelavel-10).
  await page.getByTestId('sheet-continue').click();
  await page.keyboard.type('Escrito ao vivo');
  await page.keyboard.press('Escape');
  await expect.poll(() => onScreen(page)).toEqual(['Começa na tela', 'Também começa', 'Revelado depois', 'Escrito ao vivo']);

  const open = () => page.getByTestId('sheet-ruler').getByRole('button', { name: 'Nova tomada', exact: true }).click();
  await open();
  const dialog = page.getByRole('dialog', { name: 'Começar uma nova tomada?' });
  await expect(dialog).toContainText(
    'Todos os blocos voltam a como foram planejados: 2 visíveis e 2 ocultos. Nenhum conteúdo é apagado.'
  );
  await dialog.getByRole('button', { name: 'Cancelar' }).click();
  await expect(dialog).toHaveCount(0);
  expect(await onScreen(page)).toHaveLength(4);

  await open();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  expect(await onScreen(page)).toHaveLength(4);

  await page.mouse.wheel(0, 2000);
  await open();
  await dialog.getByRole('button', { name: 'Nova tomada' }).click();
  await expect.poll(() => onScreen(page)).toEqual(['Começa na tela', 'Também começa']);
  await expect(toast(page, 'Nova tomada. PgDn revela o primeiro bloco.')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await waitSaved(page);
  const sheet = await fetchSheet(request, id);
  expect(sheet.blocks.map((block) => [block.takeVisible, block.revealStep])).toEqual([
    [true, null],
    [true, null],
    [false, null],
    [false, null]
  ]);

  // The plural follows the count: one of each.
  await openScript(page, request, 'Singular', [textDraft('a', 'Um', visible), textDraft('b', 'Outro')]);
  await open();
  await expect(dialog).toContainText('1 visível e 1 oculto.');
});

test('AC-pauta-revelavel-30 — the progress of the take survives the app closing in the middle of a recording', async ({
  page,
  request,
  context
}) => {
  const id = await openScript(page, request, 'Fecha no meio');
  await page.keyboard.press('PageDown');
  await page.keyboard.press('Shift+PageDown');
  await page.keyboard.press('PageUp');
  await page.keyboard.press('PageDown');
  await expect.poll(() => onScreen(page)).toEqual(['Abertura', 'Tema do dia', 'Contexto']);
  // The window goes away right after the last command, without waiting for "Salvo".
  await page.close();

  const reopened = await context.newPage();
  await reopened.goto(`/#/rundown/${id}`);
  await expect(reopened.getByTestId('sheet-ruler')).toBeVisible();
  await expect.poll(() => onScreen(reopened)).toEqual(['Abertura', 'Tema do dia', 'Contexto']);
  // PageUp still knows the order of this take.
  await reopened.keyboard.press('PageUp');
  await expect.poll(() => onScreen(reopened)).toEqual(['Abertura', 'Tema do dia']);
});

test('AC-pauta-revelavel-52 — with reduced motion, revealing and hiding happen without animation and the scroll is not smooth', async ({
  page,
  request
}) => {
  await page.setViewportSize({ width: 1280, height: 480 });
  await openScript(page, request, 'Movimento');
  await page.keyboard.press('PageDown');
  const settling = sheetBlocks(page).last().locator('.content');
  await expect(settling).toHaveCSS('animation-name', 'ink-settle');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (let press = 0; press < 5; press += 1) await page.keyboard.press('PageDown');
  const instant = await page.evaluate(() => {
    const blocks = document.querySelectorAll('[data-testid="sheet-block"]');
    const last = blocks[blocks.length - 1];
    const rect = last.getBoundingClientRect();
    return {
      animation: getComputedStyle(last.querySelector('.content') as Element).animationName,
      inView: rect.top >= 0 && rect.bottom <= window.innerHeight
    };
  });
  // Read right after the key, with no waiting: no ink animation and already scrolled.
  expect(instant).toEqual({ animation: 'none', inView: true });

  await page.keyboard.press('PageUp');
  const leaving = await page.evaluate(() => document.querySelectorAll('.block.leaving').length);
  expect(leaving).toBe(0);
});

test('AC-pauta-revelavel-55 — revealing and hiding do not wait for the save; when it fails the screen stays and the warning shows', async ({
  page,
  request
}) => {
  const id = await openScript(page, request, 'Disco fora');
  await page.route('**/api/rundowns/*/sheet', (route) =>
    route.request().method() === 'PUT' ? route.abort() : route.continue()
  );
  await page.keyboard.press('PageDown');
  await page.keyboard.press('PageDown');
  await expect.poll(() => onScreen(page)).toEqual(['Abertura', 'Tema do dia', 'Contexto']);
  await expect(page.getByTestId('save-state')).toHaveText('Falha ao salvar · nova tentativa em 5 s');
  // The screen never goes back while the disk refuses.
  await page.waitForTimeout(1000);
  expect(await onScreen(page)).toEqual(['Abertura', 'Tema do dia', 'Contexto']);
  await page.keyboard.press('PageUp');
  await expect.poll(() => onScreen(page)).toEqual(['Abertura', 'Tema do dia']);

  await page.unroute('**/api/rundowns/*/sheet');
  await waitSaved(page);
  expect((await fetchSheet(request, id)).blocks.slice(0, 3).map((block) => block.takeVisible)).toEqual([true, true, false]);
});

test('Done when — a 10-block script with sub-items shows exactly the expected blocks through every command and after a reload', async ({
  page,
  request
}) => {
  const id = await openScript(page, request, 'Roteiro de 10');
  const expectScreen = (texts: string[]) => expect.poll(() => onScreen(page)).toEqual(texts);

  await page.keyboard.press('PageDown');
  await expectScreen(['Abertura', 'Tema do dia']);
  await page.keyboard.press('Shift+PageDown');
  await expectScreen(['Abertura', 'Tema do dia', 'Contexto', 'Detalhe do contexto']);
  await page.keyboard.press('Shift+PageDown');
  await expectScreen(['Abertura', 'Tema do dia', 'Contexto', 'Detalhe do contexto', 'Exemplo']);
  await page.keyboard.press('Shift+PageDown');
  await expectScreen(['Abertura', 'Tema do dia', 'Contexto', 'Detalhe do contexto', 'Exemplo', 'Segunda parte', 'Ponto A', 'Ponto B']);

  // The eye on "Tema do dia" takes its whole subtree off screen.
  const theme = sheetBlocks(page).nth(1);
  await theme.hover();
  await theme.getByTestId('block-eye').click();
  await expectScreen(['Abertura', 'Segunda parte', 'Ponto A', 'Ponto B']);
  await page.keyboard.press('PageUp');
  await expectScreen(['Abertura']);

  // In preparation all ten blocks are in the page; off again, only the screen.
  await page.keyboard.press('F2');
  await expect.poll(() => onScreen(page).then((texts) => texts.length)).toBe(10);
  await page.keyboard.press('F2');
  await expectScreen(['Abertura']);

  await page.keyboard.press('PageDown');
  await expectScreen(['Abertura', 'Tema do dia', 'Contexto', 'Detalhe do contexto', 'Exemplo']);
  await waitSaved(page);
  await page.reload();
  await expectScreen(['Abertura', 'Tema do dia', 'Contexto', 'Detalhe do contexto', 'Exemplo']);

  await page.getByTestId('sheet-ruler').getByRole('button', { name: 'Nova tomada', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Nova tomada' }).click();
  await expectScreen(['Abertura']);
  await waitSaved(page);
  expect((await fetchSheet(request, id)).blocks.filter((block) => block.takeVisible).length).toBe(1);
});
