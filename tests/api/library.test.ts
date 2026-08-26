import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startTestServer } from '../helpers/testServer';
import type { TestServer } from '../helpers/testServer';
import type { Block, BlockType, LibraryItem, Run, Rundown } from '../../shared/types';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

async function newRundown(title: string): Promise<string> {
  const { body } = await server.request<{ rundown: Rundown }>('POST', '/api/rundowns', {
    title,
    date: '2026-08-18'
  });
  return body.rundown.id;
}

async function addBlock(
  rundownId: string,
  title: string,
  type: BlockType = 'topic',
  attachments: unknown[] = []
): Promise<string> {
  const { body } = await server.request<{ blockId: string }>('POST', '/api/blocks', {
    rundownId,
    type,
    title,
    durationMinutes: 10,
    attachments
  });
  return body.blockId;
}

async function promote(blockId: string): Promise<LibraryItem> {
  const { status, body } = await server.request<{ item: LibraryItem }>('POST', '/api/library', {
    blockId
  });
  expect(status).toBe(201);
  return body.item;
}

describe('AC-clave-31 — guardar no acervo cria o item com título, tipo e anexos', () => {
  it('promove o bloco copiando os anexos e começa com zero no ar', async () => {
    const rundownId = await newRundown('Pauta que alimenta o acervo');
    const blockId = await addBlock(rundownId, 'Leitura de código do chat', 'interaction', [
      { type: 'chat', label: 'Pedido pronto', content: 'Manda um trecho de até 20 linhas' }
    ]);

    const item = await promote(blockId);
    expect(item).toMatchObject({
      title: 'Leitura de código do chat',
      type: 'interaction',
      airCount: 0,
      lastAiredOn: null
    });
    expect(item.attachments).toHaveLength(1);
    expect(item.attachments[0]).toMatchObject({ type: 'chat', label: 'Pedido pronto' });
    // O anexo do item é uma cópia: id próprio, não o do bloco.
    const board = await server.request<{ blocks: Block[] }>('GET', `/api/rundowns/${rundownId}`);
    const blockAttachment = board.body.blocks[0].attachments[0];
    expect(item.attachments[0].id).not.toBe(blockAttachment.id);
  });

  it('a grade lista os itens guardados', async () => {
    const { body } = await server.request<{ items: LibraryItem[] }>('GET', '/api/library');
    expect(body.items.length).toBeGreaterThan(0);
    expect(body.items[0]).toHaveProperty('airCount');
    expect(body.items[0]).toHaveProperty('lastAiredOn');
  });

  it('promover bloco inexistente devolve erro tipado', async () => {
    const { status, body } = await server.request<{ code: string }>('POST', '/api/library', {
      blockId: 'nao-existe'
    });
    expect(status).toBe(404);
    expect(body.code).toBe('not_found');
  });
});

describe('AC-clave-32 — a cópia é independente do item', () => {
  it('traz o bloco com origem registrada e editar a cópia não muda o item', async () => {
    const sourceRundown = await newRundown('Pauta de origem');
    const blockId = await addBlock(sourceRundown, 'Bloco reciclável', 'topic', [
      { type: 'link', label: 'Referência', path: 'https://exemplo.test' }
    ]);
    const item = await promote(blockId);

    const target = await newRundown('Pauta que recebe a cópia');
    const { status, body } = await server.request<{ blocks: Block[] }>(
      'POST',
      `/api/library/${item.id}/copy-to/${target}`
    );
    expect(status).toBe(201);
    expect(body.blocks).toHaveLength(1);

    const copy = body.blocks[0];
    expect(copy).toMatchObject({ title: 'Bloco reciclável', type: 'topic', libraryItemId: item.id });
    expect(copy.id).not.toBe(blockId);
    expect(copy.attachments).toHaveLength(1);

    await server.request('PATCH', `/api/blocks/${copy.id}`, {
      type: 'guest',
      title: 'Cópia editada só aqui',
      durationMinutes: 2
    });

    const reread = await server.request<{ items: LibraryItem[] }>('GET', '/api/library');
    const untouched = reread.body.items.find((entry) => entry.id === item.id);
    expect(untouched).toMatchObject({ title: 'Bloco reciclável', type: 'topic' });
  });

  it('item de resgate vira cópia fora do trilho', async () => {
    const rundownId = await newRundown('Pauta do resgate reciclado');
    const blockId = await addBlock(rundownId, 'Carta guardada', 'rescue');
    const item = await promote(blockId);

    const target = await newRundown('Pauta que recebe o resgate');
    const { body } = await server.request<{ blocks: Block[] }>(
      'POST',
      `/api/library/${item.id}/copy-to/${target}`
    );
    expect(body.blocks[0]).toMatchObject({ type: 'rescue', position: null });
  });

  it('copiar para pauta inexistente devolve erro tipado', async () => {
    const rundownId = await newRundown('Pauta qualquer');
    const item = await promote(await addBlock(rundownId, 'Bloco qualquer'));
    const { status } = await server.request('POST', `/api/library/${item.id}/copy-to/nao-existe`);
    expect(status).toBe(404);
  });
});

