import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startTestServer } from '../helpers/testServer';
import type { TestServer } from '../helpers/testServer';
import type { BlockType, Run, Rundown } from '../../shared/types';

let server: TestServer;

interface ReportLine {
  blockTitle: string;
  startOffsetSeconds: number;
  blockType: BlockType;
  plannedSeconds: number;
  actualSeconds: number;
  deltaSeconds: number;
  wasRescue: boolean;
}

interface Report {
  run: Run;
  lines: ReportLine[];
  totals: { plannedSeconds: number; actualSeconds: number; deltaSeconds: number; rescueCount: number };
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

const report = async (runId: string) =>
  (await server.request<{ report: Report }>('GET', `/api/runs/${runId}/report`)).body.report;

describe('AC-clave-28 — planejado × tocado por bloco e no total', () => {
  it('monta a linha de cada passo com a cor do tipo e o total da live', async () => {
    const rundownId = await newRundown('Pauta do relatório');
    await addBlock(rundownId, 'Abertura', 'topic', 5);
    const second = await addBlock(rundownId, 'Demo', 'media', 8);
    const rescue = await addBlock(rundownId, 'Carta', 'rescue', 3);

    const { body } = await server.request<{ run: Run }>('POST', '/api/runs', { rundownId });
    const runId = body.run.id;
    await server.request('POST', `/api/runs/${runId}/steps`, { blockId: rescue });
    await server.request('POST', `/api/runs/${runId}/steps`, { blockId: second });
    await server.request('POST', `/api/runs/${runId}/finish`, {});

    const built = await report(runId);
    expect(built.lines.map((line) => line.blockTitle)).toEqual(['Abertura', 'Carta', 'Demo']);
    expect(built.lines.map((line) => line.blockType)).toEqual(['topic', 'rescue', 'media']);
    expect(built.lines.map((line) => line.plannedSeconds)).toEqual([300, 180, 480]);
    expect(built.lines[1].wasRescue).toBe(true);

    expect(built.totals.plannedSeconds).toBe(960);
    expect(built.totals.rescueCount).toBe(1);
    for (const line of built.lines) {
      expect(line.deltaSeconds).toBe(line.actualSeconds - line.plannedSeconds);
    }
  });

  it('execução sem passo nenhum devolve relatório vazio, não erro', async () => {
    const rundownId = await newRundown('Pauta encerrada cedo');
    await addBlock(rundownId, 'Único');
    const { body } = await server.request<{ run: Run }>('POST', '/api/runs', { rundownId });
    await server.request('POST', `/api/runs/${body.run.id}/finish`, {});

    const built = await report(body.run.id);
    expect(built.lines).toHaveLength(1);
    expect(built.lines[0].startOffsetSeconds).toBe(0);
  });

  it('relatório de execução inexistente devolve erro tipado', async () => {
    const { status, body } = await server.request<{ code: string }>(
      'GET',
      '/api/runs/nao-existe/report'
    );
    expect(status).toBe(404);
    expect(body.code).toBe('not_found');
  });
});

describe('AC-clave-47 — o relatório sobrevive à edição e à exclusão do bloco', () => {
  it('mantém o snapshot depois de o bloco ser editado com a execução em aberto', async () => {
    const rundownId = await newRundown('Pauta do snapshot no relatório');
    const blockId = await addBlock(rundownId, 'Título que foi ao ar', 'topic', 5);
    const { body } = await server.request<{ run: Run }>('POST', '/api/runs', { rundownId });

    await server.request('PATCH', `/api/blocks/${blockId}`, {
      type: 'guest',
      title: 'Renomeado depois da live',
      durationMinutes: 30
    });
    await server.request('POST', `/api/runs/${body.run.id}/finish`, {});

    const built = await report(body.run.id);
    expect(built.lines[0].blockTitle).toBe('Título que foi ao ar');
    expect(built.lines[0].blockType).toBe('topic');
    expect(built.lines[0].plannedSeconds).toBe(300);
  });

  it('continua exibindo o passo depois de o bloco ser excluído', async () => {
    const rundownId = await newRundown('Pauta do bloco excluído');
    const first = await addBlock(rundownId, 'Bloco que será excluído', 'topic', 5);
    const second = await addBlock(rundownId, 'Bloco que fica', 'topic', 5);
    const { body } = await server.request<{ run: Run }>('POST', '/api/runs', { rundownId });
    await server.request('POST', `/api/runs/${body.run.id}/steps`, { blockId: second });

    await server.request('DELETE', `/api/blocks/${first}`);
    await server.request('POST', `/api/runs/${body.run.id}/finish`, {});

    const built = await report(body.run.id);
    expect(built.lines.map((line) => line.blockTitle)).toEqual([
      'Bloco que será excluído',
      'Bloco que fica'
    ]);
  });
});

describe('AC-clave-29 — o relatório não promete marcação de vídeo', () => {
  it('não devolve capítulos nem trechos: o relógio da pauta não é o da gravação', async () => {
    const rundownId = await newRundown('Pauta sem marcadores');
    await addBlock(rundownId, 'Único');
    const { body } = await server.request<{ run: Run }>('POST', '/api/runs', { rundownId });
    await server.request('POST', `/api/runs/${body.run.id}/finish`, {});

    const built = (await report(body.run.id)) as unknown as Record<string, unknown>;
    expect(built).not.toHaveProperty('chapters');
    expect(built).not.toHaveProperty('cuts');
    expect(built.run).not.toHaveProperty('cuts');
  });

  it('a rota de marcar trecho não existe mais', async () => {
    const rundownId = await newRundown('Pauta da rota aposentada');
    await addBlock(rundownId, 'Único');
    const { body } = await server.request<{ run: Run }>('POST', '/api/runs', { rundownId });

    const { status } = await server.request('POST', `/api/runs/${body.run.id}/cuts/toggle`, {});
    expect(status).toBe(404);
  });
});
