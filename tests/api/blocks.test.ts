import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startTestServer } from '../helpers/testServer';
import type { TestServer } from '../helpers/testServer';
import type { Block, BlockType, Rundown } from '../../shared/types';

let server: TestServer;

interface RundownPayload {
  blocks: Block[];
}

interface BlockWritePayload extends RundownPayload {
  blockId: string;
}

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
  extra: Record<string, unknown> = {}
): Promise<BlockWritePayload> {
  const { status, body } = await server.request<BlockWritePayload>('POST', '/api/blocks', {
    rundownId,
    type,
    title,
    durationMinutes: 10,
    ...extra
  });
  expect(status).toBe(201);
  return body;
}

const trackOf = (payload: RundownPayload) =>
  payload.blocks.filter((block) => block.type !== 'rescue').sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

describe('AC-clave-08 — os limites do bloco valem no domínio, não só no formulário', () => {
  it('rejeita título vazio, duração fora de 1–600, etiqueta inválida e ponto sem texto', async () => {
    const rundownId = await newRundown('Pauta da validação');
    const base = { rundownId, type: 'topic', title: 'Válido', durationMinutes: 10 };

    const cases: [Record<string, unknown>, string][] = [
      [{ title: '   ' }, 'title'],
      [{ title: 'a'.repeat(141) }, 'title'],
      [{ durationMinutes: 0 }, 'durationMinutes'],
      [{ durationMinutes: 601 }, 'durationMinutes'],
      [{ durationMinutes: 12.5 }, 'durationMinutes'],
      [{ type: 'slide' }, 'type'],
      [{ beats: [{ text: '   ' }] }, 'beats.0.text'],
      [{ beats: [{ text: 'a'.repeat(201) }] }, 'beats.0.text'],
      [{ beats: Array.from({ length: 31 }, () => ({ text: 'ponto' })) }, 'beats'],
      // Nível fora da escada, sub-ponto sem pai e salto de mais de um nível.
      [{ beats: [{ text: 'ponto', depth: 3 }] }, 'beats.0.depth'],
      [{ beats: [{ text: 'ponto', depth: 1.5 }] }, 'beats.0.depth'],
      [{ beats: [{ text: 'ponto', depth: 1 }] }, 'beats.0.depth'],
      [
        { beats: [{ text: 'pai', depth: 0 }, { text: 'neto órfão', depth: 2 }] },
        'beats.1.depth'
      ]
    ];

    for (const [override, field] of cases) {
      const { status, body } = await server.request<{ code: string; fields: { field: string }[] }>(
        'POST',
        '/api/blocks',
        { ...base, ...override }
      );
      expect(status, JSON.stringify(override)).toBe(422);
      expect(body.code).toBe('validation_failed');
      expect(body.fields.map((entry) => entry.field)).toContain(field);
    }

    const detail = await server.request<RundownPayload>('GET', `/api/rundowns/${rundownId}`);
    expect(detail.body.blocks).toHaveLength(0);
  });

  it('todo campo aceito na criação continua editável depois', async () => {
    const rundownId = await newRundown('Pauta da paridade');
    const created = await addBlock(rundownId, 'Abertura', 'topic', {
      note: 'nota original',
      durationMinutes: 4,
      beats: [{ text: 'ponto original', imagePath: '' }]
    });

    const edited = await server.request<BlockWritePayload>('PATCH', `/api/blocks/${created.blockId}`, {
      type: 'guest',
      title: 'Abertura editada',
      note: 'nota nova',
      durationMinutes: 22,
      beats: [{ text: 'ponto editado', imagePath: 'foto.png' }]
    });

    const block = edited.body.blocks.find((entry) => entry.id === created.blockId);
    expect(block).toMatchObject({
      type: 'guest',
      title: 'Abertura editada',
      note: 'nota nova',
      durationMinutes: 22
    });
    expect(block?.beats).toHaveLength(1);
    expect(block?.beats[0]).toMatchObject({
      text: 'ponto editado',
      imagePath: 'foto.png',
      done: false,
      position: 0
    });
  });
});

