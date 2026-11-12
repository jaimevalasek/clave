import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeDatabase } from '../../server/src/db/database';
import { PNG_BYTES, uploadMedia } from '../helpers/sheetFixtures';
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

async function readPreferences(): Promise<Preferences> {
  const { status, body } = await server.request<{ preferences: Preferences }>('GET', '/api/preferences');
  expect(status).toBe(200);
  return body.preferences;
}

async function writePreferences(patch: unknown) {
  return server.request<{ preferences: Preferences; code: string; fields: { field: string }[] }>(
    'PUT',
    '/api/preferences',
    patch
  );
}

describe('interface preferences', () => {
  it('a fresh install has not seen the tour and opens in the default appearance', async () => {
    expect(await readPreferences()).toEqual({
      tourSeen: false,
      theme: 'ink-gold',
      accent: null,
      background: { kind: 'theme' },
      sheetOpacity: 90
    });
  });

  it('marking the tour as seen survives a new read', async () => {
    const written = await writePreferences({ tourSeen: true });
    expect(written.status).toBe(200);
    expect(written.body.preferences.tourSeen).toBe(true);
    expect((await readPreferences()).tourSeen).toBe(true);
  });

  it('an unknown key never becomes a preference and the known ones keep their value', async () => {
    const { status, body } = await writePreferences({ invented: 'yes' });
    expect(status).toBe(200);
    expect(Object.keys(body.preferences).sort()).toEqual(['accent', 'background', 'sheetOpacity', 'theme', 'tourSeen']);
    expect(body.preferences.tourSeen).toBe(true);
  });

  it('a wrong type is a validation error, not a preference stored as text', async () => {
    const { status, body } = await writePreferences({ tourSeen: 'maybe' });
    expect(status).toBe(422);
    expect(body.code).toBe('validation_failed');
    expect(body.fields[0].field).toBe('tourSeen');
    expect((await readPreferences()).tourSeen).toBe(true);
  });
});

describe('AC-pauta-revelavel-46 — appearance is stored for the whole app', () => {
  it('stores each of the five themes', async () => {
    for (const theme of ['porcelain', 'notebook', 'slate', 'high-contrast', 'ink-gold'] as const) {
      const { status, body } = await writePreferences({ theme });
      expect(status).toBe(200);
      expect(body.preferences.theme).toBe(theme);
    }
  });

  it('stores a free accent as #RRGGBB and null goes back to the accent of the theme', async () => {
    const written = await writePreferences({ accent: '#3a7bd5' });
    expect(written.status).toBe(200);
    expect(written.body.preferences.accent).toBe('#3A7BD5');

    const reset = await writePreferences({ accent: null });
    expect(reset.status).toBe(200);
    expect(reset.body.preferences.accent).toBeNull();
  });

  it('stores a color, each of the 3 gradients and the theme background', async () => {
    const color = await writePreferences({ background: { kind: 'color', value: '#22303c' } });
    expect(color.body.preferences.background).toEqual({ kind: 'color', value: '#22303C' });

    for (const value of ['dusk', 'halo', 'grove']) {
      const gradient = await writePreferences({ background: { kind: 'gradient', value } });
      expect(gradient.status).toBe(200);
      expect(gradient.body.preferences.background).toEqual({ kind: 'gradient', value });
    }

    const theme = await writePreferences({ background: { kind: 'theme', value: 'ignored' } });
    expect(theme.body.preferences.background).toEqual({ kind: 'theme' });
  });

  it('stores an image background that is in the media folder', async () => {
    const path = await uploadMedia(server, 'fundo.png', PNG_BYTES);
    const { status, body } = await writePreferences({ background: { kind: 'image', value: path } });
    expect(status).toBe(200);
    expect(body.preferences.background).toEqual({ kind: 'image', value: path });
  });

  it('stores how much the sheet covers the background, a whole number from 0 to 100, and refuses anything else', async () => {
    for (const value of [0, 35, 100]) {
      const { status, body } = await writePreferences({ sheetOpacity: value });
      expect(status).toBe(200);
      expect(body.preferences.sheetOpacity).toBe(value);
    }
    for (const value of [-5, 101, 50.5, '60', null]) {
      const refused = await writePreferences({ sheetOpacity: value });
      expect(refused.status, JSON.stringify(value)).toBe(422);
      expect(refused.body.fields.map((entry) => entry.field)).toEqual(['sheetOpacity']);
    }
    expect((await readPreferences()).sheetOpacity).toBe(100);
    await writePreferences({ sheetOpacity: 90 });
  });

  it('stores the framing of an image: position with one decimal, whole zoom', async () => {
    const path = await uploadMedia(server, 'enquadrado.png', PNG_BYTES);
    const { status, body } = await writePreferences({ background: { kind: 'image', value: path, frame: { x: 12.34, y: 100, zoom: 187.6 } } });
    expect(status).toBe(200);
    expect(body.preferences.background).toEqual({ kind: 'image', value: path, frame: { x: 12.3, y: 100, zoom: 188 } });
    expect((await readPreferences()).background).toEqual({ kind: 'image', value: path, frame: { x: 12.3, y: 100, zoom: 188 } });

    // A frame out of its limits is refused on the background field and nothing changes.
    for (const frame of [{ x: 50, y: 50, zoom: 400 }, { x: -1, y: 50, zoom: 100 }, { x: '50', y: 50, zoom: 100 }, 'center']) {
      const refused = await writePreferences({ background: { kind: 'image', value: path, frame } });
      expect(refused.status, JSON.stringify(frame)).toBe(422);
      expect(refused.body.fields.map((entry) => entry.field)).toEqual(['background']);
    }
    expect((await readPreferences()).background).toEqual({ kind: 'image', value: path, frame: { x: 12.3, y: 100, zoom: 188 } });
  });

  it('refuses a theme, accent or background out of the closed lists and writes nothing', async () => {
    const before = await readPreferences();
    const cases: [unknown, string][] = [
      [{ theme: 'neon' }, 'theme'],
      [{ accent: 'red' }, 'accent'],
      [{ accent: '#FFF' }, 'accent'],
      [{ background: { kind: 'color', value: 'blue' } }, 'background'],
      [{ background: { kind: 'gradient', value: 'rainbow' } }, 'background'],
      [{ background: { kind: 'image', value: '../clave.db' } }, 'background'],
      [{ background: { kind: 'image', value: 'https://example.com/fundo.png' } }, 'background'],
      [{ background: { kind: 'image', value: 'notes.txt' } }, 'background'],
      [{ background: { kind: 'image', value: 'never-uploaded.png' } }, 'background'],
      [{ background: 'gradient' }, 'background']
    ];
    for (const [patch, field] of cases) {
      const { status, body } = await writePreferences(patch);
      expect(status, JSON.stringify(patch)).toBe(422);
      expect(body.fields.map((entry) => entry.field)).toEqual([field]);
    }
    // A valid key next to an invalid one is not written either.
    const mixed = await writePreferences({ theme: 'slate', accent: 'nope' });
    expect(mixed.status).toBe(422);
    expect(await readPreferences()).toEqual(before);
  });

  it('survives a restart: the database is closed and opened again (RULE-pauta-revelavel-10)', async () => {
    await writePreferences({
      theme: 'notebook',
      accent: '#AA3300',
      background: { kind: 'gradient', value: 'halo' },
      sheetOpacity: 45
    });
    closeDatabase();
    expect(await readPreferences()).toEqual({
      tourSeen: true,
      theme: 'notebook',
      accent: '#AA3300',
      background: { kind: 'gradient', value: 'halo' },
      sheetOpacity: 45
    });
  });
});
