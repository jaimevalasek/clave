import { expect, test } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';
import { createBlock, createRundown, goLive } from './helpers';

/**
 * Camada didática do protótipo aprovado: tour de 5 passos com holofote e guia
 * completo no controle `? Como usar`. Esta é a única suíte que exercita o
 * estado de primeira abertura, e ela o liga e desliga pela rota real
 * (`PUT /api/preferences`), que é a mesma que o produto usa.
 */

async function tourSeen(request: APIRequestContext, seen: boolean): Promise<void> {
  await request.put('/api/preferences', { data: { tourSeen: seen } });
}

// O padrão é o Clave de quem já usa: montar pauta e bloco não briga com o tour.
test.beforeEach(async ({ request }) => {
  await tourSeen(request, true);
});

test('o tour abre sozinho na primeira vez e não volta na segunda', async ({ page, request }) => {
  await tourSeen(request, false);
  await page.goto('/#/rundowns');

  const tour = page.getByTestId('tour');
  await expect(tour).toBeVisible();
  await expect(tour).toContainText('O Clave em');
  await expect(tour).toContainText('COMO USAR · 1 / 5');

  // "Pular" é uma saída legítima: o tour conta como visto e não volta.
  await tour.getByRole('button', { name: 'Pular' }).click();
  await expect(tour).toBeHidden();

  await page.reload();
  await expect(page.getByTestId('pautas-lista')).toBeVisible();
  await expect(page.getByTestId('tour')).toBeHidden();
});

test('o holofote recorta a região explicada em cada passo', async ({ page, request }) => {
  await createRundown(page, 'Pauta do tour');
  await createBlock(page, { lane: 'topic', title: 'Abertura', duration: 10 });

  await tourSeen(request, false);
  await page.reload();

  const tour = page.getByTestId('tour');
  await expect(tour).toBeVisible();

  // Passo 1 fala do produto inteiro: fundo escuro sem recorte.
  await expect(page.getByTestId('tour-fundo')).toHaveClass(/sem-alvo/);
  await expect(page.getByTestId('tour-foco')).toBeHidden();

  for (const anchor of ['bancada-canvas', 'pauta-lista', 'reserva', 'acao-entrar-no-ar']) {
    await page.getByTestId('tour-avancar').click();
    await expect(page.getByTestId('tour-foco')).toBeVisible();

    // O recorte pousa sobre o elemento real da tela, não sobre um retângulo qualquer.
    await expect
      .poll(async () => {
        const focus = await page.getByTestId('tour-foco').boundingBox();
        const target = await page.getByTestId(anchor).boundingBox();
        if (!focus || !target) return Number.POSITIVE_INFINITY;
        return Math.abs(focus.x - Math.max(8, target.x)) + Math.abs(focus.y - Math.max(8, target.y));
      }, { message: `holofote sobre ${anchor}` })
      .toBeLessThan(3);
  }

  await expect(page.getByTestId('tour-avancar')).toHaveText('Começar a usar');
  await page.getByTestId('tour-avancar').click();
  await expect(tour).toBeHidden();
});

test('o guia completo abre pelo "Como usar" e explica a live inteira', async ({ page }) => {
  await page.goto('/#/rundowns');
  await expect(page.getByTestId('pautas-lista')).toBeVisible();

  await page.getByTestId('acao-como-usar').click();
  const guide = page.getByTestId('guia-como-usar');
  await expect(guide).toBeVisible();

  // Os quatro movimentos, na ordem de uma live real.
  await expect(guide).toContainText('Movimento 1 · antes da live');
  await expect(guide).toContainText('Movimento 2 · dentro de cada bloco');
  await expect(guide).toContainText('Movimento 3 · durante a live');
  await expect(guide).toContainText('Movimento 4 · depois da live');

  // As cinco teclas do Palco: o `C` de marcar trecho saiu junto com os cortes.
  const keys = guide.getByTestId('teclas-do-palco');
  await expect(keys.locator('.tecla')).toHaveCount(5);
  await expect(keys).toContainText('revela o próximo ponto');
  await expect(keys).not.toContainText('trecho');

  // O guia fala do produto simplificado: pontos no lugar da curva de energia, e
  // tempo relativo no lugar dos capítulos de vídeo.
  await expect(guide).toContainText('os pontos aparecem um a um conforme você avança');
  await expect(guide).toContainText('quanto falta para fechar a pauta');
  await expect(guide).not.toContainText('curva de energia');
  await expect(guide).not.toContainText('capítulos do YouTube');

  // O guia fala do produto entregue, não da maquete que ele explicava antes.
  await expect(guide).toContainText('Onde o Clave guarda tudo');
  await expect(guide).not.toContainText('protótipo');

  await page.getByTestId('fechar-guia').click();
  await expect(guide).toBeHidden();
});

test('do tour para o guia e do guia de volta ao tour', async ({ page, request }) => {
  await tourSeen(request, false);
  await page.goto('/#/rundowns');

  await page.getByTestId('tour').getByRole('button', { name: 'Guia completo' }).click();
  await expect(page.getByTestId('guia-como-usar')).toBeVisible();
  await expect(page.getByTestId('tour')).toBeHidden();

  await page.getByRole('button', { name: 'Ver o tour de 5 passos' }).click();
  await expect(page.getByTestId('tour')).toContainText('COMO USAR · 1 / 5');
  await expect(page.getByTestId('guia-como-usar')).toBeHidden();

  await page.keyboard.press('Escape');
  await expect(page.getByTestId('tour')).toBeHidden();
});

test('a camada didática não entra na tela capturada do Palco', async ({ page }) => {
  await createRundown(page, 'Pauta sem guia no ar');
  await createBlock(page, { lane: 'topic', title: 'Bloco único', duration: 5 });

  await expect(page.getByTestId('acao-como-usar')).toBeVisible();
  await goLive(page);

  // Nada de chrome do app no OBS: o controle do guia some no Palco.
  await expect(page.getByTestId('acao-como-usar')).toBeHidden();
});

test('a preferência do tour não passa pelo localStorage (AC-clave-40)', async ({
  page,
  request
}) => {
  await tourSeen(request, false);
  await page.goto('/#/rundowns');
  await page.getByTestId('tour').getByRole('button', { name: 'Pular' }).click();
  await expect(page.getByTestId('tour')).toBeHidden();

  const storage = await page.evaluate(() => ({
    local: Object.entries(window.localStorage),
    session: Object.entries(window.sessionStorage)
  }));
  expect(storage.local).toEqual([]);
  expect(storage.session).toEqual([]);
});