describe('AC-clave-09 — a invariante vale nos dois sentidos da troca de tipo', () => {
  it('virar resgate tira do trilho e recompacta os demais', async () => {
    const rundownId = await newRundown('Pauta da invariante');
    const first = await addBlock(rundownId, 'Primeiro');
    const second = await addBlock(rundownId, 'Segundo');
    const third = await addBlock(rundownId, 'Terceiro');

    const changed = await server.request<BlockWritePayload>('PATCH', `/api/blocks/${second.blockId}`, {
      type: 'rescue',
      title: 'Segundo virou resgate',
      durationMinutes: 10
    });

    const asRescue = changed.body.blocks.find((entry) => entry.id === second.blockId);
    expect(asRescue?.type).toBe('rescue');
    expect(asRescue?.position).toBeNull();
    expect(trackOf(changed.body).map((entry) => entry.id)).toEqual([first.blockId, third.blockId]);
    expect(trackOf(changed.body).map((entry) => entry.position)).toEqual([0, 1]);
  });

  it('sair de resgate coloca o bloco no fim do trilho', async () => {
    const rundownId = await newRundown('Pauta do retorno ao trilho');
    const first = await addBlock(rundownId, 'Primeiro');
    const rescue = await addBlock(rundownId, 'Carta', 'rescue');

    const changed = await server.request<BlockWritePayload>('PATCH', `/api/blocks/${rescue.blockId}`, {
      type: 'media',
      title: 'Carta virou mídia',
      durationMinutes: 10
    });

    expect(trackOf(changed.body).map((entry) => entry.id)).toEqual([first.blockId, rescue.blockId]);
    expect(trackOf(changed.body).map((entry) => entry.position)).toEqual([0, 1]);
  });

  it('o resgate nasce sem posição no trilho', async () => {
    const rundownId = await newRundown('Pauta com deck');
    const rescue = await addBlock(rundownId, 'Carta do deck', 'rescue');
    const block = rescue.blocks.find((entry) => entry.id === rescue.blockId);
    expect(block?.position).toBeNull();
  });
});

describe('AC-clave-10 — reordenar o trilho é idempotente e sobrevive à releitura', () => {
  it('aplicar a mesma carga duas vezes gera o mesmo estado', async () => {
    const rundownId = await newRundown('Pauta do arraste');
    const a = await addBlock(rundownId, 'A');
    const b = await addBlock(rundownId, 'B');
    const c = await addBlock(rundownId, 'C');
    const order = [c.blockId, a.blockId, b.blockId];

    const first = await server.request<RundownPayload>(
      'POST',
      `/api/rundowns/${rundownId}/track/reorder`,
      { blockIds: order }
    );
    expect(trackOf(first.body).map((entry) => entry.id)).toEqual(order);

    const second = await server.request<RundownPayload>(
      'POST',
      `/api/rundowns/${rundownId}/track/reorder`,
      { blockIds: order }
    );
    expect(trackOf(second.body).map((entry) => entry.id)).toEqual(order);
    expect(trackOf(second.body).map((entry) => entry.position)).toEqual([0, 1, 2]);

    const reread = await server.request<RundownPayload>('GET', `/api/rundowns/${rundownId}`);
    expect(trackOf(reread.body).map((entry) => entry.id)).toEqual(order);
  });

  it('reenviar a ordem anterior é o "Desfazer"', async () => {
    const rundownId = await newRundown('Pauta do desfazer');
    const a = await addBlock(rundownId, 'A');
    const b = await addBlock(rundownId, 'B');
    const before = [a.blockId, b.blockId];

    await server.request('POST', `/api/rundowns/${rundownId}/track/reorder`, {
      blockIds: [b.blockId, a.blockId]
    });
    const undone = await server.request<RundownPayload>(
      'POST',
      `/api/rundowns/${rundownId}/track/reorder`,
      { blockIds: before }
    );
    expect(trackOf(undone.body).map((entry) => entry.id)).toEqual(before);
  });

  it('recusa carga sem a lista de ids', async () => {
    const rundownId = await newRundown('Pauta da carga inválida');
    const { status, body } = await server.request<{ code: string }>(
      'POST',
      `/api/rundowns/${rundownId}/track/reorder`,
      {}
    );
    expect(status).toBe(400);
    expect(body.code).toBe('bad_request');
  });
});

