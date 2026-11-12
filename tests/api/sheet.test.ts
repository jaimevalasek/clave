import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { startTestServer } from '../helpers/testServer';
import type { TestServer } from '../helpers/testServer';
import { PNG_BYTES, mediaDraft, textDraft, uploadMedia } from '../helpers/sheetFixtures';
import type { SheetBlockDraft } from '../helpers/sheetFixtures';
import type { Rundown, SheetPayload, SheetSaveResult } from '../../shared/types';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

async function createRundown(title: string): Promise<Rundown> {
  const { body } = await server.request<{ rundown: Rundown }>('POST', '/api/rundowns', { title });
  return body.rundown;
}

function put(rundownId: string, blocks: unknown) {
  return server.request<SheetSaveResult & { code?: string; fields?: { field: string }[] }>(
    'PUT',
    `/api/rundowns/${rundownId}/sheet`,
    { blocks }
  );
}

async function getSheet(rundownId: string): Promise<SheetPayload> {
  const { status, body } = await server.request<SheetPayload>('GET', `/api/rundowns/${rundownId}/sheet`);
  expect(status).toBe(200);
  return body;
}

describe('AC-pauta-revelavel-09 — the sheet round-trips through the server', () => {
  it('returns content, order, levels, sizes, adjustment, marks, plan and progress as saved', async () => {
    const rundown = await createRundown('Folha de ida e volta');
    const image = await uploadMedia(server, 'print.png', PNG_BYTES);
    const blocks: SheetBlockDraft[] = [
      textDraft('t', '', {
        size: 'title',
        fontPx: 48,
        content: [{ text: 'Título ' }, { text: 'quente', color: 'accent' }],
        plannedVisible: true,
        takeVisible: true
      }),
      textDraft('a', '', {
        depth: 1,
        size: 'small',
        fontPx: 18,
        content: [{ text: 'linha 1\nlinha 2 ' }, { text: 'negrito', bold: true }],
        takeVisible: true,
        revealStep: 1
      }),
      textDraft('b', 'neto', { depth: 2, size: 'small', fontPx: 22, collapsed: true }),
      mediaDraft('m', 'image', image, { mediaName: 'print.png', takeVisible: true, revealStep: 2 })
    ];

    const saved = await put(rundown.id, blocks);
    expect(saved.status).toBe(200);
    expect(Object.keys(saved.body.ids).sort()).toEqual(['a', 'b', 'm', 't']);
    expect(saved.body.savedAt).toEqual(expect.any(String));

    const sheet = await getSheet(rundown.id);
    expect(sheet.blocks.map((block) => block.id)).toEqual(['t', 'a', 'b', 'm'].map((key) => saved.body.ids[key]));
    expect(sheet.blocks.map(({ id: _id, ...rest }) => rest)).toEqual([
      {
        kind: 'text',
        depth: 0,
        content: [{ text: 'Título ' }, { text: 'quente', color: 'accent' }],
        mediaPath: '',
        mediaName: '',
        size: 'title',
        fontPx: 48,
        plannedVisible: true,
        takeVisible: true,
        revealStep: null,
        collapsed: false
      },
      {
        kind: 'text',
        depth: 1,
        content: [{ text: 'linha 1\nlinha 2 ' }, { text: 'negrito', bold: true }],
        mediaPath: '',
        mediaName: '',
        size: 'small',
        fontPx: 18,
        plannedVisible: false,
        takeVisible: true,
        revealStep: 1,
        collapsed: false
      },
      {
        kind: 'text',
        depth: 2,
        content: [{ text: 'neto' }],
        mediaPath: '',
        mediaName: '',
        size: 'small',
        fontPx: 22,
        plannedVisible: false,
        takeVisible: false,
        revealStep: null,
        collapsed: true
      },
      {
        kind: 'image',
        depth: 0,
        content: [],
        mediaPath: image,
        mediaName: 'print.png',
        mediaMissing: false,
        size: 'medium',
        fontPx: 30,
        plannedVisible: false,
        takeVisible: true,
        revealStep: 2,
        collapsed: false
      }
    ]);
  });

  it('deletes the blocks left out of the next save and bumps "editada há…"', async () => {
    const rundown = await createRundown('Folha que encolhe');
    const first = await put(rundown.id, [textDraft('a', 'fica'), textDraft('b', 'sai')]);
    await new Promise((resolve) => setTimeout(resolve, 5));
    await put(rundown.id, [textDraft('a', 'fica', { id: first.body.ids.a })]);

    const sheet = await getSheet(rundown.id);
    expect(sheet.blocks).toHaveLength(1);
    expect(sheet.blocks[0].id).toBe(first.body.ids.a);
    expect(sheet.rundown.updatedAt > rundown.updatedAt).toBe(true);
    expect(sheet.rundown.blockCount).toBe(1);
  });

  it('answers 404 for a rundown that does not exist', async () => {
    expect((await server.request('GET', '/api/rundowns/nao-existe/sheet')).status).toBe(404);
    expect((await put('nao-existe', [])).status).toBe(404);
  });
});

