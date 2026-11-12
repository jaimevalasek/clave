---
slug: enquadrar-imagem-de-fundo
status: done
owner: dev
created: 2026-11-12
---

# Enquadrar a imagem de fundo (retângulo + zoom)

## Objetivo

No painel Aparência, com fundo "Imagem", o apresentador posiciona a imagem arrastando um retângulo (o pedaço visível na tela) sobre a miniatura e ajusta o zoom de 100% a 300%; o fundo muda ao vivo e fica salvo.

## Pedido do dono (2026-11-12)

"A imagem de fundo daria para ter opção de trabalhar ela para ficar bem posicionada no fundo para se enquadrar?" Opção escolhida: "Retângulo + zoom" (miniatura com retângulo arrastável, zoom 100–300%, Centralizar, setas do teclado, fundo ao vivo).

## Context selected

- `shared/types.ts` (`Background`), `shared/validation/preferences.ts` (`parseBackground`, usado no PUT e na leitura do banco), `server/src/services/preferenceService.ts`.
- `src/features/appearance/applyAppearance.ts` (`backdropOf`, classe `free-backdrop` + `--backdrop` no body), `src/ui/tokens.css` (`center / cover no-repeat fixed`), `AppearancePanel.tsx` (`ImagePicker`, `BackgroundSection`), `appearanceStore.ts` (`changeAppearance` aplica na hora e salva após 250 ms).
- Testes: `tests/api/preferences.test.ts`, `tests/e2e/appearance.spec.ts`, `tests/unit/themes.test.ts`.

## Implementation intelligence

- Dado: `{ kind: 'image', value, frame?: { x, y, zoom } }` — x/y 0–100 (%, 1 casa), zoom 100–300 (inteiro). Sem `frame` = centralizado, 100% (pautas e preferências antigas seguem iguais). Frame inválido no PUT → 422 no campo `background`.
- Render: imagem numa camada fixa (`body.image-backdrop::before`) com `cover`, `background-position: x% y%` e `transform: scale(zoom)` com `transform-origin: x% y%` — o ponto de foco fica parado ao dar zoom, sem precisar do tamanho da imagem. Cor e gradiente continuam no fundo do body como hoje.
- Retângulo: matemática pura em `imageFrame.ts` — fração visível = tela / (cover × zoom × imagem), esquerda = x × (1 − largura visível). Arrastar inverte a conta.
- Padrão do painel: seções com `h3`, `.notice`, `.btn`, `changeAppearance` (ao vivo + salvamento com pausa).

## Paths

- behavior: `shared/validation/preferences.ts`, `src/features/appearance/imageFrame.ts` (novo), `src/features/appearance/FramePicker.tsx` (novo, separado do painel pelo limite de tamanho), `src/features/appearance/AppearancePanel.tsx`, `src/features/appearance/applyAppearance.ts`, `src/ui/tokens.css`, `src/features/appearance/appearance.css`
- support: `shared/types.ts`, `src/core/vocabulary.ts`, `server/src/services/preferenceService.ts` (mensagem), `server/src/http/apiCatalog.ts`, `tests/unit/imageFrame.test.ts`, `tests/api/preferences.test.ts`, `tests/e2e/appearance.spec.ts`
- Revisão de escopo: 6 behavior / 13 paths, acima do padrão do Simple Plan (5/8), dentro de MICRO. Um único resultado observável, desenho aprovado pelo dono na pergunta; sem nova integração, sem dado sensível. Segue como Simple Plan.

## Useful options considered

- include now: retângulo arrastável, zoom 100–300%, Centralizar, setas (Shift = passo maior), fundo ao vivo.
- defer: escurecer/desfocar a imagem (oferecido, não escolhido); "imagem inteira" (contain).
- escalate: nenhum.

## Done criteria / verificação

- `pnpm exec tsc --noEmit -p tsconfig.json` e `pnpm test` verdes (unit da matemática + API do frame).
- `pnpm exec playwright test tests/e2e/appearance.spec.ts` verde com caso novo: arrastar/zoom muda o fundo real, salva, volta após recarregar.
- Captura de tela conferida.

## Resultado (2026-11-12)

- Feito: `ImageFrame` opcional no fundo de imagem (`shared/types.ts`), `parseImageFrame` (validação no PUT e na leitura), camada `body.image-backdrop::before` com posição/zoom por variáveis (`applyAppearance.ts`, `tokens.css`), `FramePicker.tsx` (miniatura + retângulo arrastável, setas 2%/Shift 10%, zoom 100–300%, Centralizar), textos em `vocabulary.ts`.
- `pnpm exec tsc` (web e server): ok. `pnpm test`: 15 arquivos, 180 testes ok (novo `tests/unit/imageFrame.test.ts`; API grava/arredonda/recusa o enquadramento).
- `pnpm exec playwright test`: 79/79 ok, com o caso novo "Enquadramento" (arrastar → `50% 100%`, zoom 200 → `matrix(2…)`, setas → `38%`, salvo, volta após recarregar, Centralizar zera).
- Captura com imagem 1800×900: o pedaço no retângulo é o que aparece atrás da folha.
- Observação: a imagem de teste `PNG_BYTES` dos fixtures não é um PNG decodificável; o e2e do enquadramento usa um PNG real de 1×1.