describe('AC-clave-11 e AC-clave-12 — excluir recompacta; a identidade do bloco é o id', () => {
  it('excluir um bloco do meio recompacta o trilho', async () => {
    const rundownId = await newRundown('Pauta da exclusão');
    const a = await addBlock(rundownId, 'A');
    const b = await addBlock(rundownId, 'B');
    const c = await addBlock(rundownId, 'C');

    const after = await server.request<RundownPayload>('DELETE', `/api/blocks/${b.blockId}`);
    expect(trackOf(after.body).map((entry) => entry.id)).toEqual([a.blockId, c.blockId]);
    expect(trackOf(after.body).map((entry) => entry.position)).toEqual([0, 1]);
  });

  it('salvar um bloco não altera o vizinho', async () => {
    const rundownId = await newRundown('Pauta dos vizinhos');
    const first = await addBlock(rundownId, 'Primeiro intocado', 'topic', { note: 'nota do primeiro' });
    const second = await addBlock(rundownId, 'Segundo', 'topic', { note: 'nota do segundo' });

    const edited = await server.request<RundownPayload>('PATCH', `/api/blocks/${second.blockId}`, {
      type: 'topic',
      title: 'Segundo editado',
      note: 'nota trocada',
      durationMinutes: 30
    });

    const untouched = edited.body.blocks.find((entry) => entry.id === first.blockId);
    expect(untouched).toMatchObject({
      title: 'Primeiro intocado',
      note: 'nota do primeiro',
      durationMinutes: 10
    });
  });
});

describe('anexos do bloco', () => {
  it('grava, preserva id na reescrita e remove o que saiu da lista', async () => {
    const rundownId = await newRundown('Pauta dos anexos');
    const created = await addBlock(rundownId, 'Bloco com anexo', 'media');

    const first = await server.request<RundownPayload>(
      'PUT',
      `/api/blocks/${created.blockId}/attachments`,
      {
        attachments: [
          { type: 'video', label: 'Screencast', path: 'media/demo.webm', fullscreen: true },
          { type: 'chat', label: 'Pergunta', content: 'Conta aí: qual foi a última live?' }
        ]
      }
    );
    const saved = first.body.blocks.find((entry) => entry.id === created.blockId);
    expect(saved?.attachments).toHaveLength(2);
    expect(saved?.attachments[0]).toMatchObject({
      type: 'video',
      label: 'Screencast',
      path: 'media/demo.webm',
      fullscreen: true
    });
    // Tipo textual copia conteúdo e não guarda caminho.
    expect(saved?.attachments[1]).toMatchObject({ type: 'chat', path: '', fullscreen: false });

    const keptId = saved?.attachments[0].id as string;
    const second = await server.request<RundownPayload>(
      'PUT',
      `/api/blocks/${created.blockId}/attachments`,
      {
        attachments: [
          { id: keptId, type: 'video', label: 'Screencast renomeado', path: 'media/demo.webm', fullscreen: false }
        ]
      }
    );
    const rewritten = second.body.blocks.find((entry) => entry.id === created.blockId);
    expect(rewritten?.attachments).toHaveLength(1);
    expect(rewritten?.attachments[0].id).toBe(keptId);
    expect(rewritten?.attachments[0].label).toBe('Screencast renomeado');
    expect(rewritten?.attachments[0].fullscreen).toBe(false);
  });

  it('o id de anexo novo vem do servidor: rascunhos iguais em blocos diferentes não colidem', async () => {
    const rundownId = await newRundown('Pauta dos rascunhos repetidos');
    const first = await addBlock(rundownId, 'Primeiro com anexo', 'media');
    const second = await addBlock(rundownId, 'Segundo com anexo', 'media');

    // A gaveta manda um id provisório de rascunho; ele nunca vira chave primária.
    const draft = [{ id: 'rascunho-1', type: 'video', label: 'Clipe', path: 'clipe.mp4' }];
    const um = await server.request<RundownPayload>(
      'PUT',
      `/api/blocks/${first.blockId}/attachments`,
      { attachments: draft }
    );
    expect(um.status).toBe(200);
    const dois = await server.request<RundownPayload>(
      'PUT',
      `/api/blocks/${second.blockId}/attachments`,
      { attachments: draft }
    );
    expect(dois.status).toBe(200);

    const blocks = dois.body.blocks;
    const attachmentIds = blocks.flatMap((block) => block.attachments.map((entry) => entry.id));
    expect(attachmentIds).toHaveLength(2);
    expect(new Set(attachmentIds).size).toBe(2);
    expect(attachmentIds).not.toContain('rascunho-1');
  });

  it('bloco e anexos gravam na mesma escrita, sem estado parcial', async () => {
    const rundownId = await newRundown('Pauta da escrita única');
    const created = await server.request<BlockWritePayload>('POST', '/api/blocks', {
      rundownId,
      type: 'media',
      title: 'Bloco com anexo de uma vez',
      durationMinutes: 10,
      attachments: [{ type: 'link', label: 'Canal', path: 'https://exemplo.test' }]
    });
    expect(created.status).toBe(201);
    const saved = created.body.blocks.find((entry) => entry.id === created.body.blockId);
    expect(saved?.attachments).toHaveLength(1);

    // Anexo inválido derruba a escrita inteira: nenhum bloco nasce pela metade.
    const rejected = await server.request<{ code: string }>('POST', '/api/blocks', {
      rundownId,
      type: 'media',
      title: 'Bloco que não deve nascer',
      durationMinutes: 10,
      attachments: [{ type: 'video', label: 'Sem caminho', path: '' }]
    });
    expect(rejected.status).toBe(422);

    const reread = await server.request<RundownPayload>('GET', `/api/rundowns/${rundownId}`);
    expect(reread.body.blocks.map((entry) => entry.title)).toEqual(['Bloco com anexo de uma vez']);
  });

  it('rejeita anexo sem caminho e anexo textual sem conteúdo', async () => {
    const rundownId = await newRundown('Pauta do anexo inválido');
    const created = await addBlock(rundownId, 'Bloco', 'media');

    const semCaminho = await server.request<{ fields: { field: string }[] }>(
      'PUT',
      `/api/blocks/${created.blockId}/attachments`,
      { attachments: [{ type: 'video', label: 'Sem caminho', path: '  ' }] }
    );
    expect(semCaminho.status).toBe(422);
    expect(semCaminho.body.fields[0].field).toBe('attachments.0.path');

    const semConteudo = await server.request<{ fields: { field: string }[] }>(
      'PUT',
      `/api/blocks/${created.blockId}/attachments`,
      { attachments: [{ type: 'code', label: 'Sem texto', content: '' }] }
    );
    expect(semConteudo.status).toBe(422);
    expect(semConteudo.body.fields[0].field).toBe('attachments.0.content');
  });
});

