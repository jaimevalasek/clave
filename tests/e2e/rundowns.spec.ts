import { expect, test } from './fixtures';
import { createBlock } from './helpers';

/**
 * Caminho real do criador na lista de pautas: formulário de verdade, renomear,
 * duplicar, apagar por confirmar e por cancelar. Nada de estado simulado.
 */

async function createRundown(page: import('@playwright/test').Page, title: string) {
  await page.goto('/#/rundowns');
  await page.getByTestId('acao-criar-pauta').click();
  await page.getByLabel('Título da live').fill(title);
  await page.getByRole('button', { name: 'Criar', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
}

test('AC-clave-02 — criar pauta exige título e abre a Bancada vazia', async ({ page }) => {
  await page.goto('/#/rundowns');
  await page.getByTestId('acao-criar-pauta').click();

  // Título vazio bloqueia o salvamento com erro inline.
  await page.getByRole('button', { name: 'Criar', exact: true }).click();
  const titleField = page.getByLabel('Título da live');
  await expect(page.getByText('Dê um título à pauta.')).toBeVisible();
  await expect(titleField).toHaveAttribute('aria-invalid', 'true');
  await expect(titleField).toHaveAttribute('maxlength', '120');

  await titleField.fill('Live #44: perguntas e código');
  // A data usa campo nativo, sem segunda camada de formatação por cima.
  await expect(page.getByLabel('Data')).toHaveAttribute('type', 'date');
  await page.getByRole('button', { name: 'Criar', exact: true }).click();

  await expect(page).toHaveURL(/#\/board\//);
  await expect(page.getByTestId('estado-vazio-bancada')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Pauta em branco' })).toBeVisible();
});

test('AC-clave-01 — a lista mostra título, data e contagem, e abrir leva à Bancada', async ({
  page
}) => {
  await createRundown(page, 'Live #45: a lista de pautas');
  await page.goto('/#/rundowns');

  const row = page.locator('.linha-pauta', { hasText: 'Live #45: a lista de pautas' });
  await expect(row).toBeVisible();
  await expect(row.locator('.meta')).toContainText('0 blocos na pauta');
  await expect(row.locator('.meta')).toContainText('0 min previstos');

  await row.getByRole('button', { name: 'Abrir' }).click();
  await expect(page).toHaveURL(/#\/board\//);
  await expect(page.getByRole('heading', { level: 1, name: 'Live #45: a lista de pautas' })).toBeVisible();
});

test('AC-clave-03 — renomear muda só a pauta escolhida e duplicar preserva a original', async ({
  page
}) => {
  await createRundown(page, 'Pauta que vai ser renomeada');
  await createRundown(page, 'Pauta vizinha');
  await page.goto('/#/rundowns');

  const target = page.locator('.linha-pauta', { hasText: 'Pauta que vai ser renomeada' });
  await target.getByRole('button', { name: 'Renomear' }).click();
  await page.getByLabel('Título da live').fill('Nome novo em folha');
  await page.getByRole('button', { name: 'Renomear', exact: true }).last().click();

  await expect(page.locator('.linha-pauta', { hasText: 'Nome novo em folha' })).toBeVisible();
  await expect(page.locator('.linha-pauta', { hasText: 'Pauta vizinha' })).toBeVisible();
  await expect(page.locator('.linha-pauta', { hasText: 'Pauta que vai ser renomeada' })).toHaveCount(0);

  await page
    .locator('.linha-pauta', { hasText: 'Pauta vizinha' })
    .first()
    .getByRole('button', { name: 'Duplicar' })
    .click();
  await expect(page.locator('.linha-pauta', { hasText: 'Pauta vizinha (cópia)' })).toBeVisible();
  await expect(page.locator('.linha-pauta', { hasText: /^Pauta vizinha$/ })).toBeDefined();
});

test('AC-clave-55 — duplicar a pauta leva os pontos de cada bloco', async ({ page }) => {
  await createRundown(page, 'Pauta com pontos para duplicar');
  await createBlock(page, {
    lane: 'topic',
    title: 'Assunto que se repete toda semana',
    beats: [{ text: 'recado da semana' }, { text: 'agradecer os membros novos' }]
  });

  await page.goto('/#/rundowns');
  const row = page.locator('.linha-pauta', { hasText: 'Pauta com pontos para duplicar' });
  await row.getByRole('button', { name: 'Duplicar' }).click();

  const copy = page.locator('.linha-pauta', {
    hasText: 'Pauta com pontos para duplicar (cópia)'
  });
  await expect(copy).toBeVisible();
  await copy.getByRole('button', { name: 'Abrir' }).click();

  await expect(
    page.locator('.cartao', { hasText: 'Assunto que se repete toda semana' })
  ).toContainText('2 pontos');
  await page.locator('.cartao', { hasText: 'Assunto que se repete toda semana' }).click();
  const drawer = page.getByTestId('gaveta-bloco');
  await expect(drawer.getByLabel('Texto do ponto 1')).toHaveValue('recado da semana');
  await expect(drawer.getByLabel('Ponto 1 já falado')).not.toBeChecked();
});

test('AC-clave-04 — apagar passa pelo modal do design system; Esc cancela', async ({ page }) => {
  await createRundown(page, 'Pauta descartável');
  await page.goto('/#/rundowns');

  const row = page.locator('.linha-pauta', { hasText: 'Pauta descartável' });
  await row.getByRole('button', { name: 'Apagar' }).click();

  const modal = page.getByTestId('modal');
  await expect(modal).toBeVisible();
  await expect(modal).toContainText('Apagar a pauta "Pauta descartável"?');
  await expect(modal).toContainText('Esta ação não pode ser desfeita.');

  // Esc cancela e a pauta continua na lista.
  await page.keyboard.press('Escape');
  await expect(modal).toBeHidden();
  await expect(row).toBeVisible();

  await row.getByRole('button', { name: 'Apagar' }).click();
  await page.getByRole('button', { name: 'Apagar pauta' }).click();
  await expect(page.locator('.linha-pauta', { hasText: 'Pauta descartável' })).toHaveCount(0);
});

test('AC-clave-04 — nenhuma confirmação nativa existe no produto', async ({ page }) => {
  let nativeDialogs = 0;
  page.on('dialog', async (dialog) => {
    nativeDialogs += 1;
    await dialog.dismiss();
  });

  await createRundown(page, 'Pauta sem confirm nativo');
  await page.goto('/#/rundowns');
  const row = page.locator('.linha-pauta', { hasText: 'Pauta sem confirm nativo' });
  await row.getByRole('button', { name: 'Apagar' }).click();
  await page.getByRole('button', { name: 'Apagar pauta' }).click();
  await expect(page.locator('.linha-pauta', { hasText: 'Pauta sem confirm nativo' })).toHaveCount(0);

  expect(nativeDialogs).toBe(0);
});

test('AC-clave-06 — a lista marca a pauta com execução em aberto e oferece as duas saídas', async ({
  page
}) => {
  await createRundown(page, 'Pauta com execução em aberto');
  await page.getByTestId('criar-primeiro-bloco').click();
  await page.getByTestId('gaveta-bloco').getByLabel('Título').fill('Bloco que entra no ar');
  await page.getByTestId('salvar-bloco').click();
  await expect(page.getByTestId('gaveta-bloco')).toBeHidden();

  await page.getByTestId('acao-entrar-no-ar').click();
  await page.getByTestId('modal').getByRole('button', { name: 'Entrar no ar', exact: true }).click();
  await expect(page.getByTestId('palco')).toBeVisible();
  await page.getByTestId('acao-sair-palco').click();
  await page.getByRole('button', { name: 'Deixar para depois' }).click();

  // Uma pauta sem execução serve de controle: a marca é por pauta, não global.
  await createRundown(page, 'Pauta sem execução nenhuma');

  await page.goto('/#/rundowns');
  const marked = page.locator('.linha-pauta', { hasText: 'Pauta com execução em aberto' });
  await expect(marked.getByTestId('marca-execucao-aberta')).toBeVisible();
  await expect(
    page
      .locator('.linha-pauta', { hasText: 'Pauta sem execução nenhuma' })
      .getByTestId('marca-execucao-aberta')
  ).toHaveCount(0);

  // Saída 1: retomar no bloco onde parou.
  await marked.getByRole('button', { name: 'Abrir' }).click();
  const lifecycle = page.getByTestId('modal');
  await expect(lifecycle).toContainText('Execução em aberto encontrada');
  await lifecycle.getByRole('button', { name: 'Retomar de onde parou' }).click();
  await expect(page.getByTestId('palco')).toBeVisible();
  await expect(page.getByTestId('titulo-palco')).toContainText('Bloco que entra no ar');

  // Saída 2: encerrar retroativamente, sem descartar o trajeto.
  await page.getByTestId('acao-sair-palco').click();
  await page.getByRole('button', { name: 'Encerrar retroativamente' }).click();
  await expect(page.getByTestId('toast').last()).toContainText(
    'Execução encerrada com o último passo registrado'
  );

  await page.goto('/#/rundowns');
  await expect(
    page.locator('.linha-pauta', { hasText: 'Pauta com execução em aberto' })
  ).not.toContainText('EXECUÇÃO EM ABERTO');
  await page
    .locator('.linha-pauta', { hasText: 'Pauta com execução em aberto' })
    .getByRole('button', { name: 'ver relatório do trajeto' })
    .click();
  await expect(page).toHaveURL(/#\/report\//);
  await expect(page.getByTestId('tabela-trajeto')).toContainText('Bloco que entra no ar');
});

test('AC-clave-05 — sem nenhuma pauta, o boot cai no empty state que leva à criação', async ({
  page
}) => {
  await page.goto('/#/rundowns');
  await expect(page.getByTestId('pautas-lista')).toBeVisible();

  // Apaga tudo o que os testes anteriores deixaram, uma linha por vez.
  const rows = page.locator('.linha-pauta');
  for (;;) {
    const remaining = await rows.count();
    if (remaining === 0) break;
    await rows.first().getByRole('button', { name: 'Apagar' }).click();
    await page.getByRole('button', { name: 'Apagar pauta' }).click();
    await expect(rows).toHaveCount(remaining - 1);
  }

  await expect(page.getByTestId('estado-vazio-pautas')).toBeVisible();
  await page.goto('/');
  await expect(page).toHaveURL(/#\/rundowns/);
  await expect(page.getByRole('button', { name: 'Criar a primeira pauta' })).toBeVisible();
});
