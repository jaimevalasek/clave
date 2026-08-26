import { expect, test } from './fixtures';
import type { Page } from '@playwright/test';

/**
 * A Bancada pelo caminho real: a pauta é uma lista só. Criar bloco pelo
 * `+ novo bloco`, editar na gaveta, escrever os pontos, arrastar para
 * reordenar, desfazer e o equivalente por teclado.
 */

async function openNewRundown(page: Page, title: string) {
  await page.goto('/#/rundowns');
  await page.getByTestId('acao-criar-pauta').click();
  await page.getByLabel('Título da live').fill(title);
  await page.getByRole('button', { name: 'Criar', exact: true }).click();
  await expect(page).toHaveURL(/#\/board\//);
}

async function createBlock(page: Page, lane: string, title: string, duration = 10) {
  const opener =
    lane === 'rescue'
      ? page.getByTestId('novo-bloco-rescue')
      : (await page.getByTestId('novo-bloco').count())
        ? page.getByTestId('novo-bloco')
        : page.getByTestId('criar-primeiro-bloco');
  await opener.click();
  const drawer = page.getByTestId('gaveta-bloco');
  await drawer.getByLabel('Título').fill(title);
  await drawer.getByLabel('Duração prevista (minutos)').fill(String(duration));
  if (lane !== 'topic') await drawer.getByLabel('Etiqueta').selectOption(lane);
  await drawer.getByTestId('salvar-bloco').click();
  await expect(drawer).toBeHidden();
  await expect(page.locator('.cartao', { hasText: title })).toBeVisible();
}

/** A ordem da live é a ordem das linhas da pauta, de cima para baixo. */
async function trackOrder(page: Page): Promise<string[]> {
  const titles = await page.locator('.pauta-lista .linha-bloco .cartao .titulo').allTextContents();
  return titles.map((title) => title.trim());
}

const expectTrackOrder = (page: Page, expected: string[]) =>
  expect.poll(() => trackOrder(page), { timeout: 5000 }).toEqual(expected);

/** Arraste real: pointerdown, passos de movimento e pointerup sobre a linha alvo. */
async function dragCardToRow(page: Page, cardTitle: string, row: number) {
  const card = page.locator('.cartao', { hasText: cardTitle });
  const target = page.getByTestId(`linha-${row}`);
  const from = await card.boundingBox();
  const to = await target.boundingBox();
  if (!from || !to) throw new Error(`sem caixa para arrastar "${cardTitle}"`);

  // A ordem aparece de forma otimista, mas só é dada como salva quando a
  // gravação responde: o teste espera a confirmação antes de seguir.
  const saved = page.waitForResponse((response) => response.url().includes('/track/reorder'));

  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2 + 12, { steps: 4 });
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 10 });
  await page.mouse.up();

  await saved;
}

test('AC-clave-07 — a pauta é uma lista só e o resgate fica fora dela', async ({ page }) => {
  await openNewRundown(page, 'Pauta linear');
  await createBlock(page, 'topic', 'Abertura');
  await createBlock(page, 'media', 'Demo');

  // Nenhuma pista sobrou: os dois blocos moram na mesma lista, numerados.
  await expect(page.getByTestId('pauta-lista')).toBeVisible();
  await expect(page.locator('.pauta-lista .linha-bloco')).toHaveCount(2);
  await expect(page.locator('.linha-bloco .ordem').first()).toHaveText('01');
  await expect(page.locator('[data-testid^="pista-"]')).toHaveCount(0);

  const reserva = page.getByTestId('reserva');
  await expect(reserva).toBeVisible();
  await expect(reserva).toContainText('Resgates ficam fora da ordem');

  await createBlock(page, 'rescue', 'Carta de resgate');
  // O resgate não ocupa linha da pauta: a lista continua com dois blocos.
  await expect(page.locator('.pauta-lista .linha-bloco')).toHaveCount(2);
  await expect(reserva.locator('.cartao', { hasText: 'Carta de resgate' })).toBeVisible();
});

test('AC-clave-08 — a gaveta valida no domínio e mostra o erro inline', async ({ page }) => {
  await openNewRundown(page, 'Pauta da validação da gaveta');
  await page.getByTestId('criar-primeiro-bloco').click();

  const drawer = page.getByTestId('gaveta-bloco');
  const duration = drawer.getByLabel('Duração prevista (minutos)');
  await expect(duration).toHaveAttribute('type', 'number');
  await expect(duration).toHaveAttribute('inputmode', 'numeric');
  await expect(drawer.getByLabel('Título')).toHaveAttribute('maxlength', '140');
  // Valores iniciais sugeridos na criação.
  await expect(duration).toHaveValue('10');

  await drawer.getByTestId('salvar-bloco').click();
  const titleField = drawer.getByLabel('Título');
  await expect(titleField).toHaveAttribute('aria-invalid', 'true');
  const describedBy = await titleField.getAttribute('aria-describedby');
  expect(describedBy).toBeTruthy();
  await expect(drawer.locator(`#${describedBy}`)).toHaveText('Dê um título ao bloco.');

  await titleField.fill('Agora vale');
  await duration.fill('900');
  await drawer.getByTestId('salvar-bloco').click();
  await expect(drawer.getByLabel('Duração prevista (minutos)')).toHaveAttribute('aria-invalid', 'true');

  await duration.fill('12');
  await drawer.getByTestId('salvar-bloco').click();
  await expect(drawer).toBeHidden();
  await expect(page.locator('.cartao', { hasText: 'Agora vale' })).toContainText('12min');
});

