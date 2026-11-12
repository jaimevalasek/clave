import { expect, test } from './fixtures';
import type { Page } from '@playwright/test';
import { createRundown, writeNewBlock } from './helpers';

/** Live-show vocabulary that no screen may show any more (AC-pauta-revelavel-12/49). */
const RETIRED = [
  /\bbancada\b/i,
  /\bpalco\b/i,
  /\bacervo\b/i,
  /\brelat[óo]rio\b/i,
  /entrar no ar/i,
  /cron[ôo]metro/i,
  /\btrajeto\b/i,
  /\bresgate\b/i,
  /\bdeck\b/i,
  /\bdura[çc][ãa]o\b/i,
  /\bslide\b/i,
  /\d{1,2}:\d{2}:\d{2}/
];

async function assertNoLiveVocabulary(page: Page, screen: string) {
  const text = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
  for (const term of RETIRED) {
    expect(text, `${screen} shows ${term}`).not.toMatch(term);
  }
}

test('AC-pauta-revelavel-12 — the old board, stage, library and report addresses lead to the list', async ({ page }) => {
  for (const address of ['/#/board/abc', '/#/stage/abc?run=1', '/#/library', '/#/report/abc', '/#/qualquer-coisa']) {
    await page.goto(address);
    await expect(page, address).toHaveURL(/#\/rundowns$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Pautas' })).toBeVisible();
  }
});

test('AC-pauta-revelavel-49 — the list and the sheet speak Pauta, bloco, revelar and ocultar only', async ({ page }) => {
  await createRundown(page, 'Pauta do vocabulário');
  await assertNoLiveVocabulary(page, 'empty sheet');
  await writeNewBlock(page, 'Um bloco qualquer');
  await assertNoLiveVocabulary(page, 'sheet');

  await page.goto('/#/rundowns');
  await expect(page.getByRole('heading', { level: 1, name: 'Pautas' })).toBeVisible();
  await assertNoLiveVocabulary(page, 'list');
  // No timer, no "go live", no block type and no duration anywhere.
  await expect(page.getByRole('button', { name: /entrar no ar/i })).toHaveCount(0);
});