describe('identity — every new block id comes from the server', () => {
  it('ignores a client draft id and keeps ids stable across saves', async () => {
    const rundown = await createRundown('Folha com ids');
    const first = await put(rundown.id, [textDraft('k1', 'um', { id: 'rascunho-1' })]);
    expect(first.status).toBe(200);
    expect(first.body.ids.k1).not.toBe('rascunho-1');

    // A second save that creates more blocks with the same draft id never collides.
    const second = await put(rundown.id, [
      textDraft('k1', 'um', { id: first.body.ids.k1 }),
      textDraft('k2', 'dois', { id: 'rascunho-1' }),
      textDraft('k3', 'três')
    ]);
    expect(second.status).toBe(200);
    expect(second.body.ids.k1).toBe(first.body.ids.k1);
    expect(new Set(Object.values(second.body.ids)).size).toBe(3);

    // Another rundown creating blocks with the same keys and draft ids is independent.
    const other = await createRundown('Outra folha');
    const third = await put(other.id, [textDraft('k1', 'um', { id: 'rascunho-1' })]);
    expect(third.status).toBe(200);
    expect((await getSheet(rundown.id)).blocks).toHaveLength(3);
  });

  it('never adopts the id of a block that belongs to another rundown', async () => {
    const owner = await createRundown('Dona do bloco');
    const intruder = await createRundown('Intrusa');
    const saved = await put(owner.id, [textDraft('a', 'original')]);
    const foreignId = saved.body.ids.a;

    const attempt = await put(intruder.id, [textDraft('x', 'sequestro', { id: foreignId })]);
    expect(attempt.status).toBe(200);
    expect(attempt.body.ids.x).not.toBe(foreignId);

    const ownerSheet = await getSheet(owner.id);
    expect(ownerSheet.blocks[0].content).toEqual([{ text: 'original' }]);
  });
});

describe('AC-pauta-revelavel-39 — only bold, the six colors and line breaks are stored', () => {
  it('drops unknown marks, colors outside the list and pasted HTML properties', async () => {
    const rundown = await createRundown('Folha com marcas estranhas');
    const saved = await put(rundown.id, [
      textDraft('a', '', {
        content: [
          { text: 'sem ', italic: true, html: '<i>x</i>' },
          { text: 'cor', color: '#ff0000' },
          { text: ' boa', color: 'green', underline: true },
          { text: '\r\nfim', bold: true, font: 'Comic Sans' },
          'lixo',
          { text: 42 }
        ]
      })
    ]);
    expect(saved.status).toBe(200);
    const sheet = await getSheet(rundown.id);
    expect(sheet.blocks[0].content).toEqual([
      { text: 'sem cor' },
      { text: ' boa', color: 'green' },
      { text: '\nfim', bold: true }
    ]);
  });
});

describe('AC-pauta-revelavel-42 — the server refuses a tree that a move or a delete would break (RULE-pauta-revelavel-04)', () => {
  it('rejects a sub-item moved above its topic without normalizing, and keeps the saved order', async () => {
    const rundown = await createRundown('Árvore movida');
    const first = await put(rundown.id, [
      textDraft('a', 'Tópico'),
      textDraft('b', 'Ponto', { depth: 1, size: 'small', fontPx: 22 })
    ]);
    expect(first.status).toBe(200);
    const ids = first.body.ids;

    const moved = await put(rundown.id, [
      textDraft('b', 'Ponto', { id: ids.b, depth: 1, size: 'small', fontPx: 22 }),
      textDraft('a', 'Tópico', { id: ids.a })
    ]);
    expect(moved.status).toBe(422);
    expect(moved.body.code).toBe('validation_failed');

    const deleted = await put(rundown.id, [textDraft('b', 'Ponto', { id: ids.b, depth: 1, size: 'small', fontPx: 22 })]);
    expect(deleted.status).toBe(422);

    const sheet = await getSheet(rundown.id);
    expect(sheet.blocks.map((block) => [block.depth, block.content])).toEqual([
      [0, [{ text: 'Tópico' }]],
      [1, [{ text: 'Ponto' }]]
    ]);
  });

  it('accepts the same move once the levels are normalized', async () => {
    const rundown = await createRundown('Árvore normalizada');
    const first = await put(rundown.id, [
      textDraft('a', 'Tópico'),
      textDraft('b', 'Ponto', { depth: 1, size: 'small', fontPx: 22 })
    ]);
    const ids = first.body.ids;
    const moved = await put(rundown.id, [
      textDraft('b', 'Ponto', { id: ids.b, depth: 0, size: 'small', fontPx: 22 }),
      textDraft('a', 'Tópico', { id: ids.a })
    ]);
    expect(moved.status).toBe(200);
    const sheet = await getSheet(rundown.id);
    expect(sheet.blocks.map((block) => [block.id, block.depth])).toEqual([
      [ids.b, 0],
      [ids.a, 0]
    ]);
  });
});

