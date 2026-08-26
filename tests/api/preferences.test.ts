import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startTestServer } from '../helpers/testServer';
import type { TestServer } from '../helpers/testServer';
import type { Preferences } from '../../shared/types';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('preferências de interface', () => {
  it('instalação nova nunca viu o tour', async () => {
    const { status, body } = await server.request<{ preferences: Preferences }>(
      'GET',
      '/api/preferences'
    );

    expect(status).toBe(200);
    expect(body.preferences.tourSeen).toBe(false);
  });

  it('marcar o tour como visto sobrevive à releitura', async () => {
    const written = await server.request<{ preferences: Preferences }>('PUT', '/api/preferences', {
      tourSeen: true
    });
    expect(written.status).toBe(200);
    expect(written.body.preferences.tourSeen).toBe(true);

    const read = await server.request<{ preferences: Preferences }>('GET', '/api/preferences');
    expect(read.body.preferences.tourSeen).toBe(true);
  });

  it('chave desconhecida não vira preferência, e a conhecida continua valendo', async () => {
    const { status, body } = await server.request<{ preferences: Preferences }>(
      'PUT',
      '/api/preferences',
      { inventada: 'sim' }
    );

    expect(status).toBe(200);
    expect(Object.keys(body.preferences)).toEqual(['tourSeen']);
    expect(body.preferences.tourSeen).toBe(true);
  });

  it('tipo errado é erro de validação, não preferência gravada como texto', async () => {
    const { status, body } = await server.request<{ code: string; fields: { field: string }[] }>(
      'PUT',
      '/api/preferences',
      { tourSeen: 'talvez' }
    );

    expect(status).toBe(422);
    expect(body.code).toBe('validation_failed');
    expect(body.fields[0].field).toBe('tourSeen');

    const read = await server.request<{ preferences: Preferences }>('GET', '/api/preferences');
    expect(read.body.preferences.tourSeen).toBe(true);
  });
});
