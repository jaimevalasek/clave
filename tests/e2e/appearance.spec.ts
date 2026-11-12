import { expect, test } from './fixtures';
import type { APIRequestContext, Page } from '@playwright/test';
import { blockText, createRundown, seedSheet } from './helpers';
import { PNG_BYTES, textDraft } from '../helpers/sheetFixtures';
import type { Preferences } from '../../shared/types';

/**
 * The Appearance panel through the real interface (AC-pauta-revelavel-46):
 * every choice is on screen at once, is stored by `PUT /api/preferences`,
 * holds in another rundown and comes back on a fresh boot of the app.
 */

const shown = { plannedVisible: true, takeVisible: true };
const DEFAULT = { theme: 'ink-gold', accent: null, background: { kind: 'theme' }, sheetOpacity: 90 };

async function preferences(request: APIRequestContext): Promise<Preferences> {
  const response = await request.get('/api/preferences');
  return ((await response.json()) as { preferences: Preferences }).preferences;
}

function cssVariable(page: Page, name: string): Promise<string> {
  return page.evaluate((variable) => getComputedStyle(document.documentElement).getPropertyValue(variable).trim(), name);
}

/** A real 1 × 1 PNG: the framing needs the picture's own size. */
const REAL_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

/** The image background lives on its own fixed layer, `body::before`. */
function backdropLayer(page: Page): Promise<{ image: string; position: string; transform: string; origin: string }> {
  return page.evaluate(() => {
    const style = getComputedStyle(document.body, '::before');
    return { image: style.backgroundImage, position: style.backgroundPosition, transform: style.transform, origin: style.transformOrigin };
  });
}

async function openPanel(page: Page) {
  await page.getByRole('button', { name: 'Aparência' }).click();
  const panel = page.getByRole('complementary', { name: 'Aparência' });
  await expect(panel).toBeVisible();
  return panel;
}

test.afterEach(async ({ request }) => {
  await request.put('/api/preferences', { data: DEFAULT });
});

