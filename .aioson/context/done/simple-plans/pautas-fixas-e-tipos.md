---
slug: pautas-fixas-e-tipos
status: done
owner: dev
created_at: 2026-09-18
updated_at: 2026-09-18
classification: MICRO
risk: low
source: direct-user-request
---

# Simple Plan - Tipos de pauta (Pauta / Apresentação / Evento) e fixação (pin)

## Scope
Permitir que cada pauta tenha uma classificação/tipo (`Pauta`, `Apresentação` ou `Evento`) e suporte a fixação (`pinned`), fazendo com que apresentações recorrentes (como o pitch de vendas do AIOSON Play) e itens essenciais fiquem destacados e ordenados no topo da lista.

## Context selected
- context:brief (dev/planning) — must_load: `form-fields-masks-and-validation`, `source-code-language-convention`, `output-brevity`, `simple-plan-lane`.
- Existing pattern to follow:
  - Migrações aditivas em `server/src/db/migrations.ts` com PRAGMA idempotente.
  - Validação em `shared/validation/rundown.ts`.
  - Ordenação no repositório `server/src/repositories/rundownRepository.ts`.
  - Modais e formulários com acessibilidade (`RundownForm.tsx` com `aria-invalid`).
- Applicable rule/doc: `.aioson/rules/simple-plan-lane.md`.

## Implementation intelligence
- Framework leverage / boundary:
  - Migração aditiva `version: 5`: colunas `kind TEXT NOT NULL DEFAULT 'rundown'` e `pinned INTEGER NOT NULL DEFAULT 0` na tabela `rundowns`.
  - Pautas existentes mantêm `kind: 'rundown'` e `pinned: false` sem impacto no banco.
  - Ordenação em `listRundowns`: `ORDER BY r.pinned DESC, r.last_opened_at DESC`.
  - Validação em `shared/validation/rundown.ts`: aceita `kind` em `['rundown', 'presentation', 'event']` (default `'rundown'`) e `pinned` booleano (default `false`).
  - No vocabulário: `Apresentação` passa a ser um tipo válido de roteiro/pauta, mantendo proibido apenas chamar *Bloco* de apresentação/slide.
- Reuse over custom code:
  - No `RundownForm.tsx`, usar rádio-chips ou seletor semântico com os três tipos e opção de fixar.
  - Na `RundownListPage.tsx`, exibir tags para o tipo e indicador/botão de fixação (Pin) acionando `PATCH /api/rundowns/:id` ou alternância direta.

## Done criteria
- Usuário pode escolher o tipo ao criar ou renomear/editar uma pauta: `Pauta`, `Apresentação` ou `Evento`.
- Usuário pode fixar ou desafixar uma pauta; pautas fixadas recebem destaque visual (badge/ícone) e aparecem no topo da listagem.
- Banco existente migra de forma idempotente sem perda de dados (versão 5).
- Testes de API (`tests/api/rundowns.test.ts`) e vocabulário passam sem regressão.

## Useful options considered
- Include now: Seletor de tipo no `RundownForm`, toggle de pin na listagem e no formulário, ordenação com `pinned DESC, last_opened_at DESC`, badges visuais com estilo do Clave.
- Defer: Gaveta dedicada no Palco para sacar a apresentação fixa durante o ao vivo (pode ser o próximo passo após a base de tipos e fixação estar pronta).
- Escalate: Nenhum.

## Out of scope
- Mudança na dinâmica de blocos, anexos ou pontos.
- Alterações em outros módulos fora de rundowns e cabeçalho da bancada.

## Expected files
- `shared/types.ts` — behavior (`RundownKind`, `Rundown.kind`, `Rundown.pinned`)
- `shared/validation/rundown.ts` — behavior (validação de `kind` e `pinned`)
- `server/src/db/migrations.ts` — behavior (migração 5)
- `server/src/repositories/rundownRepository.ts` — behavior (campos `kind`, `pinned`, ordenação)
- `server/src/services/rundownService.ts` — behavior (repassar `kind`, `pinned`, toggle pin)
- `server/src/routes/rundowns.ts` — behavior (rotas para atualizar tipo e pin)
- `server/src/http/apiCatalog.ts` — support (catálogo de capabilities do Play)
- `src/core/vocabulary.ts` — support (rótulos dos tipos)
- `src/features/rundowns/RundownForm.tsx` — behavior (seletor de tipo e checkbox/toggle de pin)
- `src/features/rundowns/RundownListPage.tsx` — behavior (badges de tipo, ícone de pin, ação de fixar)
- `src/features/rundowns/rundowns.css` — support (estilos dos badges e botão de pin)
- `src/features/board/BoardPage.tsx` — support (refletir o tipo no cabeçalho)
- `tests/api/rundowns.test.ts` — support (testes de tipo, pin e ordenação)
- `tests/unit/vocabulary.test.ts` — support (ajuste do teste de vocabulário)
- `tests/e2e/rundowns.spec.ts` — support (teste E2E de criação de apresentação e fixação)

## Verification
- `pnpm test` (vitest: API e unitários) — 164/164 PASS
- `pnpm test:e2e tests/e2e/rundowns.spec.ts` — 9/9 PASS
- `pnpm build` — PASS (TypeScript limpo e build gerado)

## Session state
Next step: Finalizado e verificado.

## Notes
- Migração 5 aditiva com `PRAGMA table_info(rundowns)` para idempotência.
- O catálogo `GET /api/aioson-play` em `server/src/http/apiCatalog.ts` foi atualizado para expor os novos parâmetros de `kind`/`pinned` e a rota `POST /api/rundowns/:id/toggle-pin`.
- O vocabulário agora permite o conceito de "Apresentação" para *Pauta*, mantendo proibido apenas para *Bloco*.
- Pautas fixadas ficam com `ORDER BY r.pinned DESC, r.last_opened_at DESC`, garantindo destaque no topo sem quebrar a ordenação das demais.
