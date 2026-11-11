import { expect, test } from './fixtures';
import type { Page } from '@playwright/test';
import { createBlock, createRundown, goLive } from './helpers';

/**
 * A mídia do bloco abre no Palco sem sair do app: arquivo real copiado pela
 * gaveta, tela cheia contra painel privado, URL da web e falha explícita.
 */

const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from('pixels de exemplo do Clave')
]);

/** Escolhe um arquivo real pelo seletor da linha do anexo e espera a cópia. */
async function attachRealFile(page: Page, index: number, name: string, buffer: Buffer) {
  const upload = page.waitForResponse((response) => response.url().endsWith('/api/media'));
  await page
    .getByTestId(`seletor-de-arquivo-${index}`)
    .setInputFiles({ name, mimeType: 'image/png', buffer });
  return upload;
}

test('AC-clave-26 — anexar arquivo copia para a pasta de mídia e guarda caminho relativo', async ({
  page
}) => {
  await createRundown(page, 'Pauta do anexo real');
  await page.getByTestId('criar-primeiro-bloco').click();

  const drawer = page.getByTestId('gaveta-bloco');
  await drawer.getByLabel('Título').fill('Bloco com print');
  await drawer.getByLabel('Etiqueta').selectOption('media');
  await drawer.getByRole('button', { name: '+ anexo' }).click();
  await drawer.getByLabel('Tipo do anexo 1').selectOption('image');
  await drawer.getByLabel('Rótulo do anexo 1').fill('Print da planilha antiga');

  await attachRealFile(page, 0, 'planilha antiga.png', PNG);

  // O campo guarda o caminho relativo devolvido, nunca o caminho da máquina.
  const storedPath = await drawer.getByLabel('Caminho do anexo 1').inputValue();
  expect(storedPath).toMatch(/^[0-9a-f-]{36}\.png$/);
  expect(storedPath).not.toContain('\\');
  expect(storedPath).not.toContain('/');

  await drawer.getByLabel('Toma a tela capturada ao abrir').setChecked(true);
  await drawer.getByTestId('salvar-bloco').click();
  await expect(drawer).toBeHidden();

  // Reabrir a pauta mantém o mesmo caminho e o arquivo continua servindo.
  await page.reload();
  await page.locator('.cartao', { hasText: 'Bloco com print' }).click();
  await expect(page.getByTestId('gaveta-bloco').getByLabel('Caminho do anexo 1')).toHaveValue(
    storedPath
  );
  const served = await page.request.get(`/api/media/${storedPath}`);
  expect(served.status()).toBe(200);
  expect(Buffer.from(await served.body())).toEqual(PNG);
});

test('AC-clave-24 — telaCheia toma a tela capturada; sem ela, abre no painel privado', async ({
  page
}) => {
  await createRundown(page, 'Pauta das duas camadas');
  await page.getByTestId('criar-primeiro-bloco').click();

  const drawer = page.getByTestId('gaveta-bloco');
  await drawer.getByLabel('Título').fill('Bloco com duas mídias');
  await drawer.getByLabel('Etiqueta').selectOption('media');

  await drawer.getByRole('button', { name: '+ anexo' }).click();
  await drawer.getByLabel('Tipo do anexo 1').selectOption('image');
  await drawer.getByLabel('Rótulo do anexo 1').fill('Vai para a tela cheia');
  await attachRealFile(page, 0, 'publica.png', PNG);
  await drawer.getByLabel('Toma a tela capturada ao abrir').setChecked(true);

  await drawer.getByRole('button', { name: '+ anexo' }).click();
  await drawer.getByLabel('Tipo do anexo 2').selectOption('image');
  await drawer.getByLabel('Rótulo do anexo 2').fill('Só você vê');
  await attachRealFile(page, 1, 'privada.png', PNG);
  await drawer.locator('label.check input').nth(1).setChecked(false);

  await drawer.getByTestId('salvar-bloco').click();
  await expect(drawer).toBeHidden();
  await goLive(page);

  const slides = page.getByTestId('anexos-palco');
  await expect(slides).toContainText('Vai para a tela cheia');
  await expect(slides).toContainText('TELA CHEIA');
  await expect(slides.locator('img.midia-real')).toHaveAttribute('alt', 'Vai para a tela cheia');
  await expect(slides.getByTestId('carrossel-pagina')).toHaveText('1 / 2');

  // Tela cheia: a camada pública recebe a mídia.
  await slides.getByRole('button', { name: 'abrir' }).click();
  await expect(page.getByTestId('tomada-tela')).toBeVisible();
  await expect(page.getByTestId('painel-so-voce')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('tomada-tela')).toHaveCount(0);

  await page.keyboard.press('ArrowRight');
  await expect(slides).toContainText('Só você vê');
  await expect(slides).toContainText('SÓ VOCÊ');
  await expect(slides.locator('img.midia-real')).toHaveCount(0);
  await expect(slides.getByTestId('carrossel-pagina')).toHaveText('2 / 2');

  // Sem tela cheia: só o painel privado, que nunca é renderizado na camada pública.
  await slides.getByRole('button', { name: 'abrir' }).click();
  await expect(page.getByTestId('painel-so-voce')).toBeVisible();
  await expect(page.getByTestId('tomada-tela')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('painel-so-voce')).toHaveCount(0);
});

