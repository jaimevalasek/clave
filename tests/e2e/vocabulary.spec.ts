import { expect, test } from './fixtures';
import type { Page } from '@playwright/test';
import { createBlock, createRundown, goLive } from './helpers';

/**
 * AC-clave-35 — toda tela entregue fala o vocabulário canônico do produto, e
 * nenhuma chama Bloco de "slide", "apresentação", "item" ou "task".
 */

const FORBIDDEN = [/\bslide\b/i, /\bapresenta[çc][ãa]o\b/i, /\btask\b/i];

/** "item do acervo" é o vocabulário do próprio Acervo; Bloco nunca é "item". */
const ITEM_AS_BLOCK = /\bitem\b(?!\s+do\s+acervo)(?!\s+removido)/i;

async function assertCleanVocabulary(page: Page, screen: string) {
  const text = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
  for (const term of FORBIDDEN) {
    expect(text, `${screen} usa ${term}`).not.toMatch(term);
  }
  const itemHits = text.match(new RegExp(ITEM_AS_BLOCK, 'gi')) ?? [];
  expect(itemHits, `${screen} chama algo de "item" fora do acervo`).toEqual([]);
}

test('as telas do produto falam o vocabulário canônico', async ({ page }) => {
  await page.goto('/#/rundowns');
  await expect(page.getByTestId('pautas-lista')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Pautas' })).toBeVisible();
  await assertCleanVocabulary(page, 'Pautas');

  await createRundown(page, 'Pauta do vocabulário');
  await expect(page.getByTestId('estado-vazio-bancada')).toBeVisible();
  await assertCleanVocabulary(page, 'Bancada vazia');

  await createBlock(page, { lane: 'topic', title: 'Bloco de abertura' });
  await createBlock(page, { lane: 'rescue', title: 'Carta do deck' });
  // A Bancada nomeia Pauta, Bloco, Reserva e Resgate — e aposentou a Pista.
  await expect(page.getByTestId('pauta-lista')).toBeVisible();
  await expect(page.getByTestId('reserva')).toContainText('Resgates ficam fora da ordem');
  await expect(page.locator('.bancada-topo')).toContainText('previstos');
  await expect(await page.locator('body').innerText()).not.toMatch(/\bpista\b/i);
  await assertCleanVocabulary(page, 'Bancada');

  // A gaveta fala Etiqueta, Bloco, Pontos, Anexos e Nota privada.
  await page.locator('.cartao', { hasText: 'Bloco de abertura' }).click();
  const drawer = page.getByTestId('gaveta-bloco');
  await expect(drawer).toContainText('Editar bloco');
  await expect(drawer).toContainText('Etiqueta');
  await expect(drawer).toContainText('Pontos deste bloco');
  await expect(drawer).toContainText('Anexos');
  await assertCleanVocabulary(page, 'Gaveta do bloco');
  await page.keyboard.press('Escape');

  // A ação primária é "Entrar no ar".
  await expect(page.getByTestId('acao-entrar-no-ar')).toHaveText('Entrar no ar');

  await goLive(page);
  await expect(page.getByTestId('deck-resgate')).toContainText('DECK');
  await expect(page.locator('.atalhos-dica')).toContainText('resgate');
  await assertCleanVocabulary(page, 'Palco');

  await page.getByTestId('acao-encerrar').click();
  await page.getByTestId('modal').getByRole('button', { name: 'Encerrar live' }).click();
  await expect(page).toHaveURL(/#\/report\//);
  await expect(page.locator('.eyebrow')).toContainText('Trajeto gravado');
  await expect(page.getByTestId('tabela-trajeto')).toContainText('planejado × tocado');
  await assertCleanVocabulary(page, 'Relatório');

  await page.goto('/#/library');
  await expect(page.getByRole('heading', { level: 1, name: 'Acervo' })).toBeVisible();
  await assertCleanVocabulary(page, 'Acervo');
});