test('AC-pauta-revelavel-46 — a theme applies at once to the sheet and its text colors, for every rundown and after a restart', async ({
  page,
  request
}) => {
  const first = await createRundown(page, 'Primeira pauta');
  await seedSheet(page, request, first, [
    textDraft('a', 'Tom vermelho', { ...shown, content: [{ text: 'Tom ' }, { text: 'vermelho', color: 'red' }] })
  ]);
  // AC-pauta-revelavel-08: "Aparência" is on the ruler.
  await expect(page.getByTestId('sheet-ruler').getByRole('button', { name: 'Aparência' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'ink-gold');
  const red = blockText(page, 0).locator('[data-color="red"]');
  await expect(red).toHaveCSS('color', 'rgb(239, 111, 111)');

  const panel = await openPanel(page);
  const themes = panel.getByRole('radiogroup', { name: 'Tema' }).getByRole('radio');
  await expect(themes).toHaveCount(5);
  for (const name of ['Tinta & Ouro', 'Porcelana', 'Caderno', 'Lousa', 'Alto contraste']) {
    await expect(panel.getByRole('radio', { name: new RegExp(`^${name}`) })).toBeVisible();
  }
  await expect(panel.getByRole('radio', { name: /^Tinta & Ouro/ })).toHaveAttribute('aria-checked', 'true');

  await panel.getByRole('radio', { name: /^Porcelana/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'porcelain');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(241, 237, 227)');
  await expect(red).toHaveCSS('color', 'rgb(191, 61, 71)');
  expect(await cssVariable(page, '--sheet')).toBe('#F9F6EE');
  await expect.poll(async () => (await preferences(request)).theme).toBe('porcelain');

  await panel.getByRole('radio', { name: /^Lousa/ }).click();
  await expect(red).toHaveCSS('color', 'rgb(242, 147, 138)');
  await expect.poll(async () => (await preferences(request)).theme).toBe('slate');

  // Esc closes the panel; the choice holds in another rundown and after a fresh boot.
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Aparência' })).toBeFocused();
  await createRundown(page, 'Segunda pauta');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'slate');
  await page.goto('/');
  await page.reload();
  await expect(page.getByTestId('sheet-ruler')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'slate');
  expect(await cssVariable(page, '--sheet')).toBe('#182821');
});

test('AC-pauta-revelavel-46 — a free accent warns below 4.5:1 and "Usar a do tema" brings the theme accent back', async ({
  page,
  request
}) => {
  await createRundown(page, 'Cor de destaque');
  const panel = await openPanel(page);
  const contrast = panel.getByTestId('accent-contrast');
  await expect(contrast).toHaveText(/^Contraste 10,6:1 sobre a folha\. Legível no vídeo\.$/);
  await expect(panel.getByRole('button', { name: 'Usar a do tema' })).toHaveCount(0);

  await panel.getByLabel('Escolher cor de destaque').fill('#3a2a12');
  await expect(contrast).toHaveAttribute('role', 'alert');
  await expect(contrast).toContainText('No vídeo comprimido essa cor pode sumir; o mínimo recomendado é 4,5:1.');
  expect(await cssVariable(page, '--accent')).toBe('#3A2A12');
  await expect.poll(async () => (await preferences(request)).accent).toBe('#3A2A12');

  await panel.getByLabel('Escolher cor de destaque').fill('#7fd1ff');
  await expect(contrast).toContainText('Legível no vídeo.');
  await expect(page.getByRole('button', { name: 'Revelar próximo' })).toHaveCSS('background-color', 'rgb(127, 209, 255)');

  await panel.getByRole('button', { name: 'Usar a do tema' }).click();
  expect(await cssVariable(page, '--accent')).toBe('#E8BA52');
  await expect(panel.getByRole('button', { name: 'Usar a do tema' })).toHaveCount(0);
  await expect.poll(async () => (await preferences(request)).accent).toBeNull();

  // Choosing a theme goes back to its own accent.
  await panel.getByLabel('Escolher cor de destaque').fill('#7fd1ff');
  await panel.getByRole('radio', { name: /^Caderno/ }).click();
  expect(await cssVariable(page, '--accent')).toBe('#9C6400');
  await expect.poll(async () => (await preferences(request)).accent).toBeNull();
});

test('AC-pauta-revelavel-46 — the background is the theme, a color, one of 3 gradients or an image stored in the media folder; the sheet keeps its veil', async ({
  page,
  request
}) => {
  await createRundown(page, 'Plano de fundo');
  const panel = await openPanel(page);
  const kinds = panel.getByRole('radiogroup', { name: 'Tipo de fundo' });
  await expect(kinds.getByRole('radio')).toHaveText(['Do tema', 'Cor', 'Gradiente', 'Imagem']);

  await kinds.getByRole('radio', { name: 'Cor' }).click();
  await panel.getByLabel('Cor do fundo').fill('#22303c');
  await expect(page.locator('body')).toHaveClass(/free-backdrop/);
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(34, 48, 60)');
  await expect.poll(async () => (await preferences(request)).background).toEqual({ kind: 'color', value: '#22303C' });

  await kinds.getByRole('radio', { name: 'Gradiente' }).click();
  const gradients = panel.getByRole('radiogroup', { name: 'Gradiente' }).getByRole('radio');
  await expect(gradients).toHaveCount(3);
  await panel.getByRole('radio', { name: 'Gradiente 2' }).click();
  await expect(page.locator('body')).toHaveCSS('background-image', /radial-gradient/);
  await expect.poll(async () => (await preferences(request)).background).toEqual({ kind: 'gradient', value: 'halo' });

  await kinds.getByRole('radio', { name: 'Imagem' }).click();
  const upload = page.waitForResponse((response) => response.url().endsWith('/api/media') && response.request().method() === 'POST');
  await panel.getByTestId('background-image-input').setInputFiles({ name: 'estudio.png', mimeType: 'image/png', buffer: PNG_BYTES });
  expect((await upload).status()).toBe(201);
  await expect.poll(async () => (await preferences(request)).background.kind).toBe('image');
  const stored = (await preferences(request)).background as { kind: 'image'; value: string };
  await expect.poll(() => backdropLayer(page).then((layer) => layer.image)).toMatch(new RegExp(`/api/media/${stored.value.replace('.', '\\.')}`));
  const image = await request.get(`/api/media/${stored.value}`);
  expect(image.status()).toBe(200);
  await expect(panel.getByText('Trocar imagem')).toBeVisible();

  // A file that is not an image never leaves the browser.
  await panel.getByTestId('background-image-input').setInputFiles({ name: 'roteiro.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') });
  await expect(panel.getByRole('alert')).toHaveText('roteiro.pdf não é uma imagem PNG, JPG, GIF ou WebP.');

  // The sheet keeps its veil over any background.
  const veil = await page.getByTestId('sheet-column').evaluate((element) => getComputedStyle(element).backgroundColor);
  const alpha = Number(/[\d.]+(?=\)$)/.exec(veil.replace(/\s/g, ''))?.[0] ?? '1');
  expect(alpha).toBeGreaterThanOrEqual(0.85);

  // Fresh boot: the image is still the background.
  await page.reload();
  await expect(page.getByTestId('sheet-ruler')).toBeVisible();
  await expect(page.locator('body')).toHaveClass(/free-backdrop/);

  await openPanel(page);
  await page.getByRole('radiogroup', { name: 'Tipo de fundo' }).getByRole('radio', { name: 'Do tema' }).click();
  await expect(page.locator('body')).not.toHaveClass(/free-backdrop/);
  await expect.poll(async () => (await preferences(request)).background).toEqual({ kind: 'theme' });
});