test('AC-clave-23 — cada tipo de anexo tem a ação certa e a cópia é confirmada', async ({
  page,
  context
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await createRundown(page, 'Pauta dos tipos de anexo');
  await createBlock(page, {
    lane: 'interaction',
    title: 'Bloco com pergunta pronta',
    attachment: {
      type: 'chat',
      label: 'Pergunta pronta',
      content: 'Qual foi a última live que morreu no meio?'
    }
  });
  await goLive(page);

  const chip = page.getByTestId('anexos-palco');
  await expect(chip).toContainText('Pergunta pronta');
  // Tipo textual copia, nunca abre. A página do carrossel mostra o texto.
  await expect(chip.getByRole('button', { name: 'copiar' })).toBeVisible();
  await expect(chip.locator('.carrossel-conteudo')).toContainText(
    'Qual foi a última live que morreu no meio?'
  );
  await chip.getByRole('button', { name: 'copiar' }).click();

  await expect(page.getByTestId('flash-palco')).toContainText('copiado para a área de transferência');
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toBe('Qual foi a última live que morreu no meio?');
});

test('AC-clave-25 — anexo de vídeo aceita URL do YouTube e a falha é nomeada', async ({ page }) => {
  await createRundown(page, 'Pauta do vídeo da web');
  await createBlock(page, {
    lane: 'media',
    title: 'Teaser no YouTube',
    attachment: {
      type: 'video',
      label: 'Teaser',
      path: 'https://youtube.com/watch?v=clave-teaser',
      fullscreen: true
    }
  });
  await createBlock(page, {
    lane: 'media',
    title: 'Corte que sumiu do disco',
    attachment: {
      type: 'video',
      label: 'Corte antigo',
      path: 'demo-v1.mp4',
      fullscreen: true
    }
  });
  await goLive(page, { expectProblems: true });

  // O YouTube vira embed, sem sair do app.
  await page.getByTestId('anexos-palco').getByRole('button', { name: 'abrir' }).click();
  const viewer = page.getByTestId('tomada-tela');
  await expect(viewer).toBeVisible();
  await expect(viewer.locator('iframe')).toHaveAttribute(
    'src',
    'https://www.youtube-nocookie.com/embed/clave-teaser'
  );
  await page.keyboard.press('Escape');

  // O anexo local quebrado é nomeado no chip e no lugar da mídia.
  await page.getByTestId('acao-avancar').click();
  await expect(page.getByTestId('titulo-palco')).toContainText('Corte que sumiu do disco');
  const brokenSlide = page.locator('.carrossel-quadro.quebrado');
  await expect(brokenSlide).toContainText('Corte antigo');
  await expect(brokenSlide).toContainText('arquivo não encontrado');

  await brokenSlide.getByRole('button', { name: 'abrir' }).click();
  await expect(page.getByTestId('erro-midia')).toContainText('Corte antigo');
  await expect(page.getByTestId('erro-midia')).toContainText('não abriu');
});

test('anexos no Palco são uma página cada e as setas percorrem o carrossel', async ({ page }) => {
  await createRundown(page, 'Pauta do carrossel');
  await page.getByTestId('criar-primeiro-bloco').click();

  const drawer = page.getByTestId('gaveta-bloco');
  await drawer.getByLabel('Título').fill('Bloco da apresentação');
  await drawer.getByLabel('Etiqueta').selectOption('media');
  await drawer.getByRole('button', { name: '+ anexo' }).click();
  await drawer.getByLabel('Tipo do anexo 1').selectOption('image');
  await drawer.getByLabel('Rótulo do anexo 1').fill('Print da home');
  await attachRealFile(page, 0, 'home.png', PNG);
  await drawer.getByLabel('Toma a tela capturada ao abrir').setChecked(true);

  await drawer.getByRole('button', { name: '+ anexo' }).click();
  await drawer.getByLabel('Tipo do anexo 2').selectOption('link');
  await drawer.getByLabel('Rótulo do anexo 2').fill('só você');
  await drawer.getByLabel('Caminho do anexo 2').fill('https://aioson.com');
  await drawer.getByTestId('salvar-bloco').click();
  await expect(drawer).toBeHidden();

  await createBlock(page, { lane: 'topic', title: 'Bloco seguinte' });
  await goLive(page);

  const slides = page.getByTestId('anexos-palco');
  await expect(slides.locator('img.midia-real')).toHaveAttribute('alt', 'Print da home');
  await expect(slides.getByTestId('carrossel-pagina')).toHaveText('1 / 2');
  await expect(slides.getByTestId('carrossel-anterior')).toBeDisabled();

  await page.keyboard.press('ArrowRight');
  await expect(slides).toContainText('só você');
  await expect(slides).toContainText('aioson.com');
  await expect(slides).toContainText('SÓ VOCÊ');
  await expect(slides.getByTestId('carrossel-pagina')).toHaveText('2 / 2');
  await expect(slides.getByTestId('carrossel-proximo')).toBeDisabled();

  // O link no Palco mostra o cartão com URL e botão de cópia com um clique
  const copyBtn = slides.locator('.btn-copiar-link');
  await expect(copyBtn).toBeVisible();
  await copyBtn.click();
  await expect(copyBtn).toContainText('copiado!');
  await expect(page.getByTestId('flash-palco')).toContainText('copiado para a área de transferência');

  const opened: string[] = [];
  await page.route('**/api/open-url', async (route) => {
    const body = (route.request().postDataJSON() ?? {}) as { url?: string };
    opened.push(body.url ?? '');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ url: body.url })
    });
  });
  await slides.getByRole('button', { name: 'abrir' }).click();
  await expect(page.getByTestId('flash-palco')).toContainText('aberto no navegador');
  await expect(page.getByTestId('painel-so-voce')).toHaveCount(0);
  await expect(page.getByTestId('tomada-tela')).toHaveCount(0);
  expect(opened).toEqual(['https://aioson.com']);

  await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('titulo-palco')).toContainText('Bloco seguinte');
  await expect(page.getByTestId('anexos-palco')).toHaveCount(0);

  await page.keyboard.press('ArrowLeft');
  await expect(page.getByTestId('titulo-palco')).toContainText('Bloco da apresentação');
  await expect(page.getByTestId('anexos-palco')).toContainText('só você');
  await expect(page.getByTestId('carrossel-pagina')).toHaveText('2 / 2');
});