describe('AC-clave-33 — renomear e editar anexos; o tipo é imutável', () => {
  it('renomeia sem tocar no tipo', async () => {
    const rundownId = await newRundown('Pauta do renomear no acervo');
    const item = await promote(await addBlock(rundownId, 'Nome antigo', 'media'));

    const { status, body } = await server.request<{ item: LibraryItem }>(
      'PATCH',
      `/api/library/${item.id}`,
      { title: 'Nome novo', type: 'guest' }
    );
    expect(status).toBe(200);
    expect(body.item.title).toBe('Nome novo');
    // O tipo enviado na carga é ignorado: ele não muda depois da promoção.
    expect(body.item.type).toBe('media');
  });

  it('rejeita título vazio no domínio', async () => {
    const rundownId = await newRundown('Pauta do título vazio');
    const item = await promote(await addBlock(rundownId, 'Tem título'));

    const { status, body } = await server.request<{ fields: { field: string }[] }>(
      'PATCH',
      `/api/library/${item.id}`,
      { title: '   ' }
    );
    expect(status).toBe(422);
    expect(body.fields[0].field).toBe('title');
  });

  it('reescreve os anexos do item', async () => {
    const rundownId = await newRundown('Pauta dos anexos do acervo');
    const item = await promote(
      await addBlock(rundownId, 'Item com anexo', 'media', [
        { type: 'video', label: 'Clipe', path: 'clipe.mp4' }
      ])
    );

    const { status, body } = await server.request<{ item: LibraryItem }>(
      'PUT',
      `/api/library/${item.id}/attachments`,
      {
        attachments: [
          { id: item.attachments[0].id, type: 'video', label: 'Clipe renomeado', path: 'clipe.mp4' },
          { type: 'link', label: 'Novo link', path: 'https://exemplo.test' }
        ]
      }
    );
    expect(status).toBe(200);
    expect(body.item.attachments).toHaveLength(2);
    expect(body.item.attachments[0]).toMatchObject({
      id: item.attachments[0].id,
      label: 'Clipe renomeado'
    });
  });

  it('remover o item não apaga os blocos já copiados', async () => {
    const rundownId = await newRundown('Pauta que fica depois da remoção');
    const item = await promote(await addBlock(rundownId, 'Item que será removido'));
    const target = await newRundown('Pauta com a cópia');
    await server.request('POST', `/api/library/${item.id}/copy-to/${target}`);

    const removed = await server.request('DELETE', `/api/library/${item.id}`);
    expect(removed.status).toBe(204);

    const board = await server.request<{ blocks: Block[] }>('GET', `/api/rundowns/${target}`);
    expect(board.body.blocks).toHaveLength(1);
    expect(board.body.blocks[0].title).toBe('Item que será removido');
    // A origem some junto com o item, sem quebrar o bloco.
    expect(board.body.blocks[0].libraryItemId).toBeNull();
  });
});