test('AC-clave-49 — os pontos do bloco são escritos na gaveta e contados no cartão', async ({
  page
}) => {
  await openNewRundown(page, 'Pauta com pontos');
  await page.getByTestId('criar-primeiro-bloco').click();

  const drawer = page.getByTestId('gaveta-bloco');
  await drawer.getByLabel('Título').fill('Assunto com três pontos');
  for (const [index, texto] of ['primeiro', 'segundo', 'terceiro'].entries()) {
    await drawer.getByTestId('novo-ponto').click();
    await drawer.getByLabel(`Texto do ponto ${index + 1}`).fill(texto);
  }
  await drawer.getByTestId('salvar-bloco').click();
  await expect(drawer).toBeHidden();

  const card = page.locator('.cartao', { hasText: 'Assunto com três pontos' });
  await expect(card).toContainText('3 pontos');

  // Reabrir mostra os pontos gravados, na ordem, e a seta os reordena.
  await card.click();
  await expect(drawer.getByLabel('Texto do ponto 1')).toHaveValue('primeiro');
  await expect(drawer.getByLabel('Texto do ponto 3')).toHaveValue('terceiro');
  await drawer.getByLabel('Descer o ponto 1').click();
  await expect(drawer.getByLabel('Texto do ponto 1')).toHaveValue('segundo');
  await expect(drawer.getByLabel('Texto do ponto 2')).toHaveValue('primeiro');

  // Ponto sem texto é recusado no domínio, com erro inline na própria linha.
  await drawer.getByTestId('novo-ponto').click();
  await drawer.getByTestId('salvar-bloco').click();
  await expect(drawer).toBeVisible();
  await expect(drawer.getByTestId('ponto-3')).toContainText('Escreva o ponto ou remova a linha.');

  await drawer.getByLabel('Remover o ponto 4').click();
  await drawer.getByTestId('salvar-bloco').click();
  await expect(drawer).toBeHidden();

  await page.reload();
  await expect(page.locator('.cartao', { hasText: 'Assunto com três pontos' })).toContainText(
    '3 pontos'
  );
});

test('a imagem do ponto é opt-in: o campo só existe depois do + daquela linha', async ({
  page
}) => {
  await openNewRundown(page, 'Pauta da imagem opcional');
  await page.getByTestId('criar-primeiro-bloco').click();

  const drawer = page.getByTestId('gaveta-bloco');
  await drawer.getByLabel('Título').fill('Bloco com um ponto ilustrado');
  await drawer.getByTestId('novo-ponto').click();
  await drawer.getByLabel('Texto do ponto 1').fill('ponto com cartaz');
  await drawer.getByTestId('novo-ponto').click();
  await drawer.getByLabel('Texto do ponto 2').fill('ponto sem imagem');

  // Ponto novo nasce só com texto: quem não usa imagem nunca vê o campo.
  await expect(drawer.getByTestId('linha-imagem-0')).toBeHidden();
  await expect(drawer.getByTestId('linha-imagem-1')).toBeHidden();

  // O `+` abre só a linha pedida — o ponto vizinho continua sem o campo.
  await drawer.getByTestId('alternar-imagem-0').click();
  await expect(drawer.getByLabel('Imagem do ponto 1', { exact: true })).toBeVisible();
  await expect(drawer.getByTestId('linha-imagem-1')).toBeHidden();

  await drawer.getByLabel('Imagem do ponto 1', { exact: true }).fill('cartaz.png');
  await drawer.getByTestId('salvar-bloco').click();
  await expect(drawer).toBeHidden();

  // Reabrir traz o campo já aberto: imagem gravada nunca fica escondida.
  const card = page.locator('.cartao', { hasText: 'Bloco com um ponto ilustrado' });
  await card.click();
  await expect(drawer.getByLabel('Imagem do ponto 1', { exact: true })).toHaveValue('cartaz.png');
  await expect(drawer.getByTestId('linha-imagem-1')).toBeHidden();

  // Fechar o `+` tira a imagem daquele ponto, e isso sobrevive ao salvar.
  await drawer.getByTestId('alternar-imagem-0').click();
  await expect(drawer.getByTestId('linha-imagem-0')).toBeHidden();
  await drawer.getByTestId('salvar-bloco').click();
  await expect(drawer).toBeHidden();

  await card.click();
  await expect(drawer.getByTestId('linha-imagem-0')).toBeHidden();
  await expect(drawer.getByLabel('Texto do ponto 1')).toHaveValue('ponto com cartaz');
});

