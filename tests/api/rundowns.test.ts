import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { startTestServer } from '../helpers/testServer';
import type { TestServer } from '../helpers/testServer';
import { PNG_BYTES, mediaDraft, textDraft, uploadMedia } from '../helpers/sheetFixtures';
import type { SheetBlockDraft } from '../helpers/sheetFixtures';
import type { Rundown, RundownSummary, SheetPayload, SheetSaveResult } from '../../shared/types';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

async function createRundown(title: string, extra: Record<string, unknown> = {}): Promise<Rundown> {
  const { status, body } = await server.request<{ rundown: Rundown }>('POST', '/api/rundowns', {
    title,
    ...extra
  });
  expect(status).toBe(201);
  return body.rundown;
}

async function listRundowns(): Promise<RundownSummary[]> {
  const { body } = await server.request<{ rundowns: RundownSummary[] }>('GET', '/api/rundowns');
  return body.rundowns;
}

async function saveSheet(rundownId: string, blocks: SheetBlockDraft[]): Promise<SheetSaveResult> {
  const { status, body } = await server.request<SheetSaveResult>('PUT', `/api/rundowns/${rundownId}/sheet`, {
    blocks
  });
  expect(status).toBe(200);
  return body;
}

function mediaFile(relative: string): string {
  return path.join(process.env.AIOSON_APP_DIR as string, 'data', 'media', relative);
}

describe('AC-pauta-revelavel-02 — the rundown name is required by the server', () => {
  it('rejects an empty name with the inline message and creates nothing', async () => {
    const before = await listRundowns();
    const { status, body } = await server.request<{ code: string; fields: { field: string; message: string }[] }>(
      'POST',
      '/api/rundowns',
      { title: '   ' }
    );

    expect(status).toBe(422);
    expect(body.code).toBe('validation_failed');
    expect(body.fields[0]).toEqual({
      field: 'title',
      message: 'Dê um nome à pauta, por exemplo "Episódio 12: filas".'
    });
    expect(await listRundowns()).toHaveLength(before.length);
  });

  it('rejects a name over 120 characters', async () => {
    const { status } = await server.request('POST', '/api/rundowns', { title: 'a'.repeat(121) });
    expect(status).toBe(422);
  });

  it('creates a rundown from the name alone, with an empty sheet', async () => {
    const created = await createRundown('Episódio 12: filas');
    const { status, body } = await server.request<SheetPayload>('GET', `/api/rundowns/${created.id}/sheet`);
    expect(status).toBe(200);
    expect(body.rundown.title).toBe('Episódio 12: filas');
    expect(body.blocks).toEqual([]);
  });
});

describe('AC-pauta-revelavel-03 — renaming changes only the chosen rundown and keeps the rest', () => {
  it('renames the target, keeps the neighbour and keeps the pin', async () => {
    const target = await createRundown('Pauta a renomear', { pinned: true });
    const neighbour = await createRundown('Pauta vizinha');

    const { status, body } = await server.request<{ rundown: RundownSummary }>(
      'PATCH',
      `/api/rundowns/${target.id}`,
      { title: 'Nome novo' }
    );
    expect(status).toBe(200);
    expect(body.rundown.title).toBe('Nome novo');
    expect(body.rundown.pinned).toBe(true);

    const rows = await listRundowns();
    expect(rows.find((row) => row.id === target.id)?.title).toBe('Nome novo');
    expect(rows.find((row) => row.id === neighbour.id)?.title).toBe('Pauta vizinha');
  });

  it('refuses an empty rename', async () => {
    const target = await createRundown('Pauta que segue com nome');
    const { status } = await server.request('PATCH', `/api/rundowns/${target.id}`, { title: '' });
    expect(status).toBe(422);
  });
});

describe('AC-pauta-revelavel-04 — duplicating copies the whole sheet with the take reset', () => {
  it('copies content, level, size, fine adjustment, marks, plan and media, and resets the take', async () => {
    const source = await createRundown('Roteiro original');
    const image = await uploadMedia(server, 'grafico.png', PNG_BYTES);
    await saveSheet(source.id, [
      textDraft('a', 'Abertura', {
        size: 'title',
        fontPx: 56,
        plannedVisible: true,
        takeVisible: true,
        revealStep: null
      }),
      textDraft('b', '', {
        depth: 1,
        size: 'small',
        fontPx: 26,
        content: [{ text: 'trecho ' }, { text: 'forte', bold: true, color: 'red' }],
        takeVisible: true,
        revealStep: 1
      }),
      mediaDraft('c', 'image', image, { depth: 1, mediaName: 'grafico.png', takeVisible: true, revealStep: 2 })
    ]);

    const { status, body } = await server.request<{ rundown: Rundown }>(
      'POST',
      `/api/rundowns/${source.id}/duplicate`
    );
    expect(status).toBe(201);
    expect(body.rundown.title).toBe('Roteiro original (cópia)');

    const original = await server.request<SheetPayload>('GET', `/api/rundowns/${source.id}/sheet`);
    const copy = await server.request<SheetPayload>('GET', `/api/rundowns/${body.rundown.id}/sheet`);

    expect(copy.body.blocks).toHaveLength(3);
    const strip = (blocks: SheetPayload['blocks']) =>
      blocks.map(({ kind, depth, content, mediaPath, mediaName, size, fontPx, plannedVisible, collapsed }) => ({
        kind,
        depth,
        content,
        mediaPath,
        mediaName,
        size,
        fontPx,
        plannedVisible,
        collapsed
      }));
    expect(strip(copy.body.blocks)).toEqual(strip(original.body.blocks));

    // Own ids: editing the copy never reaches the source.
    const sourceIds = new Set(original.body.blocks.map((block) => block.id));
    expect(copy.body.blocks.every((block) => !sourceIds.has(block.id))).toBe(true);

    // The take starts from the plan.
    expect(copy.body.blocks.map((block) => block.takeVisible)).toEqual([true, false, false]);
    expect(copy.body.blocks.every((block) => block.revealStep === null)).toBe(true);
    // The source keeps its own progress.
    expect(original.body.blocks.map((block) => block.takeVisible)).toEqual([true, true, true]);
  });

  it('lists the copy right below its source, unpinned and without the legacy seal', async () => {
    const source = await createRundown('Pauta de origem');
    await server.request('POST', `/api/rundowns/${source.id}/open`);
    const { body } = await server.request<{ rundown: Rundown }>('POST', `/api/rundowns/${source.id}/duplicate`);

    const rows = (await listRundowns()).filter((row) => !row.pinned);
    const sourceIndex = rows.findIndex((row) => row.id === source.id);
    expect(rows[sourceIndex + 1]?.id).toBe(body.rundown.id);
    expect(rows[sourceIndex + 1]?.legacyImported).toBe(false);
  });
});

