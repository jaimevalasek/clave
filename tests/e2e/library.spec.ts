import { expect, test } from './fixtures';
import { createBlock, createRundown, goLive } from './helpers';

/**
 * O Acervo recicla o que funcionou: guardar pela Bancada, trazer cópia
 * independente, renomear, remover por modal e ver os contadores subirem.
 */

test('AC-clave-31 — guardar um bloco no acervo pela gaveta da Bancada', async ({ page }) => {
  await createRundown(page, 'Pauta que alimenta o acervo');
  await createBlock(page, {
    lane: 'interaction',
    title: 'Leitura de código do chat',
    attachment: { type: 'chat', label: 'Pedido pronto', content: 'Manda um trecho de até 20 linhas' }
  });

  await page.locator('.cartao', { hasText: 'Leitura de código do chat' }).click();
  await page.getByRole('button', { name: 'Guardar no acervo' }).click();
  await expect(page.getByTestId('toast').last()).toContainText('guardado no acervo');

  await page.getByTestId('toast').getByRole('button', { name: 'Ver acervo' }).click();
  await expect(page).toHaveURL(/#\/library/);

  const card = page.locator('.item-acervo', { hasText: 'Leitura de código do chat' });
  await expect(card).toBeVisible();
  await expect(card).toContainText('INTERAÇÃO');
  await expect(card).toContainText('0× no ar');
  await expect(card).toContainText('nunca foi ao ar');
});

test('AC-clave-32 — trazer cópia para a pauta atual e editá-la sem afetar o item', async ({
  page
}) => {
  await createRundown(page, 'Pauta que guarda');
  await createBlock(page, { lane: 'topic', title: 'Bloco reciclável', duration: 7 });
  await page.locator('.cartao', { hasText: 'Bloco reciclável' }).click();
  await page.getByRole('button', { name: 'Guardar no acervo' }).click();
  await expect(page.getByTestId('toast').last()).toContainText('guardado no acervo');

  await createRundown(page, 'Pauta que recebe a cópia');
  await page.getByRole('button', { name: 'Acervo', exact: true }).click();
  await expect(page).toHaveURL(/#\/library/);

  const card = page.locator('.item-acervo', { hasText: 'Bloco reciclável' });
  await card.getByRole('button', { name: 'Trazer cópia para a pauta atual' }).click();
  await expect(page.getByTestId('toast').last()).toContainText(
    'trazido para Pauta que recebe a cópia'
  );

  await page.getByTestId('toast').getByRole('button', { name: 'Ver na Bancada' }).click();
  const copy = page.locator('.cartao', { hasText: 'Bloco reciclável' });
  await expect(copy).toBeVisible();

  // Editar a cópia não alcança o item guardado.
  await copy.click();
  await page.getByTestId('gaveta-bloco').getByLabel('Título').fill('Cópia editada só na pauta');
  await page.getByTestId('salvar-bloco').click();
  await expect(page.getByTestId('gaveta-bloco')).toBeHidden();

  await page.getByRole('button', { name: 'Acervo', exact: true }).click();
  await expect(page.locator('.item-acervo', { hasText: 'Bloco reciclável' })).toBeVisible();
  await expect(page.locator('.item-acervo', { hasText: 'Cópia editada só na pauta' })).toHaveCount(0);
});

test('AC-clave-33 — renomear pelo formulário real; o tipo diz por que não muda', async ({
  page
}) => {
  await createRundown(page, 'Pauta do renomear no acervo');
  await createBlock(page, { lane: 'media', title: 'Nome antigo do item' });
  await page.locator('.cartao', { hasText: 'Nome antigo do item' }).click();
  await page.getByRole('button', { name: 'Guardar no acervo' }).click();
  await page.getByTestId('toast').getByRole('button', { name: 'Ver acervo' }).click();

  const card = page.locator('.item-acervo', { hasText: 'Nome antigo do item' });
  await card.getByRole('button', { name: 'Editar' }).click();

  const form = page.getByTestId('modal');
  await expect(form.getByTestId('tipo-imutavel')).toContainText('Mídia');
  await expect(form.getByTestId('tipo-imutavel')).toContainText(
    'O tipo do item não muda depois de guardado'
  );
  // Não existe controle para trocar o tipo nesta superfície.
  await expect(form.locator('select[aria-label="Pista"]')).toHaveCount(0);

  await form.getByLabel('Título').fill('Nome novo do item');
  await form.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.locator('.item-acervo', { hasText: 'Nome novo do item' })).toBeVisible();
  await expect(page.locator('.item-acervo', { hasText: 'Nome antigo do item' })).toHaveCount(0);
});

test('AC-clave-33 — remover confirma por modal; cancelar mantém o item', async ({ page }) => {
  await createRundown(page, 'Pauta do item descartável');
  await createBlock(page, { lane: 'topic', title: 'Item que pode sair' });
  await page.locator('.cartao', { hasText: 'Item que pode sair' }).click();
  await page.getByRole('button', { name: 'Guardar no acervo' }).click();
  await page.getByTestId('toast').getByRole('button', { name: 'Ver acervo' }).click();

  const card = page.locator('.item-acervo', { hasText: 'Item que pode sair' });
  await card.getByRole('button', { name: 'Remover' }).click();
  const modal = page.getByTestId('modal');
  await expect(modal).toContainText('Remover "Item que pode sair" do acervo?');
  await page.keyboard.press('Escape');
  await expect(card).toBeVisible();

  await card.getByRole('button', { name: 'Remover' }).click();
  await page.getByRole('button', { name: 'Remover do acervo' }).click();
  await expect(page.locator('.item-acervo', { hasText: 'Item que pode sair' })).toHaveCount(0);
});

test('AC-clave-34 — os contadores sobem depois de uma live que tocou o bloco do acervo', async ({
  page
}) => {
  await createRundown(page, 'Pauta que gera o item do contador');
  await createBlock(page, { lane: 'topic', title: 'Bloco que vai ao ar de verdade' });
  await page.locator('.cartao', { hasText: 'Bloco que vai ao ar de verdade' }).click();
  await page.getByRole('button', { name: 'Guardar no acervo' }).click();
  await expect(page.getByTestId('toast').last()).toContainText('guardado no acervo');

  await createRundown(page, 'Pauta que entra no ar com o item');
  await page.getByRole('button', { name: 'Acervo', exact: true }).click();
  await page
    .locator('.item-acervo', { hasText: 'Bloco que vai ao ar de verdade' })
    .getByRole('button', { name: 'Trazer cópia para a pauta atual' })
    .click();
  await page.getByTestId('toast').getByRole('button', { name: 'Ver na Bancada' }).click();
  await expect(page.locator('.cartao', { hasText: 'Bloco que vai ao ar de verdade' })).toBeVisible();

  await goLive(page);
  await page.getByTestId('acao-encerrar').click();
  await page.getByTestId('modal').getByRole('button', { name: 'Encerrar live' }).click();
  await expect(page).toHaveURL(/#\/report\//);

  await page.goto('/#/library');
  const card = page.locator('.item-acervo', { hasText: 'Bloco que vai ao ar de verdade' });
  await expect(card).toContainText('1× no ar');
  await expect(card).toContainText('foi ao ar hoje');
});

test('AC-clave-54 — o bloco guardado no acervo leva os pontos e volta com eles', async ({
  page
}) => {
  await createRundown(page, 'Pauta que guarda pontos no acervo');
  await createBlock(page, {
    lane: 'interaction',
    title: 'Enquete do chat',
    beats: [{ text: 'abre a enquete' }, { text: 'lê os resultados' }]
  });

  await page.locator('.cartao', { hasText: 'Enquete do chat' }).click();
  await page.getByRole('button', { name: 'Guardar no acervo' }).click();
  await expect(page.getByTestId('toast').last()).toContainText('guardado no acervo');

  // Outra pauta traz a cópia: os pontos vêm junto, e vêm desmarcados.
  await createRundown(page, 'Pauta que recebe do acervo');
  await page.getByRole('button', { name: 'Acervo', exact: true }).click();
  await expect(page).toHaveURL(/#\/library/);
  await page
    .locator('.item-acervo', { hasText: 'Enquete do chat' })
    .getByRole('button', { name: 'Trazer cópia para a pauta atual' })
    .click();
  await expect(page.getByTestId('toast').last()).toContainText('trazido para');

  await page.getByTestId('toast').getByRole('button', { name: 'Ver na Bancada' }).click();
  await expect(page.locator('.cartao', { hasText: 'Enquete do chat' })).toContainText('2 pontos');

  await page.locator('.cartao', { hasText: 'Enquete do chat' }).click();
  const drawer = page.getByTestId('gaveta-bloco');
  await expect(drawer.getByLabel('Texto do ponto 1')).toHaveValue('abre a enquete');
  await expect(drawer.getByLabel('Texto do ponto 2')).toHaveValue('lê os resultados');
  await expect(drawer.getByLabel('Ponto 1 já falado')).not.toBeChecked();
});

test('AC-clave-31 — acervo vazio mostra estado vazio explícito', async ({ page }) => {
  await page.goto('/#/library');
  const grid = page.getByTestId('acervo-grade');
  await expect(grid).toBeVisible();

  // Limpa o que os testes anteriores deixaram para ver o estado vazio real.
  const cards = page.locator('.item-acervo');
  for (;;) {
    const remaining = await cards.count();
    if (remaining === 0) break;
    await cards.first().getByRole('button', { name: 'Remover' }).click();
    await page.getByRole('button', { name: 'Remover do acervo' }).click();
    await expect(cards).toHaveCount(remaining - 1);
  }

  await expect(page.getByTestId('estado-vazio-acervo')).toContainText('Acervo vazio');
  await expect(page.getByTestId('estado-vazio-acervo')).toContainText('Guardar no acervo');
});
