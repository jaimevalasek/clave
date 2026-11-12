import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { blockText, createRundown, fetchSheet, outline, screenOutline, seedSheet, sheetBlocks, waitSaved } from './helpers';
import { textDraft } from '../helpers/sheetFixtures';

/**
 * Ctrl+V of text through the real clipboard: the browser fires its own paste
 * event with what the system clipboard holds, plain text and HTML alike. The
 * result is read back from the screen and from the server.
 */

const shown = { plannedVisible: true, takeVisible: true };

/** Puts text on the system clipboard; with `html`, a formatted copy goes along (as from a web page or Word). */
async function copyToClipboard(page: Page, text: string, html?: string): Promise<void> {
  await page.evaluate(
    async ({ text, html }) => {
      const parts: Record<string, Blob> = { 'text/plain': new Blob([text], { type: 'text/plain' }) };
      if (html) parts['text/html'] = new Blob([html], { type: 'text/html' });
      await navigator.clipboard.write([new ClipboardItem(parts)]);
    },
    { text, html }
  );
}

/** Selects a block by its text and leaves the edition, so the paste lands outside any text. */
async function selectOutsideText(page: Page, index: number): Promise<void> {
  await blockText(page, index).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-testid="sheet-block"].selected')).toHaveCount(1);
}

test('AC-pauta-revelavel-13 — a ten-paragraph script pasted outside the edition becomes ten blocks after the selected topic and its sub-items', async ({
  page,
  request
}) => {
  const id = await createRundown(page, 'Roteiro colado');
  await seedSheet(page, request, id, [
    textDraft('a', 'Um', shown),
    textDraft('a1', 'Um-a', { ...shown, depth: 1, size: 'small', fontPx: 22 }),
    textDraft('b', 'Dois', shown)
  ]);
  await selectOutsideText(page, 0);

  const paragraphs = Array.from({ length: 10 }, (_, index) => `Parágrafo ${index + 1}`);
  // Windows line breaks, a blank line with spaces, and formatting that must not survive.
  const text = paragraphs.join('\r\n \r\n');
  const html = paragraphs.map((paragraph) => `<p><b style="color:red">${paragraph}</b></p>`).join('');
  await copyToClipboard(page, text, html);
  await page.keyboard.press('Control+V');

  await expect(sheetBlocks(page)).toHaveCount(13);
  await expect(page.getByTestId('toast').filter({ hasText: '10 blocos criados: cada linha em branco separa um bloco.' })).toBeVisible();
  const expected = ['0:Um', '1:Um-a', ...paragraphs.map((paragraph) => `0:${paragraph}`), '0:Dois'];
  await expect.poll(() => screenOutline(page)).toEqual(expected);
  // Created while recording: they are on screen now, and planned hidden for the next takes.
  await expect(page.getByTestId('sheet-counter')).toContainText('13 de 13');

  await waitSaved(page);
  await expect.poll(() => outline(request, id)).toEqual(expected);
  const sheet = await fetchSheet(request, id);
  const pasted = sheet.blocks.slice(2, 12);
  expect(pasted.map((block) => block.content)).toEqual(paragraphs.map((paragraph) => [{ text: paragraph }]));
  expect(pasted.every((block) => !block.plannedVisible && block.takeVisible)).toBe(true);
  await expect(page.locator('[data-testid="block-text"] b, [data-testid="block-text"] [style*="color"]')).toHaveCount(0);
});

