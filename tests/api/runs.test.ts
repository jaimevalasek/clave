import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { startTestServer } from '../helpers/testServer';
import type { TestServer } from '../helpers/testServer';
import type { Block, BlockType, PreflightProblem, Run, Rundown } from '../../shared/types';

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
  durationMinutes = 10
): Promise<string> {
  const { body } = await server.request<{ blockId: string }>('POST', '/api/blocks', {
    rundownId,
    type,
    title,
    durationMinutes
  });
  return body.blockId;
}

async function startRun(rundownId: string): Promise<Run> {
  const { status, body } = await server.request<{ run: Run }>('POST', '/api/runs', { rundownId });
  expect(status).toBe(201);
  return body.run;
}

describe('AC-clave-15 — a checagem pré-live acontece antes de a execução começar', () => {
  it('devolve os blocos cujo anexo local não existe no disco', async () => {
    const rundownId = await newRundown('Pauta da checagem');
    const blockId = await addBlock(rundownId, 'Bloco com anexo quebrado', 'media');
    await server.request('PUT', `/api/blocks/${blockId}/attachments`, {
      attachments: [
        { type: 'video', label: 'Corte antigo', path: 'demo-v1.mp4', fullscreen: true },
        { type: 'link', label: 'Canal', path: 'https://exemplo.test' }
      ]
    });

    const { status, body } = await server.request<{ problems: PreflightProblem[] }>(
      'GET',
      `/api/rundowns/${rundownId}/preflight`
    );
    expect(status).toBe(200);
    // A URL da web não é conferida no disco; o arquivo local inexistente é.
    expect(body.problems).toHaveLength(1);
    expect(body.problems[0]).toMatchObject({
      blockId,
      blockTitle: 'Bloco com anexo quebrado',
      attachmentLabel: 'Corte antigo',
      attachmentPath: 'demo-v1.mp4'
    });
  });

  it('anexo local existente na pasta de mídia não vira problema', async () => {
    const rundownId = await newRundown('Pauta do anexo bom');
    const blockId = await addBlock(rundownId, 'Bloco com anexo válido', 'media');
    const mediaDir = path.join(process.env.AIOSON_APP_DIR as string, 'data', 'media');
    fs.mkdirSync(mediaDir, { recursive: true });
    fs.writeFileSync(path.join(mediaDir, 'existe.mp4'), 'conteúdo');

    await server.request('PUT', `/api/blocks/${blockId}/attachments`, {
      attachments: [{ type: 'video', label: 'Existe', path: 'existe.mp4', fullscreen: true }]
    });

    const { body } = await server.request<{ problems: PreflightProblem[] }>(
      'GET',
      `/api/rundowns/${rundownId}/preflight`
    );
    expect(body.problems).toHaveLength(0);
  });

  it('a imagem de um ponto entra na mesma checagem que os anexos', async () => {
    const rundownId = await newRundown('Pauta da imagem do ponto');
    const blockId = await addBlock(rundownId, 'Assunto ilustrado');
    await server.request('PATCH', `/api/blocks/${blockId}`, {
      type: 'topic',
      title: 'Assunto ilustrado',
      durationMinutes: 10,
      beats: [
        { text: 'com imagem que sumiu', imagePath: 'sumiu.png' },
        { text: 'com imagem da web', imagePath: 'https://exemplo.test/foto.png' },
        { text: 'sem imagem' }
      ]
    });

    const { body } = await server.request<{ problems: PreflightProblem[] }>(
      'GET',
      `/api/rundowns/${rundownId}/preflight`
    );
    expect(body.problems).toHaveLength(1);
    expect(body.problems[0]).toMatchObject({
      blockId,
      blockTitle: 'Assunto ilustrado',
      attachmentLabel: 'imagem do ponto "com imagem que sumiu"',
      attachmentPath: 'sumiu.png'
    });
  });

  it('caminho que escapa da pasta de mídia é recusado, nunca conferido fora dela', async () => {
    const rundownId = await newRundown('Pauta do caminho de fuga');
    const blockId = await addBlock(rundownId, 'Bloco suspeito', 'media');
    await server.request('PUT', `/api/blocks/${blockId}/attachments`, {
      attachments: [
        { type: 'file', label: 'Fuga', path: '../../../../etc/hosts', fullscreen: false }
      ]
    });

    const { body } = await server.request<{ problems: PreflightProblem[] }>(
      'GET',
      `/api/rundowns/${rundownId}/preflight`
    );
    expect(body.problems).toHaveLength(1);
    expect(body.problems[0].attachmentPath).toBe('../../../../etc/hosts');
  });
});

