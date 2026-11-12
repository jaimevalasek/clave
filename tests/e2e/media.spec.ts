import fs from 'node:fs';
import path from 'node:path';
import type { APIRequestContext, Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { blockText, createRundown, fetchSheet, outline, screenOutline, seedSheet, sheetBlocks, waitSaved } from './helpers';
import { mediaDraft, textDraft } from '../helpers/sheetFixtures';

/**
 * Media into the sheet through the real interface: a print pasted from the
 * system clipboard, files dropped on the window, the failures in the block,
 * playback by the button and by Ctrl+Enter, and a file gone from the media
 * folder. Every stored file is checked in the e2e app folder on disk.
 */

const shown = { plannedVisible: true, takeVisible: true };

interface FileSpec {
  name: string;
  type: string;
  base64: string;
  /** Pretends a bigger file without allocating it (the 512 MB ceiling). */
  size?: number;
}

function mediaFolder(): string {
  return path.join(process.env.CLAVE_E2E_APP_DIR as string, 'data', 'media');
}

/** A real PCM WAV: a 440 Hz tone, long enough to stay playing through a test. */
function wav(seconds = 30, rate = 8000): Buffer {
  const samples = seconds * rate;
  const data = Buffer.alloc(samples * 2);
  for (let index = 0; index < samples; index += 1) {
    data.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 440 * index) / rate) * 6000), index * 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0, 'latin1');
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVEfmt ', 8, 'latin1');
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36, 'latin1');
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

const wavFile = (name: string): FileSpec => ({ name, type: 'audio/wav', base64: wav().toString('base64') });
const pngFile = (name: string): FileSpec => ({ name, type: 'image/png', base64: PNG.toString('base64') });

async function uploadThroughApi(request: APIRequestContext, name: string, body: Buffer): Promise<string> {
  const response = await request.post('/api/media', {
    headers: { 'Content-Type': 'application/octet-stream', 'x-clave-filename': encodeURIComponent(name) },
    data: body
  });
  expect(response.status()).toBe(201);
  return ((await response.json()) as { media: { path: string } }).media.path;
}

/** Drags files over the window and drops them right above the block at `beforeIndex` (or below the last one). */
async function dropFiles(page: Page, files: FileSpec[], beforeIndex?: number): Promise<void> {
  const dataTransfer = await page.evaluateHandle((specs) => {
    const transfer = new DataTransfer();
    for (const spec of specs) {
      const bytes = Uint8Array.from(atob(spec.base64), (char) => char.charCodeAt(0));
      transfer.items.add(new File([bytes], spec.name, { type: spec.type }));
    }
    return transfer;
  }, files);
  const column = page.getByTestId('sheet-column');
  await column.dispatchEvent('dragenter', { dataTransfer });
  await expect(page.getByTestId('drop-overlay')).toHaveText('Solte para criar blocos aqui');
  const anchor = beforeIndex === undefined ? page.getByTestId('sheet-continue') : sheetBlocks(page).nth(beforeIndex);
  const box = await anchor.boundingBox();
  if (!box) throw new Error('no drop anchor');
  await column.dispatchEvent('drop', { dataTransfer, clientY: box.y + 2 });
  await expect(page.getByTestId('drop-overlay')).toHaveCount(0);
}

/** A paste event carrying files, as Ctrl+V of files copied in the Explorer sends it. */
async function pasteFiles(page: Page, files: FileSpec[]): Promise<void> {
  await page.evaluate((specs) => {
    const list = specs.map((spec) => {
      const bytes = Uint8Array.from(atob(spec.base64), (char) => char.charCodeAt(0));
      const file = new File([bytes], spec.name, { type: spec.type });
      if (spec.size) Object.defineProperty(file, 'size', { value: spec.size });
      return file;
    });
    const event = new ClipboardEvent('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', {
      value: { files: list, items: [], types: ['Files'], getData: () => '' }
    });
    (document.activeElement ?? document.body).dispatchEvent(event);
  }, files);
}