describe('AC-clave-34 — contadores sobem quando o bloco do acervo vai ao ar', () => {
  it('vezes no ar e última vez sobem no fechamento da execução', async () => {
    const sourceRundown = await newRundown('Pauta que gera o item');
    const item = await promote(await addBlock(sourceRundown, 'Bloco que vai ao ar'));

    const target = await newRundown('Pauta que entra no ar');
    await server.request('POST', `/api/library/${item.id}/copy-to/${target}`);

    const { body } = await server.request<{ run: Run }>('POST', '/api/runs', { rundownId: target });

    // Antes de encerrar, os contadores continuam zerados.
    let listed = await server.request<{ items: LibraryItem[] }>('GET', '/api/library');
    expect(listed.body.items.find((entry) => entry.id === item.id)?.airCount).toBe(0);

    await server.request('POST', `/api/runs/${body.run.id}/finish`, {});

    listed = await server.request<{ items: LibraryItem[] }>('GET', '/api/library');
    const updated = listed.body.items.find((entry) => entry.id === item.id);
    expect(updated?.airCount).toBe(1);
    expect(updated?.lastAiredOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('o mesmo item tocado duas vezes na mesma live conta uma vez só', async () => {
    const sourceRundown = await newRundown('Pauta do item repetido');
    const item = await promote(await addBlock(sourceRundown, 'Bloco tocado duas vezes'));

    const target = await newRundown('Pauta com o item duas vezes');
    const first = await server.request<{ blocks: Block[] }>(
      'POST',
      `/api/library/${item.id}/copy-to/${target}`
    );
    await server.request('POST', `/api/library/${item.id}/copy-to/${target}`);

    const { body } = await server.request<{ run: Run }>('POST', '/api/runs', { rundownId: target });
    await server.request('POST', `/api/runs/${body.run.id}/steps`, {
      blockId: first.body.blocks[0].id
    });
    await server.request('POST', `/api/runs/${body.run.id}/finish`, {});

    const listed = await server.request<{ items: LibraryItem[] }>('GET', '/api/library');
    expect(listed.body.items.find((entry) => entry.id === item.id)?.airCount).toBe(1);
  });

  it('bloco sem origem no acervo não sobe contador de ninguém', async () => {
    const before = await server.request<{ items: LibraryItem[] }>('GET', '/api/library');
    const target = await newRundown('Pauta sem item do acervo');
    await addBlock(target, 'Bloco original');
    const { body } = await server.request<{ run: Run }>('POST', '/api/runs', { rundownId: target });
    await server.request('POST', `/api/runs/${body.run.id}/finish`, {});

    const after = await server.request<{ items: LibraryItem[] }>('GET', '/api/library');
    const sum = (items: LibraryItem[]) => items.reduce((total, item) => total + item.airCount, 0);
    expect(sum(after.body.items)).toBe(sum(before.body.items));
  });
});

describe('AC-clave-54 — o acervo guarda o bloco inteiro, pontos incluídos', () => {
  it('promover copia os pontos, e trazer de volta os devolve desmarcados', async () => {
    const rundownId = await newRundown('Pauta que guarda pontos no acervo');
    const { body: created } = await server.request<{ blockId: string; blocks: Block[] }>(
      'POST',
      '/api/blocks',
      {
        rundownId,
        type: 'interaction',
        title: 'Bloco reaproveitável',
        durationMinutes: 10,
        beats: [{ text: 'abre a enquete' }, { text: 'lê os resultados', imagePath: 'grafico.png' }]
      }
    );
    const beats = created.blocks.find((entry) => entry.id === created.blockId)?.beats ?? [];
    await server.request('PATCH', `/api/beats/${beats[0].id}`, { done: true });

    const item = await promote(created.blockId);
    expect(item.beats.map((beat) => beat.text)).toEqual(['abre a enquete', 'lê os resultados']);
    expect(item.beats[1].imagePath).toBe('grafico.png');
    // A cópia é uma live que ainda não aconteceu: nada nasce falado.
    expect(item.beats.map((beat) => beat.done)).toEqual([false, false]);

    const other = await newRundown('Pauta que recebe do acervo');
    const copied = await server.request<{ blocks: Block[] }>(
      'POST',
      `/api/library/${item.id}/copy-to/${other}`
    );
    const copiedBeats = copied.body.blocks[0].beats;
    expect(copiedBeats.map((beat) => beat.text)).toEqual(['abre a enquete', 'lê os resultados']);
    expect(copiedBeats.map((beat) => beat.done)).toEqual([false, false]);
    // Ids próprios: editar a cópia nunca alcança o item do acervo.
    expect(copiedBeats.map((beat) => beat.id)).not.toContain(item.beats[0].id);
  });
});
