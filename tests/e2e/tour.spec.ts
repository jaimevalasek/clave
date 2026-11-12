import type { APIRequestContext, Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { createRundown, deleteAllRundowns, seedSheet, waitSaved } from './helpers';
import { textDraft } from '../helpers/sheetFixtures';

/**
 * The first-open tour (AC-pauta-revelavel-50): 5 steps with a spotlight over
 * the real ruler and sheet, "Pular", "Próximo" and "Começar", Esc closes, it
 * never comes back by itself and "Como usar" reopens it. The fixture marks the
 * tour as seen before every test; these tests clear it through the same real
 * route (`PUT /api/preferences`) to stand on a first open.
 */

const STEPS: { anchor: string; title: string }[] = [
  { anchor: 'sheet', title: 'Esta folha é a pauta inteira' },
  { anchor: 'reveal', title: 'PageDown revela, PageUp esconde' },
  { anchor: 'paste', title: 'Cole, escreva e destaque' },
  { anchor: 'preparation', title: 'F2 liga o preparo' },
  { anchor: 'appearance', title: 'A cara é sua' }
];

async function firstOpen(request: APIRequestContext): Promise<void> {
  const response = await request.put('/api/preferences', { data: { tourSeen: false } });
  expect(response.status()).toBe(200);
}

async function tourSeen(request: APIRequestContext): Promise<boolean> {
  const response = await request.get('/api/preferences');
  return ((await response.json()) as { preferences: { tourSeen: boolean } }).preferences.tourSeen;
}

/** A rundown with two blocks on screen and one hidden, opened on its sheet. */
async function openSeededRundown(page: Page, request: APIRequestContext, title: string): Promise<string> {
  const created = await request.post('/api/rundowns', { data: { title } });
  const id = ((await created.json()) as { rundown: { id: string } }).rundown.id;
  await request.put(`/api/rundowns/${id}/sheet`, {
    data: {
      blocks: [
        textDraft('a', 'Abertura', { plannedVisible: true, takeVisible: true }),
        textDraft('b', 'Gancho', { plannedVisible: true, takeVisible: true }),
        textDraft('c', 'Pergunta ao chat')
      ]
    }
  });
  await page.goto(`/#/rundown/${id}`);
  await expect(page.getByTestId('sheet-ruler')).toBeVisible();
  return id;
}

/**
 * The spotlight frames the anchor: the anchor box sits inside the hole, with
 * the 8 px room. The hole glides between steps, so the check retries until it
 * lands.
 */
async function expectFramed(page: Page, anchor: string): Promise<void> {
  await expect(async () => {
    const target = await page.locator(`[data-aioson-tour="${anchor}"]`).first().boundingBox();
    const hole = await page.getByTestId('tour-spotlight').boundingBox();
    expect(target, `anchor ${anchor} on screen`).not.toBeNull();
    expect(hole, `spotlight on ${anchor}`).not.toBeNull();
    if (!target || !hole) return;
    expect(hole.x).toBeLessThanOrEqual(target.x);
    expect(hole.x + hole.width).toBeGreaterThanOrEqual(target.x + target.width - 1);
    expect(hole.y).toBeLessThanOrEqual(Math.max(target.y, 8));
    expect(hole.width - target.width).toBeCloseTo(16, 0);
  }).toPass({ timeout: 3_000 });
}

/** The card is entirely inside the window. */
async function expectCardInside(page: Page, card: Locator): Promise<void> {
  const box = await card.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  if (!box || !viewport) return;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
}

/** Lets the boot read `tourSeen` and lay out the sheet: a tour that would open has opened by then. */
async function settle(page: Page): Promise<void> {
  await expect(page.getByTestId('sheet-ruler')).toBeVisible();
  await page.waitForTimeout(600);
}

test('AC-pauta-revelavel-50 — the first open shows 5 steps with a spotlight over the sheet, reveal, paste, preparation and appearance, and "Começar" closes it for good', async ({
  page,
  request
}) => {
  await firstOpen(request);
  await openSeededRundown(page, request, 'Primeira abertura');

  const card = page.getByRole('dialog', { name: STEPS[0].title });
  await expect(card).toBeVisible();

  for (const [index, step] of STEPS.entries()) {
    const current = page.getByTestId('tour-card');
    await expect(current).toHaveAttribute('data-step', step.anchor);
    await expect(current.getByRole('heading', { level: 2 })).toHaveText(step.title);
    await expect(current).toContainText(`Passo ${index + 1} de 5`);
    await expect(current.getByRole('button', { name: 'Pular' })).toBeVisible();
    await expectFramed(page, step.anchor);
    await expectCardInside(page, current);

    const primary = current.getByTestId('tour-next');
    await expect(primary).toBeFocused();
    await expect(primary).toHaveText(index === STEPS.length - 1 ? 'Começar' : 'Próximo');
    await primary.click();
  }

  await expect(page.getByTestId('tour')).toHaveCount(0);
  await expect.poll(() => tourSeen(request)).toBe(true);

  // It never comes back by itself: not after a reload, not on another rundown.
  await page.reload();
  await settle(page);
  await expect(page.getByTestId('tour')).toHaveCount(0);
  await openSeededRundown(page, request, 'Outra pauta');
  await settle(page);
  await expect(page.getByTestId('tour')).toHaveCount(0);

  // Nothing of it is kept in the browser.
  expect(await page.evaluate(() => Object.keys(window.localStorage))).toEqual([]);
});

test('AC-pauta-revelavel-50 — Esc and "Pular" close the tour, and "Como usar" on the ruler reopens it from the first step', async ({
  page,
  request
}) => {
  await firstOpen(request);
  await openSeededRundown(page, request, 'Pular e reabrir');

  await expect(page.getByTestId('tour-card')).toHaveAttribute('data-step', 'sheet');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('tour')).toHaveCount(0);
  await expect.poll(() => tourSeen(request)).toBe(true);

  const howToUse = page.getByTestId('sheet-ruler').getByRole('button', { name: 'Como usar' });
  await howToUse.click();
  await expect(page.getByTestId('tour-card')).toHaveAttribute('data-step', 'sheet');
  await expect(page.getByTestId('tour-card')).toContainText('Passo 1 de 5');
  await page.getByTestId('tour-next').click();
  await expect(page.getByTestId('tour-card')).toHaveAttribute('data-step', 'reveal');

  await page.getByRole('button', { name: 'Pular' }).click();
  await expect(page.getByTestId('tour')).toHaveCount(0);
  // Focus goes back to the control that opened it.
  await expect(howToUse).toBeFocused();

  // Reopening starts again from the first step.
  await howToUse.click();
  await expect(page.getByTestId('tour-card')).toContainText('Passo 1 de 5');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('tour')).toHaveCount(0);

  await page.reload();
  await settle(page);
  await expect(page.getByTestId('tour')).toHaveCount(0);
});

