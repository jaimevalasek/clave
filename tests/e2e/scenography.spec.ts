import { expect, test } from './fixtures';
import type { Locator, Page } from '@playwright/test';
import { createBlock, createRundown, goLive } from './helpers';

/**
 * A cenografia sobrevive à compressão do vídeo: a cor diz o tipo em toda
 * superfície, nada fica abaixo do piso de legibilidade no Palco, `reduced-motion`
 * deixa tudo estático e a interface recompõe até 360px.
 */

const COBRE = 'rgb(216, 137, 91)';
const NIOBIO = 'rgb(180, 155, 216)';
const PATINA = 'rgb(110, 198, 162)';

async function fontSizeOf(locator: Locator): Promise<number> {
  return Number.parseFloat(await locator.evaluate((el) => getComputedStyle(el).fontSize));
}

async function composeLive(page: Page, title: string) {
  await createRundown(page, title);
  await createBlock(page, { lane: 'topic', title: 'Abertura em cobre', duration: 5 });
  await createBlock(page, { lane: 'media', title: 'Demo em nióbio', duration: 8 });
  await createBlock(page, { lane: 'rescue', title: 'Carta em patina', duration: 3 });
}

test('AC-clave-36 — a mesma etiqueta mostra o mesmo metal nas seis superfícies', async ({
  page
}) => {
  await composeLive(page, 'Pauta da cor por etiqueta');

  // 1. Bancada: a borda do cartão do bloco de tema.
  const card = page.locator('.cartao', { hasText: 'Abertura em cobre' });
  await expect(card).toHaveCSS('border-left-color', COBRE);
  await expect(card.locator('.etiqueta')).toHaveCSS('color', COBRE);
  // 2. O cartão de mídia carrega o metal dele, na mesma lista.
  const mediaCard = page.locator('.cartao', { hasText: 'Demo em nióbio' });
  await expect(mediaCard).toHaveCSS('border-left-color', NIOBIO);

  await goLive(page);

  // 3. Selo do Palco e a palavra viva do título.
  await expect(page.locator('.selo-tipo')).toHaveCSS('color', COBRE);
  await expect(page.locator('.titulo-gigante .viva')).toHaveCSS('color', COBRE);
  // 4. Barra do cronômetro do bloco.
  await expect(page.locator('.barra-tempo i')).toHaveCSS('background-color', COBRE);
  // 5. Mini-pauta: o compasso do bloco no ar.
  await expect(page.getByTestId('mini-pauta').locator('i').first()).toHaveCSS(
    'background-color',
    COBRE
  );
  // 6. Carta do deck, sempre em patina.
  await expect(page.locator('.carta-resgate .d')).toHaveCSS('color', PATINA);
  // O compasso do dispositivo da pauta segue o metal do bloco atual.
  await expect(page.locator('.deck-pauta')).toHaveCSS('--compasso', '#d8895b');

  await page.getByTestId('acao-encerrar').click();
  await page.getByTestId('modal').getByRole('button', { name: 'Encerrar live' }).click();
  await expect(page).toHaveURL(/#\/report\//);

  // 7. Linha do relatório.
  await expect(page.getByTestId('tabela-trajeto').locator('.tipo-linha').first()).toHaveCSS(
    'color',
    COBRE
  );
});

test('AC-clave-37 — nada do Palco fica abaixo do piso de legibilidade', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await composeLive(page, 'Pauta do piso de legibilidade');
  await goLive(page);

  const stage = page.getByTestId('palco');
  const sizes = await stage.evaluate((root) => {
    const small: { text: string; size: number; weight: string }[] = [];
    for (const element of root.querySelectorAll<HTMLElement>('*')) {
      const text = (element.textContent ?? '').trim();
      if (!text || element.children.length) continue;
      const style = getComputedStyle(element);
      small.push({
        text: text.slice(0, 40),
        size: Number.parseFloat(style.fontSize),
        weight: style.fontWeight
      });
    }
    return small;
  });

  expect(sizes.length).toBeGreaterThan(5);
  for (const entry of sizes) {
    // ~20px equivalentes: texto pequeno só sobrevive com tracking e caixa alta,
    // então o piso prático é 10px, e nunca com peso fino.
    expect(entry.size, `"${entry.text}" ficou em ${entry.size}px`).toBeGreaterThanOrEqual(10);
    expect(Number(entry.weight), `"${entry.text}" usa peso ${entry.weight}`).toBeGreaterThanOrEqual(
      400
    );
  }

  // O título gigante é a voz gritada: o único peso 800 da tela.
  const title = page.getByTestId('titulo-palco');
  await expect(title).toHaveCSS('font-weight', '800');
  expect(await fontSizeOf(title)).toBeGreaterThanOrEqual(30);
});

