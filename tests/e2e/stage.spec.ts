import { expect, test } from './fixtures';
import { createBlock, createRundown, goLive } from './helpers';

/**
 * O Palco pelo caminho real: gate de entrada, condução por teclado e por
 * controle clicável, camada privada que nunca vaza, estouro e as duas saídas.
 */

test('AC-clave-15 — entrar no ar é um gate, e o anexo local quebrado é nomeado antes', async ({
  page
}) => {
  await createRundown(page, 'Pauta da checagem pré-live');
  await createBlock(page, {
    lane: 'media',
    title: 'Demo com arquivo sumido',
    attachment: { type: 'video', label: 'Corte antigo', path: 'demo-v1.mp4', fullscreen: true }
  });

  // O cartão já avisa na Bancada, antes mesmo do gate.
  await expect(page.getByTestId('alerta-anexo')).toBeVisible();

  await page.getByTestId('acao-entrar-no-ar').click();
  const checklist = page.getByTestId('checagem-pre-live');
  await expect(checklist).toBeVisible();
  await expect(checklist).toContainText('Demo com arquivo sumido');
  await expect(checklist).toContainText('Corte antigo');
  await expect(checklist).toContainText('arquivo não encontrado');

  // Voltar à Bancada não começa execução nenhuma.
  await page.getByRole('button', { name: 'Voltar à Bancada' }).click();
  await expect(page.getByTestId('palco')).toHaveCount(0);
  await expect(page.getByTestId('badge-ao-ar')).toHaveCount(0);

  await page.getByTestId('acao-entrar-no-ar').click();
  await page.getByRole('button', { name: 'Entrar mesmo assim' }).click();
  await expect(page.getByTestId('palco')).toBeVisible();
});

test('AC-clave-16 — o Palco monta as quatro faixas com o bloco no ar', async ({ page }) => {
  await createRundown(page, 'Pauta da cenografia');
  await createBlock(page, { lane: 'topic', title: 'Abertura do Clave', duration: 5 });
  await createBlock(page, { lane: 'media', title: 'Demo da curva', duration: 8 });
  await goLive(page);

  await expect(page.getByTestId('mini-pauta')).toBeVisible();
  await expect(page.getByTestId('relogio-global')).toHaveText(/^\d{2}:\d{2}$/);
  await expect(page.getByTestId('titulo-palco')).toContainText('Abertura do Clave');
  await expect(page.getByTestId('cronometro-bloco')).toContainText('previsto 05:00');
  await expect(page.getByTestId('proximo-bloco')).toHaveText('Demo da curva');
  await expect(page.getByTestId('deck-resgate')).toBeVisible();

  // O selo do tipo e a última palavra falam no metal do bloco (tema → cobre).
  await expect(page.locator('.selo-tipo')).toHaveText('Tema');
  await expect(page.locator('.titulo-gigante .viva')).toHaveCSS('color', 'rgb(216, 137, 91)');
});

test('AC-clave-16 — o título gigante é pintado com os espaços entre as palavras', async ({
  page
}) => {
  await createRundown(page, 'Pauta do título com espaços');
  await createBlock(page, { lane: 'topic', title: 'Abertura: o que é o Clave' });
  await goLive(page);

  const title = page.getByTestId('titulo-palco');
  // `textContent` traz o texto do DOM; `innerText` traz o que é de fato pintado.
  // O bug que este teste guarda vivia exatamente na diferença entre os dois:
  // com o espaço dentro do `<span>` inline-block, a tela mostrava "Abertura:oqueé".
  const painted = await title.evaluate((element) => (element as HTMLElement).innerText);
  expect(painted).toBe('Abertura: o que é o Clave');

  // Cada palavra continua sendo sua própria caixa, para a coreografia de entrada.
  await expect(page.locator('.titulo-gigante .palavra')).toHaveCount(6);
});

test('AC-clave-16 — a tela capturada não carrega aviso da Bancada', async ({ page }) => {
  await createRundown(page, 'Pauta sem toast no Palco');
  // Cada criação dispara um toast de 5,2s; entrar no ar logo em seguida é o
  // caminho normal do criador.
  await createBlock(page, { lane: 'topic', title: 'Primeiro bloco' });
  await createBlock(page, { lane: 'media', title: 'Segundo bloco' });
  await expect(page.getByTestId('toast').first()).toBeVisible();

  await goLive(page);
  await expect(page.getByTestId('palco')).toBeVisible();
  await expect(page.getByTestId('toast')).toHaveCount(0);

  // O Palco dá o próprio retorno, na faixa dele, sem toast por cima da cena.
  await page.keyboard.press('r');
  await expect(page.getByTestId('flash-palco')).toContainText('Deck vazio');
  await expect(page.getByTestId('toast')).toHaveCount(0);
});