function mediaElementPaused(page: Page, index: number): Promise<boolean> {
  return sheetBlocks(page)
    .nth(index)
    .locator('audio, video')
    .evaluate((element) => (element as HTMLMediaElement).paused);
}

test('AC-pauta-revelavel-16 — Ctrl+V of a print shows "Gravando … na pasta de mídia", then the image is in the media folder and survives a reload', async ({
  page,
  request
}) => {
  const id = await createRundown(page, 'Print colado');
  await seedSheet(page, request, id, [textDraft('a', 'Antes do print', shown)]);

  // Hold the upload so the progress can be seen.
  let release: () => void = () => undefined;
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route('**/api/media', async (route) => {
    await held;
    await route.continue();
  });

  await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 36;
    const context = canvas.getContext('2d') as CanvasRenderingContext2D;
    context.fillStyle = '#c8a24a';
    context.fillRect(0, 0, 64, 36);
    const blob = await new Promise<Blob>((resolve) => canvas.toBlob((value) => resolve(value as Blob), 'image/png'));
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
  });
  await page.keyboard.press('Control+V');

  const uploading = page.getByTestId('media-uploading');
  await expect(uploading).toContainText(/Gravando .+\.png na pasta de mídia/);
  await expect(uploading.locator('progress')).toHaveCount(1);
  // Not a block of the rundown yet: out of the counter and out of the save.
  await expect(page.getByTestId('sheet-counter')).toContainText('1 de 1');

  release();
  await expect(sheetBlocks(page).nth(1).getByTestId('media-image')).toBeVisible();
  await expect(page.getByTestId('sheet-counter')).toContainText('2 de 2');
  await waitSaved(page);

  const sheet = await fetchSheet(request, id);
  const image = sheet.blocks[1];
  expect(image.kind).toBe('image');
  expect(fs.existsSync(path.join(mediaFolder(), image.mediaPath))).toBe(true);

  await page.unroute('**/api/media');
  await page.reload();
  await expect(sheetBlocks(page).nth(1).getByTestId('media-image').locator('img')).toHaveJSProperty('complete', true);
  expect(await sheetBlocks(page).nth(1).locator('img').evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBe(64);
});

test('AC-pauta-revelavel-17 — dragging files shows "Solte para criar blocos aqui" and the drop creates the blocks where it happened', async ({
  page,
  request
}) => {
  const id = await createRundown(page, 'Soltar arquivos');
  await seedSheet(page, request, id, [textDraft('a', 'Um', shown), textDraft('b', 'Dois', shown)]);

  await dropFiles(page, [wavFile('vinheta.wav'), pngFile('grafico.png')], 1);

  await expect.poll(() => screenOutline(page)).toEqual(['0:Um', '0:audio', '0:image', '0:Dois']);
  await waitSaved(page);
  await expect.poll(() => outline(request, id)).toEqual(['0:Um', '0:audio', '0:image', '0:Dois']);
  const sheet = await fetchSheet(request, id);
  expect(sheet.blocks[1].mediaName).toBe('vinheta.wav');
  for (const block of sheet.blocks.slice(1, 3)) expect(fs.existsSync(path.join(mediaFolder(), block.mediaPath))).toBe(true);

  // A drop below the last block lands at the end; a drag that leaves the window clears the overlay.
  await dropFiles(page, [pngFile('fim.png')]);
  await expect.poll(() => screenOutline(page)).toEqual(['0:Um', '0:audio', '0:image', '0:Dois', '0:image']);
  await page.reload();
  await expect.poll(() => screenOutline(page)).toEqual(['0:Um', '0:audio', '0:image', '0:Dois', '0:image']);
});

