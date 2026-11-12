---
kind: identity
scope: briefing
slug: clave
source: references
generated_by: reference-identity-extract
generated_at: 2026-08-15
confidence: high
theme: light-dark
base_unit: 4px
---

## Design pillars

1. **Tinta quente, luz de porcelana — nunca azul.** Fundo de tinta quente (#0B0A08), texto marfim, cinzas quentes. O Clave abandona o azul-tinta da pesquisa original por decisão do usuário (2026-08-15) e adota a identidade do ecossistema AIOSON; qualquer fundo azulado é identidade antiga, migração pendente. Bônus verificado em pesquisa: cores saturadas sobre fundo escuro sobrevivem melhor à compressão do YouTube do que tons pastéis — a cenografia do Palco ganha com o DNA.
2. **Metais com dono; ouro é a batuta.** Ouro pertence à marca, à ação primária e aos gates (decisão humana): "Entrar no ar", confirmações, foco. Nenhum tipo de bloco toma o ouro para si. A invariante da fonte — *cor codifica tipo de bloco, nunca decora* — sobrevive dentro do DNA através de um mapa fixo tipo→metal (ver Palette).
3. **Três vozes.** Estrutura fala em sans; a intenção humana fala em serif itálico, sempre curta, no metal do contexto (notas privadas do apresentador, palavra viva do título); a máquina fala em mono (timecodes, contadores, eyebrows, chips). A máquina nunca fala em serif; a intenção nunca fala em mono.

## Palette

Tema tinta (padrão do Clave; o Palco é cenografia escura). Valores porcelana entre parênteses para o tema claro do ecossistema.

- Fundo: tinta `#0B0A08` (`#F1EDE3`); fundo alternado tinta-2 `#0F0D0A` (`#E9E4D6`).
- Superfícies: superficie `#161310` (`#F9F6EE`); superficie-2 `#1D1914` (`#FFFDF7`); solido (modal/overlay opaco) `#242019` (`#FFFDF7`).
- Texto: marfim `#F5F1E8` (`#1C1710`); secundário marfim-2 `#CDC5B4` (`#4C4436`); metadados fumaca `#8F8674` (`#7D7362`).
- Bordas: linha `rgba(224,203,163,.14)`; seleção linha-2 `rgba(233,214,177,.28)`.
- Marca / ação primária / gate: **ouro `#E8BA52`** (`#8A6512`).
- **Mapa funcional do Clave — cor codifica tipo de bloco:**
  - tema → **cobre** `#D8895B` (`#A55A30`) — a forja: o conteúdo que se constrói;
  - mídia → **nióbio** `#B49BD8` (`#6C4E9B`) — o metal que muda com a luz;
  - interação → **granada** `#C9697A` (`#9C3F52`) — a voz humana;
  - convidado → **prata** `#B3C2D6` (`#5C6D80`) — quem chega de fora da estrutura;
  - resgate → **patina** `#6EC6A2` (`#177A58`) — o metal do que está vivo: o resgate mantém a live no ar.
- Semântica: vivo/sucesso/"AO AR" = patina `#6EC6A2`; erro e **vale de energia** = perigo `#E25D5D` (`#BF3D47`) — o vale é o perigo da live morrer; aviso leve pode usar cobre quando não conflitar com o tipo tema no mesmo contexto.

## Typography

- Estrutura (display + corpo): `Inter, "Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif`.
- Intenção humana: `Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif` — sempre itálico, sempre curto, no metal do contexto.
- Máquina: `"JetBrains Mono", "Cascadia Code", monospace`.
- Escala: página 30px/800; título do Palco `clamp(38px, 5.6vw, 78px)`/900, line-height .94, letter-spacing −0.015em; seção 19–24px/800; corpo 15px/1.55; metadados mono 11–12px caixa alta com letter-spacing .1em+. Piso de legibilidade sob compressão: nenhuma informação do Palco abaixo de ~20px equivalentes; nada de pesos finos em informação.

## Spacing & layout

- Unidade base 4px; escala: 4, 8, 12, 16, 24, 32, 56.
- Ritmo do dispositivo Pauta: linhas de 1px a cada 8px.
- Breakpoints: 900px (recomposição para coluna única; Palco empilha lateral), mínimo suportado 360px.
- Grid: páginas de gestão max-width 1080–1200px, gutter 24–32px; canvas da Bancada com colunas de 184px e rótulo de pista de 112px, rolagem horizontal própria.

## Radius & depth

- Escada de raio: 8px (controles), 10px (cartões), 16px (painéis/modais), 99px (chips/pílulas).
- **Uma estratégia de profundidade: bordas** (`1px` linha sobre superfícies chapadas). Sem empilhamento de sombras/vidro; a única sombra permitida é o lift efêmero do cartão em drag.

## Motion

- Transições funcionais: 150ms ease.
- Entrada do bloco no Palco: palavra a palavra, 35ms de atraso por palavra, `cubic-bezier(.2,.9,.3,1)`, ~500ms por palavra.
- Poeira de ouro: respiração de opacidade em 8s, apenas no tema tinta.
- `prefers-reduced-motion`: tudo estático — sem stagger, poeira congelada, transições ~0ms. Nunca animação decorativa sem função de estado ou assinatura.

## Signature moves

1. **D-02 · Pauta** — cinco linhas de 1px a cada 8px como divisor de seções, com o compasso de 2px no metal da rota. No Clave o dispositivo é literal: as 5 pistas da Bancada são a pauta em escala de aplicação.
2. **D-03 · Palavra viva** — o título gigante do Palco entra palavra a palavra (35ms) e a última palavra vira serif itálico no metal do tipo do bloco; as notas privadas (intenção do apresentador) falam na mesma voz.
3. **D-04 · Poeira de ouro** — nebulosa no metal do bloco atual + fagulhas de ouro atrás do Palco; respira em 8s; estática em reduced-motion; **nunca um campo de estrelas literal**.

## Anti-goals

1. Nenhum azul estrutural, fundo azulado, ou as cores da identidade anterior (cyan `#00B5FF`, violet `#AA56FF`, coral `#FF796D`, amber `#FFB84D`, mint `#55E6B2`) — tudo isso é migração pendente, nunca base nova.
2. Preto absoluto + neon (posição do concorrente; `#000` puro também estoura banding na compressão) — a tinta é quente, nunca preta absoluta.
3. Vozes trocadas ou ouro capturado: serif para a máquina, mono para a intenção, ou ouro como cor de um tipo de bloco/produto. Também rejeitados: cards dentro de cards e glassmorphism decorativo.

## Component structure notes

None — identity-only.

## Provenance

- Derivada de **3 arquivos textuais de referência** (0 imagens de identidade, 0 imagens de estrutura inspecionadas): `DESIGN-DNA.md`, `tokens.css`, `tokens.json` em `C:\dev\aioson-com\.aioson\explorations\aioson-ecosystem-identity\runs\variant-d\design-dna\` — variante **selecionada** da exploração (`variant-d` "Machined Light", rodadas 9–11, 2026-08-11/12).
- O `identity.md` da raiz da exploração (2026-08-09) foi verificado e está **desatualizado**: descreve a identidade azul anterior (`--void #05070B`, acentos cyan/amber/mint/violet/coral) que o próprio DESIGN-DNA proíbe. Não foi usado.
- Adaptação para o Clave (mapa tipo→metal, semântica do vale, aplicação das três vozes ao Palco) autorada por @briefing-refiner sob direção explícita do usuário (chat, 2026-08-15): "usar a skill interface-design + o design system novo… é ouro e black, pode usar cores à vontade".
