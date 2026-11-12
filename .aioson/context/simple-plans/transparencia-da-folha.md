---
slug: transparencia-da-folha
status: done
owner: dev
created: 2026-11-12
---

# Transparência da folha (ver o fundo através da pauta)

## Objetivo

No painel Aparência, um controle "Transparência da folha" (0–100%, passo 5) define quanto o fundo aparece através da folha; padrão 10% (o véu de 90% de hoje), aplicado ao vivo e salvo para todas as pautas.

## Pedido do dono (2026-11-12)

"Agora com o fundo podendo colocar imagem, senti falta de ter a opção de aparência tipo vídeo para ficar transparente em um grau que dê para digitar as informações e poder ver o fundo."

## Context selected

- `src/features/sheet/sheet.css` `.sheet-column { background-color: color-mix(in srgb, var(--sheet) 90%, transparent) }` — véu fixo; cópia `veilNote` diz 90%.
- Preferências: `shared/types.ts` (`Preferences`), `server/src/repositories/preferenceRepository.ts` (chave/valor, padrões), `server/src/services/preferenceService.ts` (`readAppearance`), `appearanceStore.ts` (`current`, `loadAppearance`), `applyAppearance.ts`.
- Testes: `tests/api/preferences.test.ts` (lista de chaves), `tests/e2e/appearance.spec.ts` (véu ≥ 0,85 no padrão; `afterEach` volta ao padrão).

## Implementation intelligence

- Dado: `sheetOpacity` (inteiro 0–100, padrão 90) em `Preferences`; o painel mostra transparência = 100 − opacidade, palavra do dono. Ausente no banco = 90 (nada muda para quem já usa).
- Render: `--sheet-veil` no `:root`, lido por `color-mix(... var(--sheet-veil, 90%) ...)`. Pautas, linhas e margem continuam desenhadas.
- Aviso de legibilidade no padrão do aviso de contraste: acima de 40% de transparência com fundo livre, avisa que o texto pode sumir em partes claras/agitadas da imagem (não bloqueia).
- `accentOf`/`appearanceVariables` passam a pedir só tema e destaque (não precisam da opacidade).

## Paths

- behavior: `shared/validation/preferences.ts`, `server/src/repositories/preferenceRepository.ts`, `server/src/services/preferenceService.ts`, `src/features/appearance/applyAppearance.ts`, `src/features/appearance/appearanceStore.ts`, `src/features/appearance/AppearancePanel.tsx`, `src/features/sheet/sheet.css`
- support: `shared/types.ts`, `server/src/http/apiCatalog.ts`, `src/core/vocabulary.ts`, `src/features/appearance/appearance.css`, `tests/api/preferences.test.ts`, `tests/e2e/appearance.spec.ts`
- Revisão de escopo: 7 behavior / 13 paths (> 5/8) porque a preferência atravessa banco → API → tela; um único resultado observável, pedido direto do dono, mesmo padrão das outras preferências de aparência. Segue como Simple Plan.

## Useful options considered

- include now: controle 0–100% passo 5, ao vivo, salvo; aviso de legibilidade.
- defer: sombra no texto para ler sobre imagem agitada; escurecer a imagem.
- escalate: nenhum.

## Done criteria / verificação

- `pnpm exec tsc` (web e server) e `pnpm test` verdes (API grava/recusa/padrão).
- `pnpm exec playwright test tests/e2e/appearance.spec.ts` verde com caso novo: mover o controle muda o véu da folha na hora, salva, volta após recarregar.
- Captura de tela conferida com imagem de fundo.

## Resultado (2026-11-12)

- Feito: `sheetOpacity` (0–100, padrão 90) em `Preferences`, validado no PUT (`isSheetOpacity`) e lido do banco com padrão; `--sheet-veil` no `:root` (`applyAppearance.ts`) lido pelo véu da folha (`sheet.css`); controle "Transparência da folha" 0–100% passo 5 no painel, com aviso acima de 40% sobre fundo livre (`AppearancePanel.tsx`); `.frame-zoom` virou `.slider-row` (mesma linha de controle deslizante para zoom e transparência).
- `pnpm exec tsc` (web e server): ok. `pnpm test`: 181 ok (API: padrão 90, grava 0/35/100, recusa −5/101/50,5/"60"/null, sobrevive a reinício).
- `pnpm exec playwright test`: 81/81 ok, com o caso novo "Transparência da folha" (véu 0,9 → 0,3 → 0,6 na hora, aviso só com fundo livre e acima de 40%, digitação normal, volta após recarregar).
- Captura com imagem de fundo e 50%: imagem aparece através da folha, texto e marcadores legíveis.