describe('AC-clave-49 — os pontos gravam junto com o bloco e guardam identidade', () => {
  it('a lista inteira reescreve, preservando o id de quem já existia', async () => {
    const rundownId = await newRundown('Pauta dos pontos');
    const created = await addBlock(rundownId, 'Assunto', 'topic', {
      beats: [{ text: 'primeiro' }, { text: 'segundo' }, { text: 'terceiro' }]
    });
    const before = created.blocks.find((entry) => entry.id === created.blockId)?.beats ?? [];
    expect(before.map((beat) => beat.text)).toEqual(['primeiro', 'segundo', 'terceiro']);
    expect(before.map((beat) => beat.position)).toEqual([0, 1, 2]);

    // O Palco marcou o primeiro ponto antes de o criador reordenar a lista.
    await server.request('PATCH', `/api/beats/${before[0].id}`, { done: true });

    const edited = await server.request<BlockWritePayload>(
      'PATCH',
      `/api/blocks/${created.blockId}`,
      {
        type: 'topic',
        title: 'Assunto',
        durationMinutes: 10,
        beats: [
          { id: before[1].id, text: 'segundo', done: false },
          { id: before[0].id, text: 'primeiro renomeado', done: true },
          { text: 'ponto novo' }
        ]
      }
    );

    const after = edited.body.blocks.find((entry) => entry.id === created.blockId)?.beats ?? [];
    expect(after.map((beat) => beat.text)).toEqual([
      'segundo',
      'primeiro renomeado',
      'ponto novo'
    ]);
    expect(after.map((beat) => beat.position)).toEqual([0, 1, 2]);
    // O ponto que ficou manteve o id, e com ele a marca de falado.
    expect(after[1].id).toBe(before[0].id);
    expect(after[1].done).toBe(true);
    // O ponto que saiu da lista foi excluído junto.
    expect(after.map((beat) => beat.id)).not.toContain(before[2].id);
  });

  it('não mandar `beats` no PATCH preserva os pontos que já estavam lá', async () => {
    const rundownId = await newRundown('Pauta da omissão');
    const created = await addBlock(rundownId, 'Assunto', 'topic', {
      beats: [{ text: 'sobrevive' }]
    });

    const edited = await server.request<BlockWritePayload>(
      'PATCH',
      `/api/blocks/${created.blockId}`,
      { type: 'topic', title: 'Título novo', durationMinutes: 10 }
    );

    const beats = edited.body.blocks.find((entry) => entry.id === created.blockId)?.beats ?? [];
    expect(beats.map((beat) => beat.text)).toEqual(['sobrevive']);
  });

  it('o nível do sub-ponto grava, sobrevive à releitura e vai junto para o acervo', async () => {
    const rundownId = await newRundown('Pauta dos sub-pontos');
    const created = await addBlock(rundownId, 'Assunto com árvore', 'topic', {
      beats: [
        { text: 'Criação de Copy', depth: 0 },
        { text: 'Headline', depth: 1 },
        { text: 'Variação A', depth: 2 },
        { text: 'Onde buscar', depth: 0 }
      ]
    });

    const written = created.blocks.find((entry) => entry.id === created.blockId)?.beats ?? [];
    expect(written.map((beat) => beat.depth)).toEqual([0, 1, 2, 0]);
    expect(written.map((beat) => beat.position)).toEqual([0, 1, 2, 3]);

    // Releitura: o nível é dado gravado, não estado do formulário.
    const reread = await server.request<RundownPayload>('GET', `/api/rundowns/${rundownId}`);
    const persisted = reread.body.blocks.find((entry) => entry.id === created.blockId)?.beats ?? [];
    expect(persisted.map((beat) => beat.depth)).toEqual([0, 1, 2, 0]);

    // Ida e volta pelo acervo: `copyBeats` leva o nível nos dois sentidos.
    const promoted = await server.request<{ item: { id: string } }>('POST', '/api/library', {
      blockId: created.blockId
    });
    const restored = await server.request<{ blocks: RundownPayload['blocks'] }>(
      'POST',
      `/api/library/${promoted.body.item.id}/copy-to/${rundownId}`
    );
    const copy = restored.body.blocks[0];
    expect(copy?.beats.map((beat) => beat.depth)).toEqual([0, 1, 2, 0]);
    expect(copy?.beats.map((beat) => beat.text)).toEqual([
      'Criação de Copy',
      'Headline',
      'Variação A',
      'Onde buscar'
    ]);
  });

  it('excluir o bloco leva os pontos dele junto', async () => {
    const rundownId = await newRundown('Pauta da exclusão em cascata');
    const created = await addBlock(rundownId, 'Assunto', 'topic', {
      beats: [{ text: 'some junto' }]
    });

    await server.request('DELETE', `/api/blocks/${created.blockId}`);

    const reread = await server.request<RundownPayload>('GET', `/api/rundowns/${rundownId}`);
    expect(reread.body.blocks).toHaveLength(0);
  });
});

