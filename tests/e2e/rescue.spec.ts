import { expect, test } from './fixtures';
import { createBlock, createRundown, goLive } from './helpers';

/**
 * O deck fica sempre à mão, saca sem repetir carta e devolve a live ao ponto
 * exato da pauta — sem nenhum passo manual.
 */

test('AC-clave-21 — sacar do meio da pauta por clique e voltar ao mesmo ponto', async ({
  page
}) => {
  await createRundown(page, 'Pauta do resgate por clique');
  await createBlock(page, { lane: 'topic', title: 'Abertura' });
  await createBlock(page, { lane: 'media', title: 'Bloco do meio' });
  await createBlock(page, { lane: 'interaction', title: 'Fechamento' });
  await createBlock(page, { lane: 'rescue', title: 'História do minuto 3' });
  await goLive(page);

  await page.getByTestId('acao-avancar').click();
  await expect(page.getByTestId('titulo-palco')).toContainText('Bloco do meio');

  await page.locator('.carta-resgate', { hasText: 'História do minuto 3' }).click();
  await expect(page.locator('.selo-resgate')).toHaveText('RESGATE');
  await expect(page.getByTestId('titulo-palco')).toContainText('História do minuto 3');
  // A lateral já anuncia para onde a live volta.
  await expect(page.locator('.a-seguir .rot')).toHaveText('de volta à pauta');
  await expect(page.getByTestId('proximo-bloco')).toHaveText('Bloco do meio');

  await page.getByTestId('acao-avancar').click();
  await expect(page.getByTestId('titulo-palco')).toContainText('Bloco do meio');
  await expect(page.locator('.selo-resgate')).toHaveCount(0);
  await expect(page.getByTestId('proximo-bloco')).toHaveText('Fechamento');
});

test('AC-clave-21 — R saca do deck e a carta usada sai do sorteio', async ({ page }) => {
  await createRundown(page, 'Pauta do saque por tecla');
  await createBlock(page, { lane: 'topic', title: 'Bloco único da pauta' });
  await createBlock(page, { lane: 'rescue', title: 'Carta única do deck' });
  await goLive(page);

  await page.keyboard.press('r');
  await expect(page.getByTestId('titulo-palco')).toContainText('Carta única do deck');
  await expect(page.locator('.carta-resgate.usada')).toHaveCount(1);
  await expect(page.locator('.carta-resgate.usada')).toHaveAttribute(
    'title',
    'Já foi ao ar nesta live'
  );

  // Voltar à pauta e sacar de novo: o deck não tem carta livre.
  await page.getByTestId('acao-avancar').click();
  await expect(page.getByTestId('titulo-palco')).toContainText('Bloco único da pauta');
  await page.keyboard.press('r');
  await expect(page.getByTestId('flash-palco')).toContainText('Deck vazio');
  await expect(page.getByTestId('titulo-palco')).toContainText('Bloco único da pauta');
});

test('AC-clave-21 — retomar a execução reconstrói as cartas já usadas', async ({ page }) => {
  await createRundown(page, 'Pauta que é retomada');
  await createBlock(page, { lane: 'topic', title: 'Bloco da retomada' });
  await createBlock(page, { lane: 'rescue', title: 'Carta já sacada' });
  await createBlock(page, { lane: 'rescue', title: 'Carta ainda intacta' });
  await goLive(page);

  await page.locator('.carta-resgate', { hasText: 'Carta já sacada' }).click();
  await expect(page.getByTestId('titulo-palco')).toContainText('Carta já sacada');

  // Sair e voltar: a carta usada continua marcada, vinda do trajeto gravado.
  await page.getByTestId('acao-sair-palco').click();
  await page.getByRole('button', { name: 'Deixar para depois' }).click();
  await page.getByTestId('badge-ao-ar').click();
  await expect(page.getByTestId('palco')).toBeVisible();

  await expect(page.locator('.carta-resgate.usada')).toHaveCount(1);
  await expect(page.locator('.carta-resgate.usada')).toContainText('Carta já sacada');
});

test('AC-clave-22 — pauta sem resgates mostra o deck em estado vazio explícito', async ({
  page
}) => {
  await createRundown(page, 'Pauta sem deck');
  await createBlock(page, { lane: 'topic', title: 'Único bloco' });
  await goLive(page);

  const deck = page.getByTestId('deck-resgate');
  await expect(deck).toBeVisible();
  await expect(page.getByTestId('estado-deck-vazio')).toContainText('Deck vazio');
  await expect(page.getByTestId('estado-deck-vazio')).toContainText(
    'Crie resgates na reserva da Bancada'
  );
  await expect(page.locator('.carta-resgate')).toHaveCount(0);
});