test('AC-clave-38 — com reduced-motion tudo fica estático', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();

  await composeLive(page, 'Pauta sem movimento');
  await goLive(page);

  const durations = await page.evaluate(() => {
    const values: string[] = [];
    for (const element of document.querySelectorAll<HTMLElement>('*')) {
      const style = getComputedStyle(element);
      if (style.animationName !== 'none') values.push(`anim:${style.animationDuration}`);
      if (style.transitionDuration !== '0s') values.push(`trans:${style.transitionDuration}`);
    }
    return values;
  });

  for (const value of durations) {
    const seconds = Number.parseFloat(value.split(':')[1]);
    expect(seconds, value).toBeLessThanOrEqual(0.001);
  }

  // A poeira continua no lugar, apenas congelada.
  await expect(page.getByTestId('poeira')).toBeVisible();
  await context.close();
});

test('AC-clave-39 — a entrada do bloco é a única coreografia', async ({ page }) => {
  await composeLive(page, 'Pauta da palavra viva');
  await goLive(page);

  const words = page.locator('.titulo-gigante .palavra');
  await expect(words).toHaveCount(3);
  // 35 ms por palavra, na ordem em que o título é lido.
  await expect(words.nth(0)).toHaveCSS('animation-delay', '0s');
  await expect(words.nth(1)).toHaveCSS('animation-delay', '0.035s');
  await expect(words.nth(2)).toHaveCSS('animation-delay', '0.07s');

  // D-03: a última palavra fala em serif itálico no metal do bloco.
  const live = page.locator('.titulo-gigante .viva');
  await expect(live).toHaveCSS('font-style', 'italic');
  await expect(live).toHaveCSS('font-family', /Georgia|Iowan|Palatino|serif/);

  // As demais transições são funcionais de 150 ms.
  await expect(page.getByTestId('acao-avancar')).toHaveCSS('transition-duration', '0.15s, 0.15s');
});

test('AC-clave-46 — a interface recompõe em 900px, 360px e em janela baixa', async ({ page }) => {
  await composeLive(page, 'Pauta responsiva');

  // 360px: nenhuma tela rola na horizontal.
  for (const route of ['/#/rundowns', '/#/library']) {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto(route);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow, `${route} rola na horizontal a 360px`).toBeLessThanOrEqual(0);
  }

  await page.setViewportSize({ width: 900, height: 800 });
  await page.goto('/#/rundowns');
  await expect(page.getByTestId('pautas-lista')).toBeVisible();

  // Palco a 900px: a lateral empilha em vez de espremer o centro.
  await page.locator('.linha-pauta').first().getByRole('button', { name: 'Abrir' }).click();
  await goLive(page);
  await expect(page.locator('.palco-centro')).toHaveCSS('grid-template-columns', /^[\d.]+px$/);

  // Janela baixa: o conteúdo central não invade o rodapé.
  for (const size of [
    { width: 1280, height: 600 },
    { width: 1878, height: 550 }
  ]) {
    await page.setViewportSize(size);
    const overlapping = await page.evaluate(() => {
      const center = document.querySelector('.palco-centro');
      const footer = document.querySelector('.palco-rodape');
      if (!center || !footer) return false;
      return center.getBoundingClientRect().bottom > footer.getBoundingClientRect().top + 1;
    });
    expect(overlapping, `${size.width}x${size.height} encavala o rodapé`).toBe(false);

    const verticalOverflow = await page.evaluate(
      () => document.documentElement.scrollHeight - window.innerHeight
    );
    expect(verticalOverflow, `${size.width}x${size.height} estoura a altura`).toBeLessThanOrEqual(0);
  }
});