describe('AC-clave-50 — marcar um ponto é escrita persistida, não estado de tela', () => {
  it('a rota devolve a pauta inteira e o estado sobrevive à releitura', async () => {
    const rundownId = await newRundown('Pauta da marcação');
    const created = await addBlock(rundownId, 'Assunto', 'topic', {
      beats: [{ text: 'ponto único' }]
    });
    const beat = created.blocks.find((entry) => entry.id === created.blockId)?.beats[0];

    const marked = await server.request<RundownPayload>('PATCH', `/api/beats/${beat?.id}`, {
      done: true
    });
    expect(marked.status).toBe(200);
    expect(marked.body.blocks[0].beats[0].done).toBe(true);

    const reread = await server.request<RundownPayload>('GET', `/api/rundowns/${rundownId}`);
    expect(reread.body.blocks[0].beats[0].done).toBe(true);

    const unmarked = await server.request<RundownPayload>('PATCH', `/api/beats/${beat?.id}`, {
      done: false
    });
    expect(unmarked.body.blocks[0].beats[0].done).toBe(false);
  });

  it('recusa ponto inexistente e estado que não é booleano', async () => {
    const rundownId = await newRundown('Pauta da marcação inválida');
    const created = await addBlock(rundownId, 'Assunto', 'topic', {
      beats: [{ text: 'ponto único' }]
    });
    const beat = created.blocks.find((entry) => entry.id === created.blockId)?.beats[0];

    const ausente = await server.request<{ code: string }>('PATCH', '/api/beats/nao-existe', {
      done: true
    });
    expect(ausente.status).toBe(404);
    expect(ausente.body.code).toBe('not_found');

    const invalido = await server.request<{ code: string }>('PATCH', `/api/beats/${beat?.id}`, {
      done: 'sim'
    });
    expect(invalido.status).toBe(400);
    expect(invalido.body.code).toBe('invalid_beat_state');
  });
});
