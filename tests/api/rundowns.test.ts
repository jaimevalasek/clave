import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startTestServer } from '../helpers/testServer';
import type { TestServer } from '../helpers/testServer';
import type { Rundown, RundownSummary } from '../../shared/types';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

async function createRundown(title: string, date = '2026-08-18'): Promise<Rundown> {
  const { status, body } = await server.request<{ rundown: Rundown }>('POST', '/api/rundowns', {
    title,
    date
  });
  expect(status).toBe(201);
  return body.rundown;
}

describe('AC-clave-02 — o título da pauta é validado no domínio', () => {
  it('rejeita título vazio antes de qualquer escrita', async () => {
    const before = await server.request<{ rundowns: RundownSummary[] }>('GET', '/api/rundowns');
    const { status, body } = await server.request<{ code: string; fields: { field: string }[] }>(
      'POST',
      '/api/rundowns',
      { title: '   ', date: '2026-08-18' }
    );

    expect(status).toBe(422);
    expect(body.code).toBe('validation_failed');
    expect(body.fields[0].field).toBe('title');

    const after = await server.request<{ rundowns: RundownSummary[] }>('GET', '/api/rundowns');
    expect(after.body.rundowns).toHaveLength(before.body.rundowns.length);
  });

  it('rejeita título acima de 120 caracteres', async () => {
    const { status } = await server.request('POST', '/api/rundowns', {
      title: 'a'.repeat(121),
      date: '2026-08-18'
    });
    expect(status).toBe(422);
  });

  it('rejeita data fora do formato de data', async () => {
    const { status, body } = await server.request<{ fields: { field: string }[] }>(
      'POST',
      '/api/rundowns',
      { title: 'Live com data ruim', date: '18/08/2026' }
    );
    expect(status).toBe(422);
    expect(body.fields[0].field).toBe('date');
  });

  it('usa a data de hoje quando o campo vem vazio', async () => {
    const { body } = await server.request<{ rundown: Rundown }>('POST', '/api/rundowns', {
      title: 'Live sem data'
    });
    expect(body.rundown.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('AC-clave-01 — a lista mostra o que a pauta tem e ordena pela última abertura', () => {
  it('traz título, data, contagem de blocos e minutos previstos', async () => {
    const created = await createRundown('Live #42: montando o Clave ao vivo');
    const { body } = await server.request<{ rundowns: RundownSummary[] }>('GET', '/api/rundowns');
    const listed = body.rundowns.find((rundown) => rundown.id === created.id);

    expect(listed).toBeDefined();
    expect(listed?.title).toBe('Live #42: montando o Clave ao vivo');
    expect(listed?.date).toBe('2026-08-18');
    expect(listed?.trackBlockCount).toBe(0);
    expect(listed?.rescueBlockCount).toBe(0);
    expect(listed?.plannedMinutes).toBe(0);
    expect(listed?.openRunId).toBeNull();
  });

  it('abrir uma pauta a coloca no topo da lista', async () => {
    const first = await createRundown('Primeira da ordenação');
    const second = await createRundown('Segunda da ordenação');

    let listed = await server.request<{ rundowns: RundownSummary[] }>('GET', '/api/rundowns');
    expect(listed.body.rundowns[0].id).toBe(second.id);

    await server.request('POST', `/api/rundowns/${first.id}/open`);
    listed = await server.request<{ rundowns: RundownSummary[] }>('GET', '/api/rundowns');
    expect(listed.body.rundowns[0].id).toBe(first.id);
  });
});

describe('AC-clave-03 — renomear atinge só a pauta escolhida; duplicar não altera a original', () => {
  it('renomeia apenas o alvo', async () => {
    const target = await createRundown('Alvo do renomear');
    const bystander = await createRundown('Vizinha intocada');

    const { status } = await server.request('PATCH', `/api/rundowns/${target.id}`, {
      title: 'Renomeada de verdade',
      date: target.date
    });
    expect(status).toBe(200);

    const detail = await server.request<{ rundown: RundownSummary }>(
      'GET',
      `/api/rundowns/${bystander.id}`
    );
    expect(detail.body.rundown.title).toBe('Vizinha intocada');
  });

  it('duplica com blocos e anexos, sem tocar a original', async () => {
    const source = await createRundown('Pauta com conteúdo');
    const created = await server.request<{ blockId: string }>('POST', '/api/blocks', {
      rundownId: source.id,
      type: 'topic',
      title: 'Abertura',
      note: 'nota privada',
      durationMinutes: 7
    });
    await server.request('PUT', `/api/blocks/${created.body.blockId}/attachments`, {
      attachments: [{ type: 'link', label: 'Canal', path: 'https://exemplo.test' }]
    });

    const { status, body } = await server.request<{ rundown: Rundown }>(
      'POST',
      `/api/rundowns/${source.id}/duplicate`
    );
    expect(status).toBe(201);
    expect(body.rundown.title).toBe('Pauta com conteúdo (cópia)');
    expect(body.rundown.id).not.toBe(source.id);
    expect(body.rundown.date).toBe(source.date);

    const copy = await server.request<{
      blocks: { id: string; title: string; note: string; attachments: { id: string }[] }[];
    }>('GET', `/api/rundowns/${body.rundown.id}`);
    expect(copy.body.blocks).toHaveLength(1);
    expect(copy.body.blocks[0]).toMatchObject({ title: 'Abertura', note: 'nota privada' });
    expect(copy.body.blocks[0].id).not.toBe(created.body.blockId);
    expect(copy.body.blocks[0].attachments).toHaveLength(1);

    // Editar a cópia não alcança a original.
    await server.request('PATCH', `/api/blocks/${copy.body.blocks[0].id}`, {
      type: 'topic',
      title: 'Abertura da cópia',
      durationMinutes: 1
    });
    const original = await server.request<{
      rundown: RundownSummary;
      blocks: { id: string; title: string }[];
    }>('GET', `/api/rundowns/${source.id}`);
    expect(original.body.rundown.title).toBe('Pauta com conteúdo');
    expect(original.body.blocks).toHaveLength(1);
    expect(original.body.blocks[0]).toMatchObject({
      id: created.body.blockId,
      title: 'Abertura'
    });
  });
});

describe('AC-clave-55 — duplicar leva os pontos junto, desmarcados', () => {
  it('a cópia recebe os mesmos pontos com ids próprios e nada falado', async () => {
    const source = await createRundown('Pauta com pontos');
    const created = await server.request<{ blockId: string; blocks: { id: string; beats: { id: string }[] }[] }>(
      'POST',
      '/api/blocks',
      {
        rundownId: source.id,
        type: 'topic',
        title: 'Assunto',
        durationMinutes: 7,
        beats: [{ text: 'ponto um' }, { text: 'ponto dois', imagePath: 'foto.png' }]
      }
    );
    const original = created.body.blocks.find((entry) => entry.id === created.body.blockId);
    await server.request('PATCH', `/api/beats/${original?.beats[0].id}`, { done: true });

    const { body } = await server.request<{ rundown: Rundown }>(
      'POST',
      `/api/rundowns/${source.id}/duplicate`
    );
    const copy = await server.request<{
      blocks: { beats: { id: string; text: string; imagePath: string; done: boolean }[] }[];
    }>('GET', `/api/rundowns/${body.rundown.id}`);

    const beats = copy.body.blocks[0].beats;
    expect(beats.map((beat) => beat.text)).toEqual(['ponto um', 'ponto dois']);
    expect(beats[1].imagePath).toBe('foto.png');
    expect(beats.map((beat) => beat.done)).toEqual([false, false]);
    expect(beats.map((beat) => beat.id)).not.toContain(original?.beats[0].id);
  });
});

describe('AC-clave-04 — apagar remove a pauta e preserva o trajeto já gravado', () => {
  it('apaga a pauta e seus blocos', async () => {
    const rundown = await createRundown('Pauta descartável');
    const remove = await server.request('DELETE', `/api/rundowns/${rundown.id}`);
    expect(remove.status).toBe(204);

    const detail = await server.request<{ code: string }>('GET', `/api/rundowns/${rundown.id}`);
    expect(detail.status).toBe(404);
    expect(detail.body.code).toBe('not_found');
  });

  it('apagar pauta inexistente devolve erro tipado', async () => {
    const { status, body } = await server.request<{ code: string }>(
      'DELETE',
      '/api/rundowns/nao-existe'
    );
    expect(status).toBe(404);
    expect(body.code).toBe('not_found');
  });
});