test('AC-pauta-revelavel-18 — format, size and write failures show in the block while the column and the shortcuts keep working; "Tentar de novo" turns it into the media', async ({
  page,
  request
}) => {
  const id = await createRundown(page, 'Falhas de mídia');
  await seedSheet(page, request, id, [textDraft('a', 'Texto', shown)]);

  await page.route('**/api/media', (route) => route.abort());
  await pasteFiles(page, [
    { name: 'planilha.xlsx', type: 'application/vnd.ms-excel', base64: 'UEsDBA==' },
    { name: 'gravacao-longa.mp4', type: 'video/mp4', base64: 'AAAAIGZ0eXBpc29t', size: 600 * 1024 * 1024 },
    wavFile('narracao.wav')
  ]);

  const failures = page.getByTestId('media-failure');
  await expect(failures).toHaveCount(3);
  await expect(failures.nth(0)).toHaveAttribute('data-reason', 'unsupported');
  await expect(failures.nth(0)).toContainText('Formato não suportado');
  await expect(failures.nth(0)).toContainText('planilha.xlsx');
  await expect(failures.nth(1)).toContainText('Arquivo grande demais');
  await expect(failures.nth(1)).toContainText('gravacao-longa.mp4 tem 600 MB. O limite é 512 MB por arquivo.');
  await expect(failures.nth(2)).toContainText('Não deu para gravar a mídia');
  for (let index = 0; index < 3; index += 1) {
    await expect(failures.nth(index).getByRole('button', { name: 'Remover bloco' })).toBeVisible();
  }
  await expect(failures.nth(2).getByRole('button', { name: 'Tentar de novo' })).toBeVisible();
  // Failures are not blocks of the rundown: counter and server ignore them.
  await expect(page.getByTestId('sheet-counter')).toContainText('1 de 1');

  // The column and the shortcuts keep working.
  await page.keyboard.press('F2');
  await expect(page.getByTestId('toast').filter({ hasText: 'Preparo ligado' })).toBeVisible();
  await page.keyboard.press('F2');
  await page.getByTestId('sheet-continue').click();
  await page.keyboard.type('Escrito depois das falhas');
  await waitSaved(page);
  await expect.poll(() => outline(request, id)).toEqual(['0:Texto', '0:Escrito depois das falhas']);

  // "Tentar de novo" writes the same file again and the block becomes the audio.
  await page.unroute('**/api/media');
  await failures.nth(2).getByRole('button', { name: 'Tentar de novo' }).click();
  await expect(sheetBlocks(page).nth(3).getByTestId('media-audio')).toBeVisible();
  await expect(failures).toHaveCount(2);
  await waitSaved(page);
  await expect.poll(() => outline(request, id)).toEqual(['0:Texto', '0:audio', '0:Escrito depois das falhas']);

  // AC-pauta-revelavel-45: a failure block leaves without the confirmation, by its button or by the trash.
  await failures.nth(0).getByRole('button', { name: 'Remover bloco' }).click();
  await expect(failures).toHaveCount(1);
  await sheetBlocks(page).nth(1).hover();
  await sheetBlocks(page).nth(1).getByTestId('block-remove').click();
  await expect(failures).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('AC-pauta-revelavel-45 — a media block that is not a failure asks "Apagar bloco?" before leaving', async ({ page, request }) => {
  const id = await createRundown(page, 'Apagar mídia');
  const image = await uploadThroughApi(request, 'foto.png', PNG);
  await seedSheet(page, request, id, [mediaDraft('m', 'image', image, { ...shown, mediaName: 'foto.png' })]);

  await sheetBlocks(page).nth(0).hover();
  await sheetBlocks(page).nth(0).getByTestId('block-remove').click();
  const dialog = page.getByRole('dialog', { name: 'Apagar bloco?' });
  await expect(dialog).toContainText('Você vai apagar esta imagem da pauta. Não dá para desfazer.');
  await page.keyboard.press('Escape');
  await expect(sheetBlocks(page)).toHaveCount(1);
});

test('AC-pauta-revelavel-33 — audio starts still; the button and Ctrl+Enter play and pause it inside the block; hiding stops it', async ({
  page,
  request
}) => {
  const id = await createRundown(page, 'Tocar áudio');
  await seedSheet(page, request, id, [textDraft('a', 'Antes', shown)]);
  await dropFiles(page, [wavFile('trilha.wav')]);
  const audioBlock = sheetBlocks(page).nth(1);
  const play = audioBlock.getByTestId('media-play');
  await expect(play).toHaveAttribute('aria-label', 'Tocar áudio');
  await expect(audioBlock.getByTestId('media-audio')).toContainText('Ctrl+Enter toca');
  expect(await mediaElementPaused(page, 1)).toBe(true);

  await play.click();
  await expect(play).toHaveAttribute('aria-label', 'Pausar áudio');
  await expect.poll(() => mediaElementPaused(page, 1)).toBe(false);
  await play.click();
  await expect(play).toHaveAttribute('aria-label', 'Tocar áudio');
  expect(await mediaElementPaused(page, 1)).toBe(true);

  // Ctrl+Enter acts on the selected media block, even with the caret in a text elsewhere afterwards.
  await page.keyboard.press('Control+Enter');
  await expect(play).toHaveAttribute('aria-label', 'Pausar áudio');
  await page.keyboard.press('Control+Enter');
  await expect(play).toHaveAttribute('aria-label', 'Tocar áudio');

  // Hiding the block stops it: in preparation the block stays, dimmed and paused.
  await page.keyboard.press('Control+Enter');
  await expect.poll(() => mediaElementPaused(page, 1)).toBe(false);
  await page.keyboard.press('F2');
  await audioBlock.hover();
  await audioBlock.getByTestId('block-eye').click();
  await expect(audioBlock).toHaveAttribute('data-shown', 'false');
  await expect.poll(() => mediaElementPaused(page, 1)).toBe(true);
  await expect(play).toHaveAttribute('aria-label', 'Tocar áudio');

  // With no video or audio on screen, Ctrl+Enter says so.
  await page.keyboard.press('F2');
  await blockText(page, 0).click();
  await page.keyboard.press('Control+Enter');
  await expect(page.getByTestId('toast').filter({ hasText: 'Nenhum vídeo ou áudio na tela.' })).toBeVisible();
  await expect(blockText(page, 0)).toHaveText('Antes');
});

test('BR-pauta-revelavel-09 — without a media block selected, Ctrl+Enter plays the media revealed last', async ({ page, request }) => {
  const id = await createRundown(page, 'Último revelado');
  const first = await uploadThroughApi(request, 'primeiro.wav', wav());
  const second = await uploadThroughApi(request, 'segundo.wav', wav());
  await seedSheet(page, request, id, [
    textDraft('t', 'Roteiro', shown),
    mediaDraft('a', 'audio', first, { mediaName: 'primeiro.wav', takeVisible: true, revealStep: 2 }),
    mediaDraft('b', 'audio', second, { mediaName: 'segundo.wav', takeVisible: true, revealStep: 1 })
  ]);
  await blockText(page, 0).click();

  await page.keyboard.press('Control+Enter');
  await expect(sheetBlocks(page).nth(1).getByTestId('media-play')).toHaveAttribute('aria-label', 'Pausar áudio');
  await expect(sheetBlocks(page).nth(2).getByTestId('media-play')).toHaveAttribute('aria-label', 'Tocar áudio');
  await expect(blockText(page, 0)).toHaveText('Roteiro');

  // Playing another one pauses the first: one media at a time.
  await sheetBlocks(page).nth(2).getByTestId('media-play').click();
  await expect(sheetBlocks(page).nth(2).getByTestId('media-play')).toHaveAttribute('aria-label', 'Pausar áudio');
  await expect.poll(() => mediaElementPaused(page, 1)).toBe(true);
});

test('AC-pauta-revelavel-33 — a dropped video starts still and plays inside the block by its button', async ({ page, request }) => {
  const id = await createRundown(page, 'Tocar vídeo');
  await seedSheet(page, request, id, [textDraft('a', 'Antes', shown)]);
  // A real WebM, recorded in the browser from a canvas.
  const base64 = await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 90;
    const context = canvas.getContext('2d') as CanvasRenderingContext2D;
    const recorder = new MediaRecorder(canvas.captureStream(25), { mimeType: 'video/webm' });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => chunks.push(event.data);
    const stopped = new Promise((resolve) => (recorder.onstop = resolve));
    recorder.start();
    const started = performance.now();
    await new Promise<void>((resolve) => {
      const frame = () => {
        const elapsed = performance.now() - started;
        context.fillStyle = `hsl(${(elapsed / 10) % 360} 70% 50%)`;
        context.fillRect(0, 0, 160, 90);
        if (elapsed < 4000) requestAnimationFrame(frame);
        else resolve();
      };
      frame();
    });
    recorder.stop();
    await stopped;
    const bytes = new Uint8Array(await new Blob(chunks, { type: 'video/webm' }).arrayBuffer());
    let binary = '';
    bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
    return btoa(binary);
  });

  await dropFiles(page, [{ name: 'demo.webm', type: 'video/webm', base64 }]);
  const videoBlock = sheetBlocks(page).nth(1);
  await expect(videoBlock.getByTestId('media-video')).toContainText('demo.webm');
  const play = videoBlock.getByTestId('media-play');
  await expect(play).toHaveAttribute('aria-label', 'Tocar vídeo');
  expect(await mediaElementPaused(page, 1)).toBe(true);
  await play.click();
  await expect(play).toHaveAttribute('aria-label', 'Pausar vídeo');
  await expect.poll(async () => videoBlock.locator('video').evaluate((video) => (video as HTMLVideoElement).currentTime > 0)).toBe(true);
  await play.click();
  await expect(play).toHaveAttribute('aria-label', 'Tocar vídeo');
  expect(await mediaElementPaused(page, 1)).toBe(true);
  await waitSaved(page);
  await expect.poll(() => outline(request, id)).toEqual(['0:Antes', '0:video']);
});