test('sub-pontos: o nível aninha, carrega os filhos junto e sobrevive ao salvar', async ({
  page
}) => {
  await openNewRundown(page, 'Pauta dos sub-pontos');
  await page.getByTestId('criar-primeiro-bloco').click();

  const drawer = page.getByTestId('gaveta-bloco');
  await drawer.getByLabel('Título').fill('Aioson Copy');
  const textos = ['Criação de Copy', 'Headline', 'Variação A', 'Onde buscar'];
  for (const [index, texto] of textos.entries()) {
    await drawer.getByTestId('novo-ponto').click();
    await drawer.getByLabel(`Texto do ponto ${index + 1}`).fill(texto);
  }

  // O primeiro ponto não tem pai acima dele: não há como ser sub-ponto.
  await expect(drawer.getByTestId('avancar-nivel-0')).toBeDisabled();

  await drawer.getByTestId('avancar-nivel-1').click();
  await drawer.getByTestId('avancar-nivel-2').click();
  await drawer.getByTestId('avancar-nivel-2').click();
  await expect(drawer.getByTestId('ponto-1')).toHaveAttribute('data-nivel', '1');
  await expect(drawer.getByTestId('ponto-2')).toHaveAttribute('data-nivel', '2');
  await expect(drawer.getByTestId('ponto-3')).toHaveAttribute('data-nivel', '0');
  // Três níveis é o teto.
  await expect(drawer.getByTestId('avancar-nivel-2')).toBeDisabled();

  await drawer.getByTestId('salvar-bloco').click();
  await expect(drawer).toBeHidden();

  // Reabrir devolve a árvore inteira: o nível é dado gravado.
  const card = page.locator('.cartao', { hasText: 'Aioson Copy' });
  await card.click();
  await expect(drawer.getByTestId('ponto-1')).toHaveAttribute('data-nivel', '1');
  await expect(drawer.getByTestId('ponto-2')).toHaveAttribute('data-nivel', '2');

  // Recuar um pai leva os filhos junto: "Variação A" continua sob "Headline".
  await drawer.getByTestId('recuar-nivel-1').click();
  await expect(drawer.getByTestId('ponto-1')).toHaveAttribute('data-nivel', '0');
  await expect(drawer.getByTestId('ponto-2')).toHaveAttribute('data-nivel', '1');

  // Descer também move a subárvore: "Headline" passa "Onde buscar" levando o
  // filho dele junto, em vez de trocar de lugar com o próprio filho.
  await drawer.getByLabel('Descer o ponto 2').click();
  await expect(drawer.getByLabel('Texto do ponto 1')).toHaveValue('Criação de Copy');
  await expect(drawer.getByLabel('Texto do ponto 2')).toHaveValue('Onde buscar');
  await expect(drawer.getByLabel('Texto do ponto 3')).toHaveValue('Headline');
  await expect(drawer.getByLabel('Texto do ponto 4')).toHaveValue('Variação A');
  await expect(drawer.getByTestId('ponto-3')).toHaveAttribute('data-nivel', '1');
});

test('AC-clave-12 — editar um bloco não vaza valor para o vizinho', async ({ page }) => {
  await openNewRundown(page, 'Pauta dos vizinhos');
  await createBlock(page, 'topic', 'Primeiro intocado', 8);
  await createBlock(page, 'topic', 'Segundo alvo', 9);

  await page.locator('.cartao', { hasText: 'Segundo alvo' }).click();
  const drawer = page.getByTestId('gaveta-bloco');
  await expect(drawer.getByLabel('Título')).toHaveValue('Segundo alvo');
  await drawer.getByLabel('Título').fill('Segundo editado');
  await drawer.getByLabel('Duração prevista (minutos)').fill('33');
  await drawer.getByTestId('salvar-bloco').click();
  await expect(drawer).toBeHidden();

  await expect(page.locator('.cartao', { hasText: 'Primeiro intocado' })).toContainText('8min');
  await expect(page.locator('.cartao', { hasText: 'Segundo editado' })).toContainText('33min');

  // Reabrir o vizinho mostra os valores dele, não os do bloco salvo.
  await page.locator('.cartao', { hasText: 'Primeiro intocado' }).click();
  await expect(drawer.getByLabel('Título')).toHaveValue('Primeiro intocado');
  await expect(drawer.getByLabel('Duração prevista (minutos)')).toHaveValue('8');
});