test('Enquadramento — dragging the rectangle and the zoom place the image background at once, it is saved and comes back; Centralizar resets', async ({
  page,
  request
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await createRundown(page, 'Enquadrar o fundo');
  const panel = await openPanel(page);
  await panel.getByRole('radiogroup', { name: 'Tipo de fundo' }).getByRole('radio', { name: 'Imagem' }).click();
  await panel.getByTestId('background-image-input').setInputFiles({ name: 'estudio.png', mimeType: 'image/png', buffer: REAL_PNG });

  // A square image on a 16:9 window: its whole width shows, about half of its height.
  const box = panel.getByTestId('frame-box');
  const area = panel.getByTestId('frame-window');
  await expect(area).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Centralizar' })).toBeDisabled();
  await expect.poll(() => backdropLayer(page).then((layer) => layer.position)).toBe('50% 50%');

  // Drag the rectangle all the way down: the bottom of the image shows.
  await box.scrollIntoViewIfNeeded();
  const frame = await box.boundingBox();
  const rect = await area.boundingBox();
  if (!frame || !rect) throw new Error('frame not on screen');
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await page.mouse.down();
  await page.mouse.move(rect.x + rect.width / 2, frame.y + frame.height + 40, { steps: 5 });
  await page.mouse.up();
  await expect.poll(() => backdropLayer(page).then((layer) => layer.position)).toBe('50% 100%');

  // Zoom 200 %: the image doubles around the same point.
  await panel.getByTestId('frame-zoom').fill('200');
  await expect(panel.getByText('200%')).toBeVisible();
  await expect.poll(() => backdropLayer(page).then((layer) => layer.transform)).toBe('matrix(2, 0, 0, 2, 0, 0)');

  // Arrows move it too; the rectangle is now narrower than the image, so x moves.
  await box.focus();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Shift+ArrowLeft');
  await expect.poll(() => backdropLayer(page).then((layer) => layer.position)).toBe('38% 100%');
  await expect.poll(async () => (await preferences(request)).background).toMatchObject({ kind: 'image', frame: { x: 38, y: 100, zoom: 200 } });

  // Fresh boot: the framing is still there.
  await page.reload();
  await expect(page.getByTestId('sheet-ruler')).toBeVisible();
  await expect.poll(() => backdropLayer(page).then((layer) => [layer.position, layer.transform])).toEqual(['38% 100%', 'matrix(2, 0, 0, 2, 0, 0)']);

  const reopened = await openPanel(page);
  await reopened.getByRole('button', { name: 'Centralizar' }).click();
  await expect.poll(() => backdropLayer(page).then((layer) => [layer.position, layer.transform])).toEqual(['50% 50%', 'matrix(1, 0, 0, 1, 0, 0)']);
  await expect.poll(async () => (await preferences(request)).background).not.toHaveProperty('frame');
});

test('Transparência da folha — the slider lets the background show through the sheet at once, warns when the text may vanish, is saved and comes back', async ({
  page,
  request
}) => {
  await createRundown(page, 'Folha transparente');
  const veilAlpha = () =>
    page.getByTestId('sheet-column').evaluate((element) => {
      // `color(srgb r g b / a)` or `rgba(r, g, b, a)`; without an alpha the sheet is opaque.
      const color = getComputedStyle(element).backgroundColor.replace(/\s/g, '');
      if (!color.startsWith('rgba') && !color.includes('/')) return 1;
      return Number(/[\d.]+(?=\)$)/.exec(color)?.[0] ?? '1');
    });
  await expect.poll(veilAlpha).toBeCloseTo(0.9, 2);

  const panel = await openPanel(page);
  const veil = panel.getByTestId('sheet-veil');
  await expect(veil).toHaveValue('10');
  await expect(panel.getByText('10%', { exact: true })).toBeVisible();

  // With the theme background there is nothing to vanish into: no warning.
  await veil.fill('70');
  await expect.poll(veilAlpha).toBeCloseTo(0.3, 2);
  await expect(panel.getByTestId('sheet-veil-warning')).toHaveCount(0);
  await expect.poll(async () => (await preferences(request)).sheetOpacity).toBe(30);

  // Over a free background, past 40 % the panel warns; at 40 % it does not.
  await panel.getByRole('radiogroup', { name: 'Tipo de fundo' }).getByRole('radio', { name: 'Gradiente' }).click();
  await expect(panel.getByTestId('sheet-veil-warning')).toBeVisible();
  await veil.fill('40');
  await expect(panel.getByTestId('sheet-veil-warning')).toHaveCount(0);
  await expect.poll(veilAlpha).toBeCloseTo(0.6, 2);

  // The text is still typed on the sheet as always.
  await page.getByTestId('sheet-continue').click();
  await page.keyboard.type('Texto sobre o fundo');
  await expect(blockText(page, 0)).toHaveText('Texto sobre o fundo');

  // Fresh boot: the sheet keeps the chosen veil.
  await expect.poll(async () => (await preferences(request)).sheetOpacity).toBe(60);
  await page.reload();
  await expect(page.getByTestId('sheet-ruler')).toBeVisible();
  await expect.poll(veilAlpha).toBeCloseTo(0.6, 2);
});