describe('AC-pauta-revelavel-05 — deleting a rundown removes it and the media only it used', () => {
  it('removes exclusive media and keeps media a copy still uses', async () => {
    const source = await createRundown('Pauta com mídia');
    const shared = await uploadMedia(server, 'compartilhada.png', PNG_BYTES);
    const exclusive = await uploadMedia(server, 'exclusiva.png', PNG_BYTES);
    await saveSheet(source.id, [mediaDraft('s', 'image', shared)]);
    const { body } = await server.request<{ rundown: Rundown }>('POST', `/api/rundowns/${source.id}/duplicate`);
    const copyId = body.rundown.id;
    await saveSheet(source.id, [mediaDraft('s', 'image', shared), mediaDraft('e', 'image', exclusive)]);

    const removed = await server.request('DELETE', `/api/rundowns/${source.id}`);
    expect(removed.status).toBe(204);
    expect((await listRundowns()).some((row) => row.id === source.id)).toBe(false);
    expect(fs.existsSync(mediaFile(exclusive))).toBe(false);
    expect(fs.existsSync(mediaFile(shared))).toBe(true);

    await server.request('DELETE', `/api/rundowns/${copyId}`);
    expect(fs.existsSync(mediaFile(shared))).toBe(false);
  });

  it('answers a typed 404 for a rundown that does not exist', async () => {
    const { status, body } = await server.request<{ code: string }>('DELETE', '/api/rundowns/nao-existe');
    expect(status).toBe(404);
    expect(body.code).toBe('not_found');
  });
});

describe('AC-pauta-revelavel-06 — each list row carries counts, seal and pin', () => {
  it('counts blocks and the ones that start on screen', async () => {
    const rundown = await createRundown('Pauta contada');
    await saveSheet(rundown.id, [
      textDraft('a', 'um', { plannedVisible: true }),
      textDraft('b', 'dois'),
      textDraft('c', 'três', { plannedVisible: true })
    ]);
    const row = (await listRundowns()).find((entry) => entry.id === rundown.id);
    expect(row?.blockCount).toBe(3);
    expect(row?.initiallyVisibleCount).toBe(2);
    expect(row?.legacyImported).toBe(false);
    expect(row?.updatedAt).toEqual(expect.any(String));
  });

  it('lists pinned rundowns first and toggles the pin', async () => {
    const pinned = await createRundown('Pauta fixada');
    await server.request('POST', `/api/rundowns/${pinned.id}/toggle-pin`);
    const later = await createRundown('Pauta aberta depois');
    await server.request('POST', `/api/rundowns/${later.id}/open`);

    const rows = await listRundowns();
    const firstUnpinned = rows.findIndex((row) => !row.pinned);
    expect(rows.findIndex((row) => row.id === pinned.id)).toBeLessThan(firstUnpinned);

    const { body } = await server.request<{ rundown: RundownSummary }>(
      'POST',
      `/api/rundowns/${pinned.id}/toggle-pin`
    );
    expect(body.rundown.pinned).toBe(false);
  });
});

describe('AC-pauta-revelavel-01 — opening marks the rundown the app reopens', () => {
  it('opening a rundown gives it the most recent opening time', async () => {
    const first = await createRundown('Primeira');
    const second = await createRundown('Segunda');
    await new Promise((resolve) => setTimeout(resolve, 5));
    await server.request('POST', `/api/rundowns/${first.id}/open`);

    const rows = await listRundowns();
    const latest = [...rows].sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt))[0];
    expect(latest.id).toBe(first.id);
    expect(rows.some((row) => row.id === second.id)).toBe(true);
  });

  it('opening a rundown that does not exist answers 404', async () => {
    const { status } = await server.request('POST', '/api/rundowns/nao-existe/open');
    expect(status).toBe(404);
  });
});
