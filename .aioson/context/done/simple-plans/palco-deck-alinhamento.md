---
slug: palco-deck-alinhamento
status: done
owner: dev
created_at: 2026-09-20
updated_at: 2026-09-20
classification: MICRO
risk: low
source: direct-user-request
---

# Simple Plan - Alinhar o DECK vazio no Palco

## Scope
No rodapé do Palco, o rótulo vertical DECK e o texto "Deck vazio…" ficam
no mesmo eixo vertical, pousados sobre as cinco linhas da pauta (D-02),
sem o texto cair abaixo do pentagrama.

## Context selected
- Existing pattern: dispositivo D-02 em `.deck-pauta` (cinco linhas 1px/8px +
  compasso). Protótipo e `identity.md` mandam as cartas **pousarem sobre**
  as linhas; o estado vazio deve seguir a mesma geometria.
- Applicable: gotcha `palco-grid-anula-position-absolute` (não usar
  `:not()` de camada), grid 4px (`--e-2`/`--e-4`).
- Prototype binding: none for this slice — Palco de produção em
  `stage.css` / `RescueDeck.tsx`.

## Implementation intelligence
- Framework leverage: flex `align-items: center` + staff `top: 50%;
  transform: translateY(-50%)`. Sem markup novo.
- Structure: só CSS do Palco. Texto e testid do estado vazio ficam.
- Reuse: altura 33px do pentagrama já existente.

## Done criteria
- Texto vazio e rótulo DECK compartilham o centro vertical (tolerância
  pequena no e2e).
- Linhas da pauta atravessam essa mesma faixa, não ficam um bloco vazio
  acima do texto.
- Cartas de resgate, quando existem, continuam pousadas sobre as linhas.

## Useful options considered
- Include now: centralizar pentagrama na faixa; `align-items: center`;
  zerar padding extra do `.deck-vazio`.
- Defer: virar o rótulo DECK para horizontal (o vertical é o dispositivo).
- Escalate: nada.

## Out of scope
- Copiar, atalhos, carrossel, abrir links.

## Expected files
- `src/features/stage/stage.css` (behavior)
- `tests/e2e/rescue.spec.ts` (support)

## Verification
- `pnpm exec playwright test tests/e2e/rescue.spec.ts` — 4 passed, including
  geometric check that empty copy and DECK share a vertical center.

## Session state
Next step: done.

## Notes
- Causa: `::before`/`::after` em `top: 0` e `.deck-pauta` com padding 16px
  empurram o flex para baixo das linhas; `align-items: stretch` + rótulo
  vertical alto deixa o texto vazio abaixo do pentagrama.
