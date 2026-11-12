import { expect } from '@playwright/test';
import type { APIRequestContext, Locator, Page } from '@playwright/test';
import { countShown } from '../../shared/reveal';
import type { RundownSummary, SheetPayload } from '../../shared/types';
import type { SheetBlockDraft } from '../helpers/sheetFixtures';

/** Shared steps: drive the real interface and read the real API. */

export async function createRundown(page: Page, title: string): Promise<string> {
  await page.goto('/#/rundowns');
  await page.getByRole('button', { name: 'Nova pauta', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Nova pauta' });
  await dialog.getByLabel('Nome da pauta').fill(title);
  await dialog.getByRole('button', { name: 'Criar pauta' }).click();
  await expect(page).toHaveURL(/#\/rundown\//);
  await expect(page.getByLabel('Nome da pauta')).toHaveValue(title);
  return rundownIdFromUrl(page);
}

export function rundownIdFromUrl(page: Page): string {
  const match = /#\/rundown\/([^/?]+)/.exec(page.url());
  if (!match) throw new Error(`not on a rundown: ${page.url()}`);
  return decodeURIComponent(match[1]);
}

export function sheetBlocks(page: Page): Locator {
  return page.getByTestId('sheet-block');
}

export function blockText(page: Page, index: number): Locator {
  return sheetBlocks(page).nth(index).getByTestId('block-text');
}

/** Clicks "Clique para escrever…" and types into the new block. */
export async function writeNewBlock(page: Page, text: string): Promise<void> {
  const before = await sheetBlocks(page).count();
  await page.getByTestId('sheet-continue').click();
  await expect(sheetBlocks(page)).toHaveCount(before + 1);
  await expect(blockText(page, before)).toBeFocused();
  await page.keyboard.type(text);
}

export async function waitSaved(page: Page): Promise<void> {
  await expect(page.getByTestId('save-state')).toHaveText(/Salvo às \d{2}:\d{2}/, { timeout: 10_000 });
}

export async function fetchSheet(request: APIRequestContext, rundownId: string): Promise<SheetPayload> {
  const response = await request.get(`/api/rundowns/${rundownId}/sheet`);
  expect(response.status()).toBe(200);
  return (await response.json()) as SheetPayload;
}

export async function listRundowns(request: APIRequestContext): Promise<RundownSummary[]> {
  const response = await request.get('/api/rundowns');
  return ((await response.json()) as { rundowns: RundownSummary[] }).rundowns;
}

export async function deleteAllRundowns(request: APIRequestContext): Promise<void> {
  for (const rundown of await listRundowns(request)) {
    await request.delete(`/api/rundowns/${rundown.id}`);
  }
}

export function plain(sheet: SheetPayload): string[] {
  return sheet.blocks.map((block) => block.content.map((run) => run.text).join(''));
}

/**
 * Writes a whole sheet through the real `PUT /api/rundowns/:id/sheet`, then
 * reloads the page so the screen starts from what the server holds. With the
 * preparation view off only the blocks on screen are in the page.
 */
export async function seedSheet(
  page: Page,
  request: APIRequestContext,
  rundownId: string,
  blocks: SheetBlockDraft[]
): Promise<void> {
  const response = await request.put(`/api/rundowns/${rundownId}/sheet`, { data: { blocks } });
  expect(response.status()).toBe(200);
  await page.reload();
  await expect(page.getByTestId('sheet-ruler')).toBeVisible();
  const shown = countShown(blocks.map((block) => ({ depth: block.depth ?? 0, takeVisible: Boolean(block.takeVisible) })));
  await expect(sheetBlocks(page)).toHaveCount(shown);
}

/** Uploads a tiny PNG through the real `POST /api/media` and returns its stored path. */
export async function uploadPng(request: APIRequestContext, fileName: string): Promise<string> {
  const body = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from('png body')]);
  const response = await request.post('/api/media', {
    headers: { 'Content-Type': 'application/octet-stream', 'x-clave-filename': encodeURIComponent(fileName) },
    data: body
  });
  expect(response.status()).toBe(201);
  return ((await response.json()) as { media: { path: string } }).media.path;
}

/** Level, size and text of every block as the server holds them. */
export async function outline(request: APIRequestContext, rundownId: string): Promise<string[]> {
  const sheet = await fetchSheet(request, rundownId);
  return sheet.blocks.map(
    (block) => `${block.depth}:${block.kind === 'text' ? block.content.map((run) => run.text).join('') : block.kind}`
  );
}

/** The same outline read from the screen. */
export async function screenOutline(page: Page): Promise<string[]> {
  return sheetBlocks(page).evaluateAll((elements) =>
    elements.map((element) => {
      const text = element.querySelector('[data-testid="block-text"]');
      return `${element.getAttribute('data-depth')}:${text ? (text.textContent ?? '') : element.getAttribute('data-kind')}`;
    })
  );
}