test('anexo de link quebrado no Palco exibe erro e preserva URL com botão de cópia', async ({ page }) => {
  await createRundown(page, 'Pauta de link quebrado');
  await page.getByTestId('criar-primeiro-bloco').click();

  const drawer = page.getByTestId('gaveta-bloco');
  await drawer.getByLabel('Título').fill('Bloco com link local ausente');
  await drawer.getByRole('button', { name: '+ anexo' }).click();
  await drawer.getByLabel('Tipo do anexo 1').selectOption('link');
  await drawer.getByLabel('Rótulo do anexo 1').fill('Tutorial estático');
  await drawer.getByLabel('Caminho do anexo 1').fill('file:///C:/dev/aioson/inexistente.html');
  await drawer.getByTestId('salvar-bloco').click();
  await expect(drawer).toBeHidden();

  await createBlock(page, { lane: 'topic', title: 'Segundo bloco' });
  await goLive(page, { expectProblems: true });

  const brokenSlide = page.locator('.carrossel-quadro.quebrado');
  await expect(brokenSlide).toContainText('Tutorial estático');
  await expect(brokenSlide).toContainText('arquivo não encontrado');
  await expect(brokenSlide).toContainText('file:///C:/dev/aioson/inexistente.html');

  const copyBtn = brokenSlide.locator('.btn-copiar-link');
  await expect(copyBtn).toBeVisible();
  await copyBtn.click();
  await expect(copyBtn).toContainText('copiado!');
  await expect(page.getByTestId('flash-palco')).toContainText('copiado para a área de transferência');
});

test('AC-clave-26 — arquivo com extensão forjada é recusado com erro na tela', async ({ page }) => {
  await createRundown(page, 'Pauta do arquivo forjado');
  await page.getByTestId('criar-primeiro-bloco').click();

  const drawer = page.getByTestId('gaveta-bloco');
  await drawer.getByLabel('Título').fill('Bloco do arquivo suspeito');
  await drawer.getByRole('button', { name: '+ anexo' }).click();
  await drawer.getByLabel('Tipo do anexo 1').selectOption('image');

  await attachRealFile(page, 0, 'mentira.png', Buffer.from('isto não é um PNG'));

  await expect(page.getByTestId('erro-upload')).toContainText('não corresponde à extensão');
  await expect(drawer.getByLabel('Caminho do anexo 1')).toHaveValue('');
});