test('AC-clave-17 — a nota privada só existe no DOM enquanto N está pressionada', async ({
  page
}) => {
  await createRundown(page, 'Pauta da camada privada');
  await createBlock(page, {
    lane: 'topic',
    title: 'Bloco com segredo',
    note: 'Lembrar de agradecer os membros novos'
  });
  await goLive(page);

  await expect(page.getByTestId('camada-privada')).toHaveCount(0);

  await page.keyboard.down('n');
  await expect(page.getByTestId('camada-privada')).toBeVisible();
  await expect(page.getByTestId('camada-privada')).toContainText(
    'Lembrar de agradecer os membros novos'
  );

  await page.keyboard.up('n');
  await expect(page.getByTestId('camada-privada')).toHaveCount(0);

  // A nota fica por cima da cena: nenhuma carta do deck pinta em cima dela.
  await page.keyboard.down('n');
  const covered = await page.evaluate(() => {
    const note = document.querySelector('[data-testid="camada-privada"]');
    if (!note) return 'nota ausente';
    const box = note.getBoundingClientRect();
    const samples = [
      [box.left + 8, box.top + 8],
      [box.left + box.width / 2, box.top + box.height / 2],
      [box.right - 8, box.bottom - 8]
    ];
    for (const [x, y] of samples) {
      const hit = document.elementFromPoint(x, y);
      if (!hit || !note.contains(hit)) {
        return `ponto (${Math.round(x)}, ${Math.round(y)}) pertence a ${hit?.className || 'nada'}`;
      }
    }
    return null;
  });
  expect(covered).toBeNull();
  await page.keyboard.up('n');

  // O controle clicável equivalente também é hold-to-show.
  const holdButton = page.getByTestId('acao-mostrar-notas');
  const box = await holdButton.boundingBox();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await expect(page.getByTestId('camada-privada')).toBeVisible();
  await page.mouse.up();
  await expect(page.getByTestId('camada-privada')).toHaveCount(0);
});

test('AC-clave-18 — atalhos conduzem a live e têm controle clicável equivalente', async ({
  page
}) => {
  await createRundown(page, 'Pauta dos atalhos');
  await createBlock(page, { lane: 'topic', title: 'Primeiro bloco' });
  await createBlock(page, { lane: 'media', title: 'Segundo bloco' });
  await createBlock(page, { lane: 'interaction', title: 'Terceiro bloco' });
  await goLive(page);

  await expect(page.getByTestId('titulo-palco')).toContainText('Primeiro bloco');

  await page.keyboard.press('Space');
  await expect(page.getByTestId('titulo-palco')).toContainText('Segundo bloco');

  await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('titulo-palco')).toContainText('Terceiro bloco');

  await page.keyboard.press('ArrowLeft');
  await expect(page.getByTestId('titulo-palco')).toContainText('Segundo bloco');

  // Os mesmos comandos existem como botão, alcançáveis por Tab.
  await page.getByTestId('acao-avancar').click();
  await expect(page.getByTestId('titulo-palco')).toContainText('Terceiro bloco');
  await page.getByTestId('acao-voltar').click();
  await expect(page.getByTestId('titulo-palco')).toContainText('Segundo bloco');
});

test('sub-ponto entra recuado no Palco e continua sendo um passo da live', async ({ page }) => {
  await createRundown(page, 'Pauta com sub-pontos no ar');
  await createBlock(page, {
    lane: 'topic',
    title: 'Aioson Copy',
    beats: [
      { text: 'Criação de Copy' },
      { text: 'Headline', depth: 1 },
      { text: 'Variação A', depth: 2 }
    ]
  });
  await goLive(page);

  const pontos = page.getByTestId('pontos-palco').locator('.ponto-palco');
  await expect(pontos).toHaveCount(1);
  await expect(pontos.first()).toHaveAttribute('data-nivel', '0');

  // O sub-ponto é o passo seguinte, não algo revelado junto com o pai.
  await page.keyboard.press('Space');
  await expect(pontos).toHaveCount(2);
  await expect(pontos.nth(1)).toContainText('Headline');
  await expect(pontos.nth(1)).toHaveAttribute('data-nivel', '1');
  await expect(pontos.nth(1)).toHaveAttribute('aria-level', '2');
  await expect(pontos.first()).toHaveClass(/falado/);

  await page.keyboard.press('Space');
  await expect(pontos).toHaveCount(3);
  await expect(pontos.nth(2)).toContainText('Variação A');
  await expect(pontos.nth(2)).toHaveAttribute('data-nivel', '2');

  // O recuo é visível de verdade: cada nível começa mais à direita.
  const bordas = await pontos.evaluateAll((nodes) =>
    nodes.map((node) => node.getBoundingClientRect().left)
  );
  expect(bordas[1]).toBeGreaterThan(bordas[0]);
  expect(bordas[2]).toBeGreaterThan(bordas[1]);
});