test('AC-pauta-revelavel-53 — the tour traps the focus, and the sheet keys stay quiet behind it', async ({ page, request }) => {
  await openSeededRundown(page, request, 'Foco no tour');
  const counter = page.getByTestId('sheet-counter');
  await expect(counter).toContainText('2 de 3');

  await page.getByRole('button', { name: 'Como usar' }).click();
  const skip = page.getByTestId('tour-skip');
  const next = page.getByTestId('tour-next');
  await expect(next).toBeFocused();

  await page.keyboard.press('Tab');
  await expect(skip).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(next).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(skip).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(next).toBeFocused();

  // PageDown and F2 do not reach the sheet while the tour is open.
  await page.keyboard.press('PageDown');
  await page.keyboard.press('F2');
  await expect(counter).toContainText('2 de 3');
  await expect(page.getByTestId('preparation-strip')).toHaveCount(0);

  // The veil takes the clicks: "Revelar próximo" under it does nothing.
  await page.getByTestId('reveal-next').click({ force: true });
  await expect(counter).toContainText('2 de 3');

  await page.keyboard.press('Escape');
  await expect(page.getByTestId('tour')).toHaveCount(0);
  await page.keyboard.press('PageDown');
  await expect(counter).toContainText('3 de 3');
});

test('AC-pauta-revelavel-50 — on a fresh install the list stays clear and the tour opens on the first rundown created', async ({
  page,
  request
}) => {
  await deleteAllRundowns(request);
  await firstOpen(request);

  await page.goto('/');
  await expect(page.getByTestId('rundowns-empty')).toBeVisible();
  await page.waitForTimeout(600);
  await expect(page.getByTestId('tour')).toHaveCount(0);

  await createRundown(page, 'Episódio 1');
  await expect(page.getByTestId('tour-card')).toHaveAttribute('data-step', 'sheet');
  await expect(page.getByText('Folha em branco.')).toBeVisible();
  await page.getByTestId('tour-skip').click();
  await expect(page.getByTestId('tour')).toHaveCount(0);
});

test('AC-pauta-revelavel-50 — at 360 px every step keeps its card inside the window', async ({ page, request }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await firstOpen(request);
  await openSeededRundown(page, request, 'Celular');

  for (const step of STEPS) {
    const card = page.getByTestId('tour-card');
    await expect(card).toHaveAttribute('data-step', step.anchor);
    await expectFramed(page, step.anchor);
    await expectCardInside(page, card);
    await page.getByTestId('tour-next').click();
  }
  await expect(page.getByTestId('tour')).toHaveCount(0);
});

test('AC-pauta-revelavel-08 — the ruler shows the editable name, "N de M na tela", the save state and every control up to "Como usar"', async ({
  page,
  request
}) => {
  const id = await createRundown(page, 'Régua completa');
  await seedSheet(page, request, id, [
    textDraft('a', 'Abertura', { plannedVisible: true, takeVisible: true }),
    textDraft('b', 'Desenvolvimento')
  ]);

  const ruler = page.getByTestId('sheet-ruler');
  await expect(ruler.getByLabel('Nome da pauta')).toHaveValue('Régua completa');
  await expect(ruler.getByTestId('sheet-counter')).toHaveText('1 de 2 na tela');
  await expect(ruler.getByTestId('save-state')).toHaveText(/Salvo às \d{2}:\d{2}/);
  for (const name of ['Ocultar último', 'Revelar próximo', 'Preparo', 'Nova tomada', 'Aparência', 'Como usar']) {
    await expect(ruler.getByRole('button', { name, exact: true })).toBeVisible();
  }

  // The name is edited in place and saves by itself: "Salvando", then "Salvo às HH:MM".
  await ruler.getByLabel('Nome da pauta').fill('Régua renomeada');
  await expect(ruler.getByTestId('save-state')).toHaveText('Salvando');
  await waitSaved(page);
  await page.reload();
  await expect(page.getByTestId('sheet-ruler').getByLabel('Nome da pauta')).toHaveValue('Régua renomeada');
});
