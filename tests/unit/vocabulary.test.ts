import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { COPY, FORBIDDEN_TERMS, RETIRED_TERMS, VOCABULARY } from '../../src/core/vocabulary';

/** Recursively lists interface sources. */
function sourceFiles(dir: string, extensions: string[]): string[] {
  const found: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...sourceFiles(full, extensions));
    else if (extensions.includes(path.extname(entry.name))) found.push(full);
  }
  return found;
}

/** Every string the vocabulary module ships to the interface. */
function copyStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (typeof value === 'function') {
    const sample = (value as (...args: unknown[]) => unknown)('X', 2);
    return typeof sample === 'string' ? [sample] : [];
  }
  if (Array.isArray(value)) return value.flatMap(copyStrings);
  if (value && typeof value === 'object') return Object.values(value).flatMap(copyStrings);
  return [];
}

/** Interface text: JSX literals and quoted strings of a component. */
function interfaceText(source: string): string {
  const jsxText = source.match(/>[^<>{}]+</g) ?? [];
  const quoted = source.match(/'[^'\n]{4,}'/g) ?? [];
  return [...jsxText, ...quoted].join('\n');
}

describe('AC-pauta-revelavel-49 — the interface speaks Pauta, bloco, revelar and ocultar', () => {
  it('carries the product vocabulary', () => {
    expect(VOCABULARY.rundown).toBe('Pauta');
    expect(VOCABULARY.block).toBe('bloco');
    expect(VOCABULARY.reveal).toBe('revelar');
    expect(VOCABULARY.hide).toBe('ocultar');
  });

  it('ships no live-show vocabulary in the interface strings', () => {
    const strings = copyStrings({ VOCABULARY, COPY });
    const offences: string[] = [];
    for (const text of strings) {
      for (const term of RETIRED_TERMS) {
        if (text.toLowerCase().includes(term.toLowerCase())) offences.push(`${term}: ${text}`);
      }
    }
    expect(offences).toEqual([]);
  });

  it('never calls a block "slide" or "task" in the sheet and list screens', () => {
    const files = [
      ...sourceFiles(path.resolve('src/features/sheet'), ['.tsx']),
      ...sourceFiles(path.resolve('src/features/rundowns'), ['.tsx']),
      path.resolve('src/App.tsx')
    ];
    const offences: string[] = [];
    for (const file of files) {
      const text = interfaceText(fs.readFileSync(file, 'utf8')).toLowerCase();
      for (const term of FORBIDDEN_TERMS) {
        if (new RegExp(`\\b${term}\\b`).test(text)) offences.push(`${path.relative(process.cwd(), file)}: ${term}`);
      }
    }
    expect(offences).toEqual([]);
  });
});

describe('AC-pauta-revelavel-56 — fonts are served by the app itself', () => {
  it('no stylesheet fetches a font from an external host', () => {
    for (const file of sourceFiles(path.resolve('src'), ['.css'])) {
      const css = fs.readFileSync(file, 'utf8');
      expect(css, file).not.toMatch(/@import\s+url\(['"]?https?:/i);
      expect(css, file).not.toMatch(/src:\s*url\(['"]?https?:/i);
      expect(css, file).not.toContain('fonts.googleapis.com');
    }
    const index = fs.readFileSync(path.resolve('index.html'), 'utf8');
    expect(index).not.toMatch(/<link[^>]+https?:/i);
  });

  it('ships both font files in public/fonts', () => {
    for (const font of ['inter-variable.woff2', 'jetbrains-mono-variable.woff2']) {
      const file = path.resolve('public/fonts', font);
      expect(fs.existsSync(file), font).toBe(true);
      expect(fs.statSync(file).size).toBeGreaterThan(1000);
    }
  });
});