test('AC-pauta-revelavel-14 — a paste with the caret in a block goes in at the caret and the paragraphs after a blank line become the next blocks', async ({
  page,
  request
}) => {
  const id = await createRundown(page, 'Colar no cursor');
  await seedSheet(page, request, id, [textDraft('a', 'Começo', shown), textDraft('b', 'Fim', shown)]);

  await blockText(page, 0).click();
  await page.keyboard.press('End');
  await copyToClipboard(page, ' e meio\r\n\r\nDepois um\r\n\r\nDepois dois', '<i> e meio</i><p>Depois um</p><p>Depois dois</p>');
  await page.keyboard.press('Control+V');

  const expected = ['0:Começo e meio', '0:Depois um', '0:Depois dois', '0:Fim'];
  await expect.poll(() => screenOutline(page)).toEqual(expected);
  // The caret stays where the presenter is writing.
  await expect(blockText(page, 0)).toBeFocused();
  await page.keyboard.type('!');
  await expect(blockText(page, 0)).toHaveText('Começo e meio!');
  await expect(blockText(page, 0).locator('i, b, p')).toHaveCount(0);

  await waitSaved(page);
  await expect.poll(() => outline(request, id)).toEqual(['0:Começo e meio!', '0:Depois um', '0:Depois dois', '0:Fim']);
});

test('AC-pauta-revelavel-15 — a pasted list of three levels creates topics and sub-items, the sub-items in size P', async ({
  page,
  request
}) => {
  const id = await createRundown(page, 'Lista colada');
  await seedSheet(page, request, id, [textDraft('a', 'Antes', shown)]);
  await selectOutsideText(page, 0);

  const list = ['- Abertura', '  - Gancho', '    • Pergunta ao chat', '* Desenvolvimento', '\tExemplo', '1. Fecho'].join('\r\n');
  await copyToClipboard(page, list);
  await page.keyboard.press('Control+V');

  const expected = ['0:Antes', '0:Abertura', '1:Gancho', '2:Pergunta ao chat', '0:Desenvolvimento', '1:Exemplo', '0:Fecho'];
  await expect.poll(() => screenOutline(page)).toEqual(expected);
  await expect(page.getByTestId('toast').filter({ hasText: 'Lista colada: 6 blocos, com os sub-itens nos níveis da lista.' })).toBeVisible();
  await expect(sheetBlocks(page).nth(2).getByTestId('block-bullet')).toHaveText('–');
  await expect(sheetBlocks(page).nth(3).getByTestId('block-bullet')).toHaveText('–');

  await waitSaved(page);
  await expect.poll(() => outline(request, id)).toEqual(expected);
  const sheet = await fetchSheet(request, id);
  expect(sheet.blocks.map((block) => block.size)).toEqual(['medium', 'medium', 'small', 'small', 'medium', 'small', 'medium']);
});

test('AC-pauta-revelavel-19 — a pasted URL becomes a text block holding the URL, never a link or an embed', async ({ page, request }) => {
  const id = await createRundown(page, 'URL colada');
  await expect(page.getByTestId('sheet-empty')).toBeVisible();

  await copyToClipboard(page, 'https://www.youtube.com/watch?v=abc123\r\n', '<a href="https://www.youtube.com/watch?v=abc123">vídeo</a>');
  await page.keyboard.press('Control+V');

  await expect(sheetBlocks(page)).toHaveCount(1);
  await expect(blockText(page, 0)).toHaveText('https://www.youtube.com/watch?v=abc123');
  await expect(page.getByTestId('sheet-column').locator('a, iframe, video')).toHaveCount(0);
  await waitSaved(page);
  await expect.poll(() => outline(request, id)).toEqual(['0:https://www.youtube.com/watch?v=abc123']);
});

test('BR-pauta-revelavel-02 — text pasted with the preparation view on is born dimmed, off screen', async ({ page, request }) => {
  const id = await createRundown(page, 'Colar no preparo');
  await seedSheet(page, request, id, [textDraft('a', 'Visível', shown)]);
  await page.keyboard.press('F2');
  await selectOutsideText(page, 0);

  await copyToClipboard(page, 'Oculto um\n\nOculto dois');
  await page.keyboard.press('Control+V');

  await expect(sheetBlocks(page)).toHaveCount(3);
  await expect(sheetBlocks(page).nth(1)).toHaveAttribute('data-shown', 'false');
  await expect(page.getByTestId('sheet-counter')).toContainText('1 de 3');
  await page.keyboard.press('F2');
  await expect(sheetBlocks(page)).toHaveCount(1);
});
