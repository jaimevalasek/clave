import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/** Passos comuns às suítes: compor uma pauta real pela própria interface. */

export async function createRundown(page: Page, title: string): Promise<void> {
  await page.goto('/#/rundowns');
  await page.getByTestId('acao-criar-pauta').click();
  await page.getByLabel('Título da live').fill(title);
  await page.getByRole('button', { name: 'Criar', exact: true }).click();
  await expect(page).toHaveURL(/#\/board\//);
}

export interface BlockDraft {
  /** Etiqueta de cor do bloco; `rescue` manda o bloco para a reserva. */
  lane: string;
  title: string;
  duration?: number;
  note?: string;
  /** Pontos do bloco, na ordem. `depth` 0..2 semeia sub-pontos. */
  beats?: { text: string; imagePath?: string; depth?: number }[];
  attachment?: {
    type: string;
    label: string;
    path?: string;
    content?: string;
    fullscreen?: boolean;
  };
}

export async function createBlock(page: Page, draft: BlockDraft): Promise<void> {
  const rescue = draft.lane === 'rescue';
  const opener = rescue
    ? page.getByTestId('novo-bloco-rescue')
    : (await page.getByTestId('novo-bloco').count())
      ? page.getByTestId('novo-bloco')
      : page.getByTestId('criar-primeiro-bloco');
  await opener.click();

  const drawer = page.getByTestId('gaveta-bloco');
  await drawer.getByLabel('Título').fill(draft.title);
  if (draft.duration) {
    await drawer.getByLabel('Duração prevista (minutos)').fill(String(draft.duration));
  }
  if (draft.note) {
    await drawer.getByLabel('Nota privada').fill(draft.note);
  }
  if (draft.lane !== 'topic') {
    await drawer.getByLabel('Etiqueta').selectOption(draft.lane);
  }
  for (const [index, beat] of (draft.beats ?? []).entries()) {
    await drawer.getByTestId('novo-ponto').click();
    await drawer.getByLabel(`Texto do ponto ${index + 1}`).fill(beat.text);
    // O ponto novo nasce irmão do último. Voltar ao nível 0 e avançar até o
    // nível pedido deixa a semeadura independente de quem veio antes.
    const outdent = drawer.getByTestId(`recuar-nivel-${index}`);
    while (await outdent.isEnabled()) await outdent.click();
    for (let step = 0; step < (beat.depth ?? 0); step += 1) {
      await drawer.getByTestId(`avancar-nivel-${index}`).click();
    }
    if (beat.imagePath) {
      // A imagem do ponto é opt-in: o campo só existe depois do `+`.
      await drawer.getByTestId(`alternar-imagem-${index}`).click();
      await drawer
        .getByLabel(`Imagem do ponto ${index + 1}`, { exact: true })
        .fill(beat.imagePath);
    }
  }
  if (draft.attachment) {
    await drawer.getByRole('button', { name: '+ anexo' }).click();
    await drawer.getByLabel('Tipo do anexo 1').selectOption(draft.attachment.type);
    await drawer.getByLabel('Rótulo do anexo 1').fill(draft.attachment.label);
    if (draft.attachment.content !== undefined) {
      await drawer.getByLabel('Texto do anexo 1').fill(draft.attachment.content);
    } else {
      await drawer.getByLabel('Caminho do anexo 1').fill(draft.attachment.path ?? '');
    }
    const fullscreen = drawer.getByLabel('Toma a tela capturada ao abrir');
    if ((await fullscreen.count()) && draft.attachment.fullscreen !== undefined) {
      await fullscreen.setChecked(draft.attachment.fullscreen);
    }
  }

  await drawer.getByTestId('salvar-bloco').click();
  await expect(drawer).toBeHidden();
  await expect(page.locator('.cartao', { hasText: draft.title })).toBeVisible();
}

/** Entra no ar pelo gate real e devolve a URL do Palco. */
export async function goLive(page: Page, { expectProblems = false } = {}): Promise<void> {
  await page.getByTestId('acao-entrar-no-ar').click();
  const modal = page.getByTestId('modal');
  await expect(modal).toBeVisible();
  if (expectProblems) {
    await expect(page.getByTestId('checagem-pre-live')).toBeVisible();
    await modal.getByRole('button', { name: 'Entrar mesmo assim' }).click();
  } else {
    await modal.getByRole('button', { name: 'Entrar no ar', exact: true }).click();
  }
  await expect(page.getByTestId('palco')).toBeVisible();
}