test('AC-clave-50 e AC-clave-51 — os pontos aparecem um a um e só então a live troca de bloco', async ({
  page
}) => {
  await createRundown(page, 'Pauta conduzida por pontos');
  await createBlock(page, {
    lane: 'topic',
    title: 'Assunto com pontos',
    beats: [{ text: 'primeiro ponto' }, { text: 'segundo ponto' }]
  });
  await createBlock(page, { lane: 'media', title: 'Assunto seguinte' });
  await goLive(page);

  const pontos = page.getByTestId('pontos-palco').locator('.ponto-palco');

  // O bloco abre mostrando só o primeiro ponto, ainda não falado.
  await expect(page.getByTestId('titulo-palco')).toContainText('Assunto com pontos');
  await expect(pontos).toHaveCount(1);
  await expect(pontos.first()).toContainText('primeiro ponto');
  await expect(pontos.first()).not.toHaveClass(/falado/);

  // Avançar marca o ponto em foco e revela o seguinte — sem trocar de bloco.
  await page.keyboard.press('Space');
  await expect(pontos).toHaveCount(2);
  await expect(pontos.first()).toHaveClass(/falado/);
  await expect(pontos.nth(1)).toContainText('segundo ponto');
  await expect(page.getByTestId('titulo-palco')).toContainText('Assunto com pontos');

  await page.keyboard.press('Space');
  await expect(pontos.nth(1)).toHaveClass(/falado/);
  await expect(page.getByTestId('titulo-palco')).toContainText('Assunto com pontos');

  // Só com os pontos esgotados o avanço troca de bloco.
  await page.keyboard.press('Space');
  await expect(page.getByTestId('titulo-palco')).toContainText('Assunto seguinte');
  await expect(page.getByTestId('pontos-palco')).toHaveCount(0);

  // Voltar refaz o mesmo caminho, ponto a ponto.
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByTestId('titulo-palco')).toContainText('Assunto com pontos');
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByTestId('pontos-palco').locator('.ponto-palco')).toHaveCount(2);
  await expect(page.getByTestId('pontos-palco').locator('.ponto-palco').nth(1)).not.toHaveClass(
    /falado/
  );

  // O estado é persistido: recarregar o Palco devolve o checklist onde estava.
  await page.reload();
  await expect(page.getByTestId('pontos-palco').locator('.ponto-palco')).toHaveCount(2);
  await expect(page.getByTestId('pontos-palco').locator('.ponto-palco').first()).toHaveClass(
    /falado/
  );
});

test('AC-clave-51 — avanços em sequência rápida não se perdem esperando a gravação', async ({
  page
}) => {
  await createRundown(page, 'Pauta do avanço rápido');
  await createBlock(page, {
    lane: 'topic',
    title: 'Assunto de três pontos',
    beats: [{ text: 'ponto um' }, { text: 'ponto dois' }, { text: 'ponto três' }]
  });
  await goLive(page);

  const pontos = page.getByTestId('pontos-palco').locator('.ponto-palco');
  await expect(pontos).toHaveCount(1);

  // Numa live real o criador aperta espaço em sequência; nenhum avanço pode
  // sumir porque a gravação do anterior ainda não voltou.
  await page.keyboard.press('Space');
  await page.keyboard.press('Space');
  await expect(pontos).toHaveCount(3);
  await expect(pontos.nth(0)).toHaveClass(/falado/);
  await expect(pontos.nth(1)).toHaveClass(/falado/);
  await expect(pontos.nth(2)).not.toHaveClass(/falado/);

  // E o que a tela mostrou é o que ficou gravado no disco.
  await page.reload();
  const relidos = page.getByTestId('pontos-palco').locator('.ponto-palco');
  await expect(relidos).toHaveCount(3);
  await expect(relidos.nth(1)).toHaveClass(/falado/);
});

test('AC-clave-52 — o Palco diz quanto falta para fechar a pauta', async ({ page }) => {
  await createRundown(page, 'Pauta do quanto falta');
  await createBlock(page, { lane: 'topic', title: 'Abertura', duration: 10 });
  await createBlock(page, { lane: 'media', title: 'Demo', duration: 20 });
  await createBlock(page, { lane: 'interaction', title: 'Perguntas', duration: 5 });
  await goLive(page);

  // Nada correu ainda: falta a pauta inteira.
  await expect(page.getByTestId('minutos-restantes')).toContainText('35');
  await expect(page.getByTestId('falta-pauta')).toContainText('falta para fechar a pauta');

  // Passar para o segundo bloco tira do total o previsto do primeiro.
  await page.getByTestId('acao-avancar').click();
  await expect(page.getByTestId('titulo-palco')).toContainText('Demo');
  await expect(page.getByTestId('minutos-restantes')).toContainText('25');

  await page.getByTestId('acao-avancar').click();
  await expect(page.getByTestId('titulo-palco')).toContainText('Perguntas');
  await expect(page.getByTestId('minutos-restantes')).toContainText('5');
});

