import { expect, test } from './fixtures';
import { createBlock, createRundown, goLive } from './helpers';

/**
 * Encerrar a live entrega uma coisa só: planejado × tocado por bloco. O tempo é
 * relativo à execução, então o relatório não promete marcação de vídeo.
 */

test('AC-clave-27 e AC-clave-28 — o relatório abre ao encerrar, com planejado × tocado', async ({
  page
}) => {
  await createRundown(page, 'Live que vira relatório');
  await createBlock(page, { lane: 'topic', title: 'Abertura da live', duration: 5 });
  await createBlock(page, { lane: 'media', title: 'Demo do produto', duration: 8 });
  await createBlock(page, { lane: 'rescue', title: 'História do minuto 3', duration: 3 });
  await goLive(page);

  await page.keyboard.press('r');
  await expect(page.getByTestId('titulo-palco')).toContainText('História do minuto 3');
  await page.getByTestId('acao-avancar').click();
  await expect(page.getByTestId('titulo-palco')).toContainText('Abertura da live');
  await page.getByTestId('acao-avancar').click();
  await expect(page.getByTestId('titulo-palco')).toContainText('Demo do produto');

  await page.getByTestId('acao-encerrar').click();
  await page.getByTestId('modal').getByRole('button', { name: 'Encerrar live' }).click();

  await expect(page).toHaveURL(/#\/report\//);
  const table = page.getByTestId('tabela-trajeto');
  await expect(table).toBeVisible();
  await expect(table.locator('tbody tr')).toHaveCount(4);
  await expect(table).toContainText('RESGATE');
  // A cor da etiqueta aparece também na linha do relatório.
  await expect(table.locator('.tipo-linha').first()).toHaveCSS('color', 'rgb(216, 137, 91)');

  await expect(page.getByTestId('resumo-trajeto')).toContainText('previsto');
  await expect(page.getByTestId('resumo-trajeto')).toContainText('1 resgate sacado');

  // AC-clave-27: cada passo gravou início relativo, previsto, real e o snapshot
  // do título e da etiqueta do bloco que estava no ar.
  const firstRow = table.locator('tbody tr').first();
  await expect(firstRow.locator('td').nth(0)).toHaveText('00:00');
  await expect(firstRow.locator('td').nth(1)).toContainText('Abertura da live');
  await expect(firstRow.locator('td').nth(1)).toContainText('TEMA');
  await expect(firstRow.locator('td').nth(3)).toHaveText('05:00');
  await expect(firstRow.locator('td').nth(4)).toHaveText(/^\d{2}:\d{2}$/);
  await expect(firstRow.locator('td').nth(5)).toHaveText(/^[+−]\d{2}:\d{2}$/);

  // A ressalva do tempo relativo fica na própria tela, para o criador não
  // tentar colar isto como capítulo de vídeo.
  await expect(page.getByTestId('nota-tempo-relativo')).toContainText('não da sua gravação');
});

test('AC-clave-29 — o relatório não oferece capítulos nem trechos para corte', async ({ page }) => {
  await createRundown(page, 'Live sem marcadores');
  await createBlock(page, { lane: 'topic', title: 'Bloco único', duration: 4 });
  await goLive(page);

  // A tecla aposentada não faz nada e não deixa aviso na cena.
  await page.keyboard.press('c');
  await expect(page.getByTestId('trecho-aberto')).toHaveCount(0);
  await expect(page.getByTestId('acao-marcar-trecho')).toHaveCount(0);

  await page.getByTestId('acao-encerrar').click();
  await page.getByTestId('modal').getByRole('button', { name: 'Encerrar live' }).click();
  await expect(page).toHaveURL(/#\/report\//);

  await expect(page.getByTestId('marcadores-youtube')).toHaveCount(0);
  await expect(page.getByTestId('cortes')).toHaveCount(0);
  const bodyText = await page.locator('body').innerText();
  expect(bodyText).not.toMatch(/cap[íi]tulo/i);
  expect(bodyText).not.toMatch(/trecho/i);
});

test('AC-clave-47 — excluir um bloco já tocado não o remove do relatório', async ({ page }) => {
  await createRundown(page, 'Live do bloco excluído');
  await createBlock(page, { lane: 'topic', title: 'Bloco que será excluído', duration: 4 });
  await createBlock(page, { lane: 'topic', title: 'Bloco que fica', duration: 4 });
  await goLive(page);
  await page.getByTestId('acao-avancar').click();
  await expect(page.getByTestId('titulo-palco')).toContainText('Bloco que fica');

  // Sai do Palco mantendo a execução em aberto e exclui o bloco já tocado.
  await page.getByTestId('acao-sair-palco').click();
  await page.getByRole('button', { name: 'Deixar para depois' }).click();
  await page.locator('.cartao', { hasText: 'Bloco que será excluído' }).click();
  await page.getByTestId('excluir-bloco').click();
  await page.getByRole('button', { name: 'Excluir bloco' }).click();
  await expect(page.locator('.cartao', { hasText: 'Bloco que será excluído' })).toHaveCount(0);

  // A pauta recompacta, mas o trajeto guarda o snapshot.
  await page.reload();
  await page.getByRole('button', { name: 'Encerrar retroativamente' }).click();
  await page.getByTestId('toast').getByRole('button', { name: 'Ver relatório' }).click();

  await expect(page).toHaveURL(/#\/report\//);
  const table = page.getByTestId('tabela-trajeto');
  await expect(table).toContainText('Bloco que será excluído');
  await expect(table).toContainText('Bloco que fica');
});
