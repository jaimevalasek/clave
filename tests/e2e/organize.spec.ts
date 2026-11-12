import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { blockText, createRundown, outline, screenOutline, seedSheet, sheetBlocks } from './helpers';
import { textDraft } from '../helpers/sheetFixtures';

/**
 * Reordering and deleting through the real interface: a real pointer drag by
 * the handle, Alt+↑/↓ with the live region, a touch drag on a phone-sized
 * screen, "Desfazer", and the "Apagar bloco?" modal. Every new order is read
 * back from the server and after a reload.
 */

const shown = { plannedVisible: true, takeVisible: true };
const sub = { ...shown, depth: 1, size: 'small' as const, fontPx: 22 };

async function center(page: Page, index: number, testId: string) {
  const block = sheetBlocks(page).nth(index);
  await block.hover();
  const box = await block.getByTestId(testId).boundingBox();
  if (!box) throw new Error(`no ${testId} on block ${index}`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

test('AC-pauta-revelavel-44 — dragging by the handle lifts the block, marks the destination and moves the topic with its sub-items', async ({
  page,
  request
}) => {
  const id = await createRundown(page, 'Arrastar');
  await seedSheet(page, request, id, [
    textDraft('a', 'Um', shown),
    textDraft('b', 'Dois', shown),
    textDraft('b1', 'Dois-a', sub),
    textDraft('c', 'Três', shown)
  ]);

  const handle = await center(page, 3, 'block-handle');
  await expect(sheetBlocks(page).nth(3).getByTestId('block-handle')).toHaveCSS('cursor', 'grab');
  const first = await sheetBlocks(page).nth(0).boundingBox();
  await page.mouse.move(handle.x, handle.y);
  await page.mouse.down();
  await page.mouse.move(handle.x, (first?.y ?? 0) + 4, { steps: 12 });
  await expect(sheetBlocks(page).nth(3)).toHaveClass(/\blifted\b/);
  await expect(sheetBlocks(page).nth(0)).toHaveClass(/\bdrop-before\b/);
  await page.mouse.up();

  const afterDrop = ['0:Três', '0:Um', '0:Dois', '1:Dois-a'];
  await expect.poll(() => screenOutline(page)).toEqual(afterDrop);
  await expect(page.getByTestId('toast').filter({ hasText: 'Bloco movido. A ordem da coluna é a ordem de revelar.' })).toBeVisible();
  await expect.poll(() => outline(request, id)).toEqual(afterDrop);

  // The topic "Dois" goes to the top with its sub-item.
  const topic = await center(page, 2, 'block-handle');
  const top = await sheetBlocks(page).nth(0).boundingBox();
  await page.mouse.move(topic.x, topic.y);
  await page.mouse.down();
  await page.mouse.move(topic.x, (top?.y ?? 0) + 4, { steps: 12 });
  await expect(sheetBlocks(page).nth(3)).toHaveClass(/\bcarried\b/);
  await page.mouse.up();

  const subtreeMoved = ['0:Dois', '1:Dois-a', '0:Três', '0:Um'];
  await expect.poll(() => screenOutline(page)).toEqual(subtreeMoved);
  await expect.poll(() => outline(request, id)).toEqual(subtreeMoved);
  await page.reload();
  await expect.poll(() => screenOutline(page)).toEqual(subtreeMoved);
});

test('AC-pauta-revelavel-44 — a drop below the last block lands at the end, and "Desfazer" brings the previous order back', async ({
  page,
  request
}) => {
  const id = await createRundown(page, 'Desfazer arraste');
  await seedSheet(page, request, id, [textDraft('a', 'Um', shown), textDraft('b', 'Dois', shown), textDraft('c', 'Três', shown)]);

  const handle = await center(page, 0, 'block-handle');
  const end = await page.getByTestId('sheet-continue').boundingBox();
  await page.mouse.move(handle.x, handle.y);
  await page.mouse.down();
  await page.mouse.move(handle.x, (end?.y ?? 0) + 30, { steps: 14 });
  await expect(page.getByTestId('sheet-continue')).toHaveClass(/\bdrop-before\b/);
  await page.mouse.up();
  await expect.poll(() => outline(request, id)).toEqual(['0:Dois', '0:Três', '0:Um']);

  const toast = page.getByTestId('toast').filter({ hasText: 'Bloco movido.' });
  await toast.getByRole('button', { name: 'Desfazer' }).click();
  await expect.poll(() => screenOutline(page)).toEqual(['0:Um', '0:Dois', '0:Três']);
  await expect.poll(() => outline(request, id)).toEqual(['0:Um', '0:Dois', '0:Três']);
  await page.reload();
  await expect.poll(() => screenOutline(page)).toEqual(['0:Um', '0:Dois', '0:Três']);
});

test('AC-pauta-revelavel-44 and -53 — the handle is reached by keyboard and Alt+↑/↓ moves the block, announced in a live region', async ({
  page,
  request
}) => {
  const id = await createRundown(page, 'Mover pelo teclado');
  await seedSheet(page, request, id, [
    textDraft('a', 'Um', shown),
    textDraft('b', 'Dois', shown),
    textDraft('b1', 'Dois-a', sub)
  ]);

  // Esc leaves the text; Shift+Tab walks back through the block controls: trash, eye, then handle.
  await blockText(page, 1).click();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Shift+Tab');
  await expect(sheetBlocks(page).nth(1).getByTestId('block-remove')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(sheetBlocks(page).nth(1).getByTestId('block-eye')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  const handle = sheetBlocks(page).nth(1).getByTestId('block-handle');
  await expect(handle).toBeFocused();
  expect(await handle.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe('none');
  await expect(sheetBlocks(page).nth(1).locator('.gutter')).toHaveCSS('opacity', '1');

  await page.keyboard.press('Alt+ArrowUp');
  await expect.poll(() => screenOutline(page)).toEqual(['0:Dois', '1:Dois-a', '0:Um']);
  const announcer = page.getByTestId('sheet-announcer');
  await expect(announcer).toHaveAttribute('aria-live', 'polite');
  await expect(announcer).toHaveText('Bloco movido para a posição 1 de 3.');
  await expect(sheetBlocks(page).nth(0).getByTestId('block-handle')).toBeFocused();
  await expect.poll(() => outline(request, id)).toEqual(['0:Dois', '1:Dois-a', '0:Um']);

  await page.keyboard.press('Alt+ArrowDown');
  await expect(announcer).toHaveText('Bloco movido para a posição 2 de 3.');
  await page.getByTestId('toast').filter({ hasText: 'Bloco movido.' }).getByRole('button', { name: 'Desfazer' }).click();
  await expect(announcer).toHaveText('Ordem anterior de volta.');
  // A burst of keyboard moves shares one "Desfazer": back to the order before the burst.
  await expect.poll(() => outline(request, id)).toEqual(['0:Um', '0:Dois', '1:Dois-a']);
  await page.reload();
  await expect.poll(() => screenOutline(page)).toEqual(['0:Um', '0:Dois', '1:Dois-a']);
});

test.describe('on a phone', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

  test('AC-pauta-revelavel-44 — a touch drag on the handle reorders the sheet', async ({ page, request }) => {
    const id = await createRundown(page, 'Arrastar no celular');
    await seedSheet(page, request, id, [textDraft('a', 'Um', shown), textDraft('b', 'Dois', shown)]);

    await blockText(page, 1).tap();
    const handle = sheetBlocks(page).nth(1).getByTestId('block-handle');
    await expect(handle).toHaveCSS('touch-action', 'none');
    const box = await handle.boundingBox();
    const first = await sheetBlocks(page).nth(0).boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    const x = (box?.x ?? 0) + (box?.width ?? 0) / 2;
    const y = (box?.y ?? 0) + (box?.height ?? 0) / 2;

    // Real touch input from the browser (not synthetic pointer events).
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    const targetY = (first?.y ?? 0) + 4;
    for (let step = 1; step <= 12; step += 1) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x, y: y + ((targetY - y) * step) / 12 }]
      });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });

    await expect.poll(() => screenOutline(page)).toEqual(['0:Dois', '0:Um']);
    await expect.poll(() => outline(request, id)).toEqual(['0:Dois', '0:Um']);
  });
});

