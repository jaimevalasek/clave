---
slug: bancada-composicao
status: done
owner: dev
created_at: 2026-09-21
updated_at: 2026-09-21
classification: MICRO
risk: low
source: direct-user-request
---

# Simple Plan - Composição da Bancada (mesa pauta + reserva)

## Scope
A Bancada com poucos blocos deixa de parecer tela quebrada: a pauta linear e
a reserva de resgates passam a ocupar a largura como uma mesa, sem voltar
às cinco pistas e sem mudar criar/editar/arrastar.

## Context selected
- context:select (dev/planning) — always: source-code-language-convention,
  output-brevity, project.context, project-pulse, dev-state.
- Existing pattern to follow: lista linear + reserva em `TrackCanvas`
  (`data-testid="pauta-lista"` / `"reserva"`); cartões com metal na borda
  esquerda; páginas de gestão com max-width ~1040–1200px (`.pagina`);
  dispositivo D-02 (cinco linhas 1px/8px + compasso) já usado no Palco
  (`.deck-pauta`) e no empty state (`EmptyStaffMark`).
- Applicable rule/doc: simple-plan-lane, visual-implementation, identity.md
  (tinta/ouro, D-02, breakpoint 900px). Design skill `interface-design`
  ausente no repo — conformar à identity + linguagem já no `board.css`.
- Prototype binding: none — Bancada de produção em `BoardPage` / `TrackCanvas`.
- Feature ativa `palco-deck-alinhamento` é outro trabalho; este plano não
  a continua.

## Implementation intelligence
- Framework leverage: CSS grid duas colunas + media 900px. Sem lib nova.
  DnD, gaveta e API ficam iguais.
- Structure and data boundary: só `TrackCanvas` (wrapper da mesa) e
  `board.css`. `BlockCard` não muda markup.
- Reuse over custom code: classes já existentes (`.pauta-lista`, `.reserva`,
  `.cartao`, `.add-bloco`); tokens `--e-*`, `--r-cartao`, `--linha-fraca`,
  `--ouro`. Staff D-02 por `repeating-linear-gradient` como no Palco.

## Done criteria
- Em viewport ≥900px a reserva fica à direita da pauta, não abaixo num
  vazio de tela cheia.
- Em viewport <900px a reserva desce (recomposição, não desktop encolhido).
- Cartão da pauta deixa de ser uma barra oca: título e metadados na mesma
  linha.
- `+ novo bloco` alinha com a largura do cartão.
- Criar, editar, arrastar e resgate fora da ordem continuam iguais.
- Assinatura D-02 aparece como divisor sob o título da pauta.

## Useful options considered
- Include now: mesa duas colunas; cartão da pauta em linha; reserva em
  trilho sticky com cartas empilhadas; slot `+ novo bloco` na largura do
  cartão; raio `--r-cartao`; pentagrama D-02 sob o topo.
- Defer: preview de pontos/anexos no cartão; tirar o h1 duplicado do chip
  "pauta atual" da topbar.
- Escalate: voltar às cinco pistas coloridas (identity ainda cita isso;
  o produto e o e2e AC-clave-07 já recusaram).

## Out of scope
- Gaveta do bloco, Palco, tipos de pauta, pin, anexos, pontos.

## Expected files
- `src/features/board/TrackCanvas.tsx` — behavior (wrapper mesa)
- `src/features/board/board.css` — behavior (grid, cartão, D-02)
- `tests/e2e/board.spec.ts` — support (pauta | reserva em 1280px; pilha em 390px)

## Verification
- `pnpm exec playwright test tests/e2e/board.spec.ts` — 12 passed
  (incluindo reserva ao lado em 1280px e empilhada em 390px).
- Preview `http://localhost:3524/#/board/2b5f87b5-42ea-492f-b696-e68e7c5e9758`
  (pauta "O Aioson Play"): mesa duas colunas no desktop; pilha no 390px.
- `aioson verify:artifact --kind=visual --dir=src --advisory --runtime --url=http://localhost:3524`
  — avisos corpus-wide (borda esquerda do metal, eyebrow, em-dash, Inter
  FontFace); nenhum bloqueio desta fatia. Borda esquerda do cartão é
  identity (cor = tipo), não tell a remover.

## Session state
Next step: done.

## Notes
- Causa: a Bancada ainda é `height: 100vh` canvas, mas a pauta virou lista
  `max-width: 720px` à esquerda — um bloco só parece UI faltando.
- Não estava quebrada: um bloco, metadados e reserva vazia estavam corretos.
- Composição nova: `.bancada-mesa` grid 1fr / 280px; cartão da pauta em
  linha; D-02 sob o título; reserva sticky à direita.