test('AC-pauta-revelavel-34 — a file gone from the media folder shows "Arquivo não encontrado" with the preparation off, and "Procurar o arquivo" recreates the block in place', async ({
  page,
  request
}) => {
  const id = await createRundown(page, 'Arquivo ausente');
  const image = await uploadThroughApi(request, 'some.png', PNG);
  await seedSheet(page, request, id, [
    textDraft('a', 'Antes', shown),
    mediaDraft('m', 'image', image, { ...shown, mediaName: 'some.png' }),
    textDraft('b', 'Depois', shown)
  ]);
  fs.rmSync(path.join(mediaFolder(), image));
  await page.reload();

  const missing = sheetBlocks(page).nth(1).getByTestId('media-failure');
  await expect(missing).toHaveAttribute('data-reason', 'missing');
  await expect(missing).toContainText('Arquivo não encontrado');
  await expect(missing).toContainText('some.png saiu da pasta de mídia.');
  await expect(missing.getByRole('button', { name: 'Procurar o arquivo' })).toBeVisible();
  await expect(missing.getByRole('button', { name: 'Remover bloco' })).toBeVisible();
  await expect(sheetBlocks(page).nth(1).locator('img')).toHaveCount(0);

  const chooser = page.waitForEvent('filechooser');
  await missing.getByRole('button', { name: 'Procurar o arquivo' }).click();
  await (await chooser).setFiles({ name: 'achado.wav', mimeType: 'audio/wav', buffer: wav() });

  await expect(sheetBlocks(page).nth(1).getByTestId('media-audio')).toContainText('achado.wav');
  await waitSaved(page);
  await expect.poll(() => outline(request, id)).toEqual(['0:Antes', '0:audio', '0:Depois']);
  const sheet = await fetchSheet(request, id);
  expect(sheet.blocks[1]).toMatchObject({ kind: 'audio', mediaName: 'achado.wav', mediaMissing: false, plannedVisible: true });
  expect(fs.existsSync(path.join(mediaFolder(), sheet.blocks[1].mediaPath))).toBe(true);
});