describe('AC-clave-27 — cada passo do trajeto guarda o snapshot do bloco', () => {
  it('AC-clave-27 — abrir a execução já grava o primeiro passo do trilho', async () => {
    const rundownId = await newRundown('Pauta da execução');
    const first = await addBlock(rundownId, 'Abertura', 'topic', 5);
    await addBlock(rundownId, 'Segundo', 'media', 8);

    const run = await startRun(rundownId);
    expect(run.endedAt).toBeNull();
    expect(run.steps).toHaveLength(1);
    expect(run.steps[0]).toMatchObject({
      blockId: first,
      blockTitle: 'Abertura',
      blockType: 'topic',
      startOffsetSeconds: 0,
      actualSeconds: null,
      plannedSeconds: 300,
      wasRescue: false,
      sequence: 0
    });
  });

  it('AC-clave-27 — avançar fecha o passo anterior com a duração real e abre o próximo', async () => {
    const rundownId = await newRundown('Pauta do avanço');
    await addBlock(rundownId, 'Um', 'topic', 3);
    const second = await addBlock(rundownId, 'Dois', 'interaction', 6);

    const run = await startRun(rundownId);
    const { body } = await server.request<{ run: Run }>('POST', `/api/runs/${run.id}/steps`, {
      blockId: second
    });

    expect(body.run.steps).toHaveLength(2);
    expect(body.run.steps[0].actualSeconds).not.toBeNull();
    expect(body.run.steps[0].actualSeconds).toBeGreaterThanOrEqual(0);
    expect(body.run.steps[1]).toMatchObject({
      blockId: second,
      blockTitle: 'Dois',
      blockType: 'interaction',
      plannedSeconds: 360,
      wasRescue: false,
      sequence: 1
    });
  });

  it('AC-clave-27 — sacar resgate grava o passo com foiResgate', async () => {
    const rundownId = await newRundown('Pauta do resgate');
    await addBlock(rundownId, 'Trilho', 'topic', 4);
    const card = await addBlock(rundownId, 'Carta', 'rescue', 3);

    const run = await startRun(rundownId);
    const { body } = await server.request<{ run: Run }>('POST', `/api/runs/${run.id}/steps`, {
      blockId: card
    });

    expect(body.run.steps[1]).toMatchObject({
      blockId: card,
      blockType: 'rescue',
      wasRescue: true
    });
  });

  it('recusa entrar no ar com o trilho vazio e recusa segunda execução em aberto', async () => {
    const emptyRundown = await newRundown('Pauta sem trilho');
    const semTrilho = await server.request<{ code: string }>('POST', '/api/runs', {
      rundownId: emptyRundown
    });
    expect(semTrilho.status).toBe(400);
    expect(semTrilho.body.code).toBe('empty_track');

    const rundownId = await newRundown('Pauta de uma execução só');
    await addBlock(rundownId, 'Único');
    await startRun(rundownId);
    const segunda = await server.request<{ code: string }>('POST', '/api/runs', { rundownId });
    expect(segunda.status).toBe(400);
    expect(segunda.body.code).toBe('run_already_open');
  });
});

describe('AC-clave-06 — a execução em aberto pertence à pauta', () => {
  it('AC-clave-06 — a pauta com execução sem fim é marcada na lista', async () => {
    const rundownId = await newRundown('Pauta em aberto');
    await addBlock(rundownId, 'Único');
    const run = await startRun(rundownId);

    const listed = await server.request<{ rundowns: { id: string; openRunId: string | null }[] }>(
      'GET',
      '/api/rundowns'
    );
    const marked = listed.body.rundowns.find((entry) => entry.id === rundownId);
    expect(marked?.openRunId).toBe(run.id);

    const openRun = await server.request<{ run: Run | null }>(
      'GET',
      `/api/rundowns/${rundownId}/open-run`
    );
    expect(openRun.body.run?.id).toBe(run.id);
  });

  it('AC-clave-06 — encerrar retroativamente fecha no último passo registrado, sem descartar o trajeto', async () => {
    const rundownId = await newRundown('Pauta encerrada retroativamente');
    await addBlock(rundownId, 'Um', 'topic', 5);
    const second = await addBlock(rundownId, 'Dois', 'topic', 5);

    const run = await startRun(rundownId);
    await server.request('POST', `/api/runs/${run.id}/steps`, { blockId: second });

    const finished = await server.request<{ run: Run }>('POST', `/api/runs/${run.id}/finish`, {
      retroactive: true
    });

    expect(finished.body.run.endedAt).not.toBeNull();
    expect(finished.body.run.steps).toHaveLength(2);
    for (const step of finished.body.run.steps) {
      expect(step.actualSeconds).not.toBeNull();
    }

    const openRun = await server.request<{ run: Run | null }>(
      'GET',
      `/api/rundowns/${rundownId}/open-run`
    );
    expect(openRun.body.run).toBeNull();
  });

  it('AC-clave-06 — encerrar de novo é inofensivo e não muda o fim gravado', async () => {
    const rundownId = await newRundown('Pauta encerrada duas vezes');
    await addBlock(rundownId, 'Único');
    const run = await startRun(rundownId);

    const first = await server.request<{ run: Run }>('POST', `/api/runs/${run.id}/finish`, {});
    const second = await server.request<{ run: Run }>('POST', `/api/runs/${run.id}/finish`, {});
    expect(second.body.run.endedAt).toBe(first.body.run.endedAt);
  });
});

