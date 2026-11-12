---
slug: palco-lateral-recolhida
status: done
owner: dev
created_at: 2026-09-20
updated_at: 2026-09-20
classification: MICRO
risk: low
source: direct-user-request
---

# Simple Plan - Lateral de tempos recolhida no Palco

## Scope
A coluna direita do Palco (neste assunto / falta / a seguir) nasce recolhida
para o quadro de mídia ocupar a tela; os tempos continuam a um clique.

## Context selected
- Continuação da lapidação do Palco (`palco-carrossel-anexos`).
- Existing pattern: `palco-centro` em grade `1fr 300px`; relógio global já vive
  no topo. Gotcha `palco-transborda-em-janela-baixa`.
- Applicable: simple-plan-lane, source-code-language-convention.

## Implementation intelligence
- Framework leverage: uma classe `com-tempos` na grade existente; o carrossel
  passa a `flex: 1` no espaço que a coluna largar, sem biblioteca.
- Structure: estado local em `StagePage`, sem persistência.
- Reuse: `StageTimers` intacto; só deixa de montar enquanto recolhido.

## Done criteria
- Palco abre sem a coluna de 300px; o quadro de imagem usa a largura e a altura
  que sobram, sem barra de rolagem ao lado da mídia.
- Um controle `tempos` no topo revela a lateral; o mesmo controle recolhe.
- Specs que leem cronômetro/próximo/falta expandem a lateral antes de afirmar.

## Useful options considered
- Include now: recolhida por padrão; carrossel em flex fill; desmontar a lateral
  para não ir para a captura do OBS.
- Defer: lembrar a preferência no `preferences`.
- Escalate: nada.

## Out of scope
- Mudar o relógio global do topo.
- Tirar de vez os tempos do produto.

## Expected files
- `src/features/stage/StagePage.tsx` (behavior)
- `src/features/stage/StageTimers.tsx` (behavior)
- `src/features/stage/stage.css` (behavior)
- `src/features/attachments/attachments.css` (behavior)
- `tests/e2e/helpers.ts` (support)
- `tests/e2e/stage.spec.ts` (support)
- `tests/e2e/rescue.spec.ts` (support)

## Verification
- `pnpm exec playwright test tests/e2e/stage.spec.ts tests/e2e/rescue.spec.ts tests/e2e/attachments.spec.ts tests/e2e/scenography.spec.ts` — 28 passed após ajuste do spec de metais.

## Session state
Next step: done.

## Notes
- Simple Plan; não chama `workflow:next`.
- Controle `tempos` / `esconder` no topo, ao lado do relógio global.