test('AC-pauta-revelavel-45 — "Apagar bloco?" confirms the trash and Delete; Cancelar and Esc keep the block', async ({
  page,
  request
}) => {
  const id = await createRundown(page, 'Apagar bloco');
  await seedSheet(page, request, id, [textDraft('a', 'Fica', shown), textDraft('b', 'Sai', shown)]);

  const dialog = page.getByRole('dialog', { name: 'Apagar bloco?' });
  await sheetBlocks(page).nth(1).hover();
  await sheetBlocks(page).nth(1).getByTestId('block-remove').click();
  await expect(dialog).toContainText('Você vai apagar este texto da pauta. Não dá para desfazer.');
  await expect(dialog).not.toContainText('sub-itens');
  await expect(dialog.getByRole('button', { name: 'Apagar bloco' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancelar' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(sheetBlocks(page)).toHaveCount(2);

  await sheetBlocks(page).nth(1).hover();
  await sheetBlocks(page).nth(1).getByTestId('block-remove').click();
  await expect(dialog).toBeVisible();
  // The modal traps the focus (AC-pauta-revelavel-53).
  for (let press = 0; press < 4; press += 1) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]')))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(sheetBlocks(page)).toHaveCount(2);
  expect(await outline(request, id)).toEqual(['0:Fica', '0:Sai']);

  // Delete with the block selected and no text in edition.
  await blockText(page, 1).click();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Delete');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Apagar bloco' }).click();
  await expect(sheetBlocks(page)).toHaveCount(1);
  await expect.poll(() => outline(request, id)).toEqual(['0:Fica']);
  await page.reload();
  await expect.poll(() => screenOutline(page)).toEqual(['0:Fica']);
});
