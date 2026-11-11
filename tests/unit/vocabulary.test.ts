import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { COPY, FORBIDDEN_TERMS, VOCABULARY } from '../../src/core/vocabulary';
import { TYPE_METALS } from '../../src/ui/typeColors';

/** Varre recursivamente os fontes de interface. */
function sourceFiles(dir: string, extensions: string[]): string[] {
  const found: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...sourceFiles(full, extensions));
    else if (extensions.includes(path.extname(entry.name))) found.push(full);
  }
  return found;
}

/** Texto de interface: literais em JSX e strings de `vocabulary.ts`. */
function interfaceText(source: string): string {
  const jsxText = source.match(/>[^<>{}]+</g) ?? [];
  const quoted = source.match(/'[^'\n]{4,}'/g) ?? [];
  return [...jsxText, ...quoted].join('\n');
}

describe('AC-clave-35 — a interface fala o vocabulário canônico', () => {
  it('o módulo carrega os termos do produto', () => {
    expect(VOCABULARY.rundown).toBe('Pauta');
    expect(VOCABULARY.block).toBe('Bloco');
    expect(VOCABULARY.beat).toBe('Ponto');
    expect(VOCABULARY.beatPlural).toBe('Pontos');
    expect(VOCABULARY.rescue).toBe('Resgate');
    expect(VOCABULARY.deck).toBe('Deck');
    expect(VOCABULARY.goLive).toBe('Entrar no ar');
    expect(VOCABULARY.trajectory).toBe('Trajeto');
    expect(VOCABULARY.library).toBe('Acervo');
  });

  it('nenhum texto de interface usa slide, item ou task para os conceitos', () => {
    const files = sourceFiles(path.resolve('src'), ['.tsx']);
    expect(files.length).toBeGreaterThan(10);

    const offences: string[] = [];
    for (const file of files) {
      const text = interfaceText(fs.readFileSync(file, 'utf8')).toLowerCase();
      for (const term of FORBIDDEN_TERMS) {
        // "item do acervo" e "itens" são o vocabulário do próprio Acervo; o que
        // a fonte proíbe é chamar o Bloco de "item".
        const pattern = new RegExp(`\\b${term}\\b(?! do acervo)`, 'g');
        const hits = text.match(pattern);
        if (hits) offences.push(`${path.relative(process.cwd(), file)}: ${term} (${hits.length}×)`);
      }
    }
    expect(offences).toEqual([]);
  });

  it('o vocabulário aposentado não volta pelo módulo', () => {
    const termos = Object.values(VOCABULARY) as string[];
    expect(termos).not.toContain('Pista');
    expect(termos).not.toContain('Marcadores');
    expect(termos).not.toContain('Curva de energia');
  });

  it('as strings de tela saem do módulo de vocabulário, não de literais soltos', () => {
    expect(COPY.nav.rundowns).toBe(VOCABULARY.rundownPlural);
    expect(COPY.nav.library).toBe(VOCABULARY.library);
    expect(COPY.nav.board).toBe(VOCABULARY.board);
    expect(COPY.rundowns.heading).toBe(VOCABULARY.rundownPlural);
  });

  it('os rótulos das etiquetas seguem o vocabulário do produto', () => {
    expect(Object.values(TYPE_METALS).map((metal) => metal.label)).toEqual([
      'Tema',
      'Mídia',
      'Interação',
      'Convidado',
      'Resgate'
    ]);
  });
});

describe('AC-clave-36 — o mapa etiqueta→metal é fonte única', () => {
  it('cada etiqueta tem seu metal e o ouro não pertence a nenhum', () => {
    expect(TYPE_METALS.topic.hex).toBe('#D8895B');
    expect(TYPE_METALS.media.hex).toBe('#B49BD8');
    expect(TYPE_METALS.interaction.hex).toBe('#C9697A');
    expect(TYPE_METALS.guest.hex).toBe('#B3C2D6');
    expect(TYPE_METALS.rescue.hex).toBe('#6EC6A2');

    const golds = Object.values(TYPE_METALS).filter(
      (metal) => metal.hex.toUpperCase() === '#E8BA52'
    );
    expect(golds).toEqual([]);
  });

  it('nenhuma etiqueta repete o metal de outra', () => {
    const hexes = Object.values(TYPE_METALS).map((metal) => metal.hex);
    expect(new Set(hexes).size).toBe(hexes.length);
  });
});

describe('AC-clave-37 — as fontes são servidas localmente', () => {
  it('nenhuma folha de estilo busca fonte em host externo', () => {
    const files = sourceFiles(path.resolve('src'), ['.css']);
    for (const file of files) {
      const css = fs.readFileSync(file, 'utf8');
      expect(css, file).not.toMatch(/@import\s+url\(['"]?https?:/i);
      expect(css, file).not.toMatch(/src:\s*url\(['"]?https?:/i);
      expect(css, file).not.toContain('fonts.googleapis.com');
      expect(css, file).not.toContain('fonts.gstatic.com');
    }

    const index = fs.readFileSync(path.resolve('index.html'), 'utf8');
    expect(index).not.toMatch(/<link[^>]+https?:/i);
  });

  it('os dois arquivos de fonte existem em public/fonts', () => {
    for (const font of ['inter-variable.woff2', 'jetbrains-mono-variable.woff2']) {
      const file = path.resolve('public/fonts', font);
      expect(fs.existsSync(file), font).toBe(true);
      expect(fs.statSync(file).size).toBeGreaterThan(1000);
    }
  });
});