describe('SEC-SBD-01 — invalid sheets are rejected with 422 before any write', () => {
  const cases: [string, () => unknown][] = [
    ['an unknown kind', () => [textDraft('a', 'x', { kind: 'pdf' as never })]],
    ['a first block below level 0 (RULE-pauta-revelavel-04)', () => [textDraft('a', 'x', { depth: 1 })]],
    ['a jump of two levels', () => [textDraft('a', 'x'), textDraft('b', 'y', { depth: 2 })]],
    ['a fourth level', () => [textDraft('a', 'x'), textDraft('b', 'y', { depth: 1 }), textDraft('c', 'z', { depth: 2 }), textDraft('d', 'w', { depth: 3 })]],
    ['a font size outside the range (RULE-pauta-revelavel-05)', () => [textDraft('a', 'x', { size: 'title', fontPx: 76 })]],
    ['a font size off the 4 px step', () => [textDraft('a', 'x', { size: 'medium', fontPx: 31 })]],
    ['more than 1000 blocks', () => Array.from({ length: 1001 }, (_, index) => textDraft(`k${index}`, 'x'))],
    ['more than 10000 characters in a block', () => [textDraft('a', 'x'.repeat(10_001))]],
    ['a media name over 255 characters', () => [mediaDraft('a', 'image', 'x.png', { mediaName: 'n'.repeat(256) })]],
    ['a media path climbing out with ../', () => [mediaDraft('a', 'image', '../segredo.png')]],
    ['a media path that is a web URL', () => [mediaDraft('a', 'image', 'https://exemplo.com/a.png')]],
    ['an absolute media path', () => [mediaDraft('a', 'image', 'C:/Windows/a.png')]],
    ['a media path of another kind', () => [mediaDraft('a', 'image', 'som.mp3')]],
    ['repeated keys', () => [textDraft('a', 'x'), textDraft('a', 'y')]],
    ['a body without the block list', () => undefined]
  ];

  for (const [name, build] of cases) {
    it(`rejects ${name}`, async () => {
      const rundown = await createRundown(`Folha recusada: ${name}`);
      await put(rundown.id, [textDraft('keep', 'antes')]);
      const { status, body } = await put(rundown.id, build());
      expect(status).toBe(422);
      expect(body.code).toBe('validation_failed');
      const sheet = await getSheet(rundown.id);
      expect(sheet.blocks.map((block) => block.content)).toEqual([[{ text: 'antes' }]]);
    });
  }
});

describe('AC-pauta-revelavel-34 — a media block whose file left the media folder is marked missing', () => {
  it('marks only the block whose file is gone, keeps it in place and lets a new file take its place', async () => {
    const rundown = await createRundown('Mídia ausente');
    const kept = await uploadMedia(server, 'fica.png', PNG_BYTES);
    const gone = await uploadMedia(server, 'sai.png', PNG_BYTES);
    const first = await put(rundown.id, [
      textDraft('t', 'antes'),
      mediaDraft('kept', 'image', kept, { mediaName: 'fica.png' }),
      mediaDraft('gone', 'image', gone, { mediaName: 'sai.png', depth: 1 })
    ]);
    expect(first.status).toBe(200);
    fs.rmSync(path.join(process.env.AIOSON_APP_DIR as string, 'data', 'media', gone));

    const sheet = await getSheet(rundown.id);
    expect(sheet.blocks.map((block) => [block.kind, block.mediaName, block.depth, block.mediaMissing])).toEqual([
      ['text', '', 0, undefined],
      ['image', 'fica.png', 0, false],
      ['image', 'sai.png', 1, true]
    ]);

    // "Procurar o arquivo": the same block, in the same place, now points at the new file.
    const chosen = await uploadMedia(server, 'achado.png', PNG_BYTES);
    const replaced = await put(rundown.id, [
      textDraft('t', 'antes', { id: first.body.ids.t }),
      mediaDraft('kept', 'image', kept, { id: first.body.ids.kept, mediaName: 'fica.png' }),
      mediaDraft('gone', 'image', chosen, { id: first.body.ids.gone, mediaName: 'achado.png', depth: 1 })
    ]);
    expect(replaced.status).toBe(200);
    expect(replaced.body.blocks[2]).toMatchObject({ id: first.body.ids.gone, mediaPath: chosen, mediaMissing: false });
  });
});