test('AC-clave-53 — entrar no ar começa a live com o checklist limpo', async ({ page }) => {
  await createRundown(page, 'Pauta ensaiada antes da live');
  await createBlock(page, {
    lane: 'topic',
    title: 'Assunto ensaiado',
    beats: [{ text: 'ponto do ensaio' }, { text: 'segundo ponto do ensaio' }]
  });

  await goLive(page);
  await page.keyboard.press('Space');
  await expect(
    page.getByTestId('pontos-palco').locator('.ponto-palco').first()
  ).toHaveClass(/falado/);

  // Encerra o ensaio e entra no ar de novo: o checklist volta do começo.
  await page.getByTestId('acao-encerrar').click();
  await page.getByTestId('modal').getByRole('button', { name: 'Encerrar live' }).click();
  await expect(page).toHaveURL(/#\/report\//);
  await page.getByRole('button', { name: '← Bancada' }).click();
  await expect(page.getByTestId('pauta-lista')).toBeVisible();

  await goLive(page);
  const pontos = page.getByTestId('pontos-palco').locator('.ponto-palco');
  await expect(pontos).toHaveCount(1);
  await expect(pontos.first()).not.toHaveClass(/falado/);
  await expect(pontos.first()).toContainText('ponto do ensaio');
});

test('AC-clave-19 — os dois cronômetros correm e o estouro é sinalizado sem esconder o timecode', async ({
  page
}) => {
  // O relógio do browser é controlado para a live avançar sem esperar minutos
  // reais; o `startedAt` continua vindo do servidor, como em produção.
  await page.clock.install();

  await createRundown(page, 'Pauta do estouro');
  await createBlock(page, { lane: 'topic', title: 'Bloco curtíssimo', duration: 1 });
  await goLive(page);

  const global = page.getByTestId('relogio-global');
  const block = page.getByTestId('relogio-bloco');
  await expect(global).toHaveText('00:00');
  await expect(block).toHaveText('00:00');
  await expect(page.getByTestId('barra-bloco')).not.toHaveClass(/estourado/);

  await page.clock.fastForward('00:30');
  await expect(global).toHaveText('00:30');
  await expect(block).toHaveText('00:30');
  await expect(page.getByTestId('barra-bloco')).not.toHaveClass(/estourado/);

  // Passado o previsto de 1 min, a barra sinaliza sem esconder o timecode.
  await page.clock.fastForward('00:45');
  await expect(global).toHaveText('01:15');
  await expect(block).toHaveText('01:15');
  await expect(page.getByTestId('barra-bloco')).toHaveClass(/estourado/);
  await expect(page.getByTestId('aviso-estouro')).toContainText('+00:15 além do previsto');
});

test('AC-clave-20 — sair mantém a execução em aberto; encerrar exige modal', async ({ page }) => {
  await createRundown(page, 'Pauta das duas saídas');
  await createBlock(page, { lane: 'topic', title: 'Único bloco' });
  await goLive(page);

  await expect(page.getByTestId('acao-sair-palco')).toHaveAttribute(
    'title',
    /a execução fica em aberto/
  );
  await page.getByTestId('acao-sair-palco').click();

  // De volta à Bancada, o modal de ciclo de vida oferece as duas saídas.
  await expect(page).toHaveURL(/#\/board\//);
  const lifecycle = page.getByTestId('modal');
  await expect(lifecycle).toContainText('Execução em aberto encontrada');
  await page.getByRole('button', { name: 'Deixar para depois' }).click();
  await expect(page.getByTestId('badge-ao-ar')).toBeVisible();

  // Retomar volta ao Palco, e encerrar passa pelo modal de confirmação.
  await page.getByTestId('badge-ao-ar').click();
  await expect(page.getByTestId('palco')).toBeVisible();

  const confirmation = page.getByTestId('modal');
  await page.getByTestId('acao-encerrar').click();
  await expect(confirmation).toContainText('Encerrar a live?');
  await confirmation.getByRole('button', { name: 'Continuar no ar' }).click();
  await expect(page.getByTestId('palco')).toBeVisible();

  // Esc também abre o gate de encerramento, nunca encerra direto.
  await page.keyboard.press('Escape');
  await expect(confirmation).toContainText('Encerrar a live?');
  await confirmation.getByRole('button', { name: 'Encerrar live' }).click();
  await expect(page).toHaveURL(/#\/report\//);
});