describe('AC-clave-30 — a execução encerrada não aceita mais passo', () => {
  it('registrar passo depois do fim devolve erro tipado', async () => {
    const rundownId = await newRundown('Pauta fechada');
    const blockId = await addBlock(rundownId, 'Único');
    const run = await startRun(rundownId);
    await server.request('POST', `/api/runs/${run.id}/finish`, {});

    const passo = await server.request<{ code: string }>('POST', `/api/runs/${run.id}/steps`, {
      blockId
    });
    expect(passo.status).toBe(400);
    expect(passo.body.code).toBe('run_finished');
  });
});

describe('AC-clave-53 — entrar no ar começa a live com o checklist limpo', () => {
  it('os pontos marcados na execução anterior voltam desmarcados', async () => {
    const rundownId = await newRundown('Pauta do checklist');
    const blockId = await addBlock(rundownId, 'Assunto com pontos');
    await server.request('PATCH', `/api/blocks/${blockId}`, {
      type: 'topic',
      title: 'Assunto com pontos',
      durationMinutes: 10,
      beats: [{ text: 'primeiro' }, { text: 'segundo' }]
    });

    const first = await startRun(rundownId);
    const board = await server.request<{ blocks: Block[] }>('GET', `/api/rundowns/${rundownId}`);
    const beats = board.body.blocks[0].beats;
    await server.request('PATCH', `/api/beats/${beats[0].id}`, { done: true });
    await server.request('PATCH', `/api/beats/${beats[1].id}`, { done: true });

    const marked = await server.request<{ blocks: Block[] }>('GET', `/api/rundowns/${rundownId}`);
    expect(marked.body.blocks[0].beats.map((beat) => beat.done)).toEqual([true, true]);

    await server.request('POST', `/api/runs/${first.id}/finish`, {});
    await startRun(rundownId);

    const fresh = await server.request<{ blocks: Block[] }>('GET', `/api/rundowns/${rundownId}`);
    expect(fresh.body.blocks[0].beats.map((beat) => beat.done)).toEqual([false, false]);
  });
});

describe('AC-clave-47 — o trajeto sobrevive à edição e à exclusão do bloco', () => {
  it('editar o bloco com a execução em aberto não mexe no passo já gravado', async () => {
    const rundownId = await newRundown('Pauta do snapshot');
    const blockId = await addBlock(rundownId, 'Título que estava no ar', 'topic', 5);
    const run = await startRun(rundownId);

    await server.request('PATCH', `/api/blocks/${blockId}`, {
      type: 'guest',
      title: 'Título trocado depois',
      durationMinutes: 30
    });

    const reread = await server.request<{ run: Run }>('GET', `/api/runs/${run.id}`);
    expect(reread.body.run.steps[0]).toMatchObject({
      blockTitle: 'Título que estava no ar',
      blockType: 'topic',
      plannedSeconds: 300
    });
  });

  it('excluir o bloco com a execução em aberto preserva o passo e recompacta só o trilho', async () => {
    const rundownId = await newRundown('Pauta da exclusão em aberto');
    const first = await addBlock(rundownId, 'Vai ser excluído', 'topic', 5);
    const second = await addBlock(rundownId, 'Continua', 'topic', 5);
    const run = await startRun(rundownId);
    await server.request('POST', `/api/runs/${run.id}/steps`, { blockId: second });

    await server.request('DELETE', `/api/blocks/${first}`);

    const reread = await server.request<{ run: Run }>('GET', `/api/runs/${run.id}`);
    expect(reread.body.run.steps).toHaveLength(2);
    expect(reread.body.run.steps[0]).toMatchObject({
      blockId: first,
      blockTitle: 'Vai ser excluído'
    });

    const board = await server.request<{ blocks: Block[] }>('GET', `/api/rundowns/${rundownId}`);
    expect(board.body.blocks).toHaveLength(1);
    expect(board.body.blocks[0]).toMatchObject({ id: second, position: 0 });
  });

  it('apagar a pauta preserva o relatório do trajeto já gravado', async () => {
    const rundownId = await newRundown('Pauta que some');
    await addBlock(rundownId, 'Passo gravado');
    const run = await startRun(rundownId);
    await server.request('POST', `/api/runs/${run.id}/finish`, {});

    await server.request('DELETE', `/api/rundowns/${rundownId}`);

    const reread = await server.request<{ run: Run }>('GET', `/api/runs/${run.id}`);
    expect(reread.status).toBe(200);
    expect(reread.body.run.rundownTitle).toBe('Pauta que some');
    expect(reread.body.run.steps).toHaveLength(1);
    expect(reread.body.run.steps[0].blockTitle).toBe('Passo gravado');
  });
});