test('AC-clave-09 — mandar para a reserva tira da pauta e voltar recoloca no fim', async ({
  page
}) => {
  await openNewRundown(page, 'Pauta da invariante');
  await createBlock(page, 'topic', 'Fica na pauta');
  await createBlock(page, 'topic', 'Vira resgate');
  await expect(page.locator('.pauta-lista .linha-bloco')).toHaveCount(2);

  await page.locator('.cartao', { hasText: 'Vira resgate' }).click();
  const drawer = page.getByTestId('gaveta-bloco');
  await drawer.getByLabel('Etiqueta').selectOption('rescue');
  await drawer.getByTestId('salvar-bloco').click();
  await expect(drawer).toBeHidden();

  await expect(page.locator('.pauta-lista .linha-bloco')).toHaveCount(1);
  await expect(
    page.getByTestId('reserva').locator('.cartao', { hasText: 'Vira resgate' })
  ).toBeVisible();

  await page.getByTestId('reserva').locator('.cartao', { hasText: 'Vira resgate' }).click();
  await drawer.getByLabel('Etiqueta').selectOption('media');
  await drawer.getByTestId('salvar-bloco').click();
  await expect(drawer).toBeHidden();

  await expectTrackOrder(page, ['Fica na pauta', 'Vira resgate']);
});

test('AC-clave-10 — arrastar reordena, sobrevive ao reload e oferece Desfazer', async ({ page }) => {
  await openNewRundown(page, 'Pauta do arraste');
  await createBlock(page, 'topic', 'Bloco A');
  await createBlock(page, 'media', 'Bloco B');

  await expectTrackOrder(page, ['Bloco A', 'Bloco B']);

  await dragCardToRow(page, 'Bloco B', 0);
  await expectTrackOrder(page, ['Bloco B', 'Bloco A']);

  await page.reload();
  await expectTrackOrder(page, ['Bloco B', 'Bloco A']);

  // O toast oferece Desfazer, que reenvia a ordem anterior.
  await dragCardToRow(page, 'Bloco A', 0);
  await expectTrackOrder(page, ['Bloco A', 'Bloco B']);

  await page.getByTestId('toast').getByRole('button', { name: 'Desfazer' }).first().click();
  await expectTrackOrder(page, ['Bloco B', 'Bloco A']);
});

test('AC-clave-10 — existe caminho por teclado, anunciado em live region', async ({ page }) => {
  await openNewRundown(page, 'Pauta do teclado');
  await createBlock(page, 'topic', 'Primeiro do teclado');
  await createBlock(page, 'topic', 'Segundo do teclado');

  // Sem mouse: foco no cartão, Enter abre a gaveta, "Mover para…" reordena.
  await page.locator('.cartao', { hasText: 'Segundo do teclado' }).focus();
  await page.keyboard.press('Enter');

  const drawer = page.getByTestId('gaveta-bloco');
  await expect(drawer).toBeVisible();
  await drawer.getByTestId('mover-para').selectOption('0');

  await expect(page.getByTestId('anuncio-pauta')).toContainText(
    '"Segundo do teclado" movido para a posição 1 de 2 na pauta.'
  );
  await expectTrackOrder(page, ['Segundo do teclado', 'Primeiro do teclado']);
});

test('AC-clave-11 — excluir bloco confirma pelo modal do design system', async ({ page }) => {
  await openNewRundown(page, 'Pauta da exclusão');
  await createBlock(page, 'topic', 'Bloco que sai');
  await createBlock(page, 'topic', 'Bloco que fica');

  await page.locator('.cartao', { hasText: 'Bloco que sai' }).click();
  await page.getByTestId('excluir-bloco').click();

  const modal = page.getByTestId('modal');
  await expect(modal).toContainText('Excluir o bloco "Bloco que sai"?');
  // Esc cancela a confirmação e devolve à gaveta; um segundo Esc fecha a gaveta.
  await page.keyboard.press('Escape');
  await expect(modal).toBeHidden();
  await expect(page.getByTestId('gaveta-bloco')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('gaveta-bloco')).toBeHidden();
  await expect(page.locator('.cartao', { hasText: 'Bloco que sai' })).toBeVisible();

  await page.locator('.cartao', { hasText: 'Bloco que sai' }).click();
  await page.getByTestId('excluir-bloco').click();
  await page.getByRole('button', { name: 'Excluir bloco' }).click();

  await expect(page.locator('.cartao', { hasText: 'Bloco que sai' })).toHaveCount(0);
  await expect(page.locator('.cartao', { hasText: 'Bloco que fica' })).toBeVisible();
  await expect(page.locator('.pauta-lista .linha-bloco')).toHaveCount(1);
});
