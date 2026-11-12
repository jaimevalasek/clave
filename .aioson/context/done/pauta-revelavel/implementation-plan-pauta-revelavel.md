---
feature: pauta-revelavel
status: approved
plan_contract: 2
source_briefing: .aioson/briefings/pauta-revelavel/briefings.md
sheldon_review: required
prototype: .aioson/briefings/pauta-revelavel/prototype.html
prototype_status: current
prototype_feature: pauta-revelavel
runtime_contract: required
execution: single
source_prd: .aioson/context/prd-pauta-revelavel.md
source_prd_sha256: 135585df1249760e5455e40066ab1b98f9aa78f65f1a31ec41bdf81582a4aa09
---

# Implementation Plan — pauta-revelavel

## Objective

O apresentador abre o Clave dentro do AIOSON Play, cai na última pauta usada (inclusive as antigas, já convertidas) e, numa única folha pautada, escreve, cola, formata e organiza o roteiro e revela cada bloco no ritmo da fala. O oculto nunca aparece na captura, e cada tomada recomeça do planejado. Tudo fica salvo em disco, sem relógio e sem modelo de live.

## Repository evidence

- Production entry point: o Play roda `pnpm dev` no dev-link e `pnpm start` no app buildado (`.aioson/docs/integrations/ai-app-integration.md`, linhas 279 e 925). `pnpm start` = `node server/dist/server/src/main.js` + `vite preview`, depois de `pnpm build`. O backend (`server/src/main.ts`) roda `runMigrations(db(), databaseFile())` antes de `createApp().listen(BACKEND_PORT)`. O frontend (`src/main.tsx` → `src/App.tsx`) usa roteador por hash (`src/core/router.ts`) e fala same-origin pelo proxy `/api` de `vite.config.ts`.
- Stack medida em `package.json`: React 19.2, zustand 5, `@dnd-kit/core` 6.3 + `@dnd-kit/sortable` 10, Express 5.1, better-sqlite3 12.4 em WAL, TypeScript 5.9 e Vite 7. As migrações usam `PRAGMA user_version` e estão hoje na v5 (`server/src/db/migrations.ts`).
- Existing patterns to reuse:
  - Banco: superfície síncrona única em `server/src/db/database.ts`, com `checkpoint()` antes do `.bak`.
  - Camadas: repositório e serviço por domínio (`server/src/repositories/*`, `server/src/services/*`), rotas finas, erro tipado `{status, code, message, fields}` (`server/src/http/errors.ts`) e `ValidationResult` compartilhado (`shared/validation/result.ts`).
  - Gravação "manda a lista inteira e o servidor reescreve na transação": `replaceBeats` e `reorderTrack` em `server/src/services/blockService.ts`.
  - Árvore plana com `depth` 0–2 e pai = anterior de nível menor: `shared/validation/beat.ts`.
  - Mídia: upload em streaming com assinatura e 512 MB (`server/src/services/mediaService.ts`, `POST`/`GET /api/media` em `server/src/routes/media.ts`).
  - Preferências em disco: `server/src/repositories/preferenceRepository.ts` e `server/src/services/preferenceService.ts`.
  - Interface: `src/ui/Modal.tsx`, `src/ui/Toast.tsx` (com ação "Desfazer"), `src/ui/LoadingSkeleton.tsx`, `src/ui/ErrorBanner.tsx`.
  - Tour com holofote e `tourSeen`: `src/features/guide/TourOverlay.tsx` e `GuideLayer.tsx`.
  - Arraste com `@dnd-kit`: `src/features/board/TrackCanvas.tsx`, que a Fase 1 retira; o padrão fica em `git show HEAD:src/features/board/TrackCanvas.tsx`.
  - Catálogo do Play conferido contra as rotas registradas: `server/src/http/apiCatalog.ts`, `registeredApiRoutes()` e `tests/api/platform.test.ts`.
  - Fontes locais: `src/ui/fonts.css` e `public/fonts/`.
- Test runner: `aioson detect:test-runner .` → Vitest (`vitest.config.ts`).
  - Domínio e API: `pnpm vitest run <arquivos>`, com Express real e `AIOSON_APP_DIR` descartável (`tests/helpers/testServer.ts`).
  - Interface: `pnpm playwright test <arquivos>` (`playwright.config.ts`: `pnpm dev` com banco limpo, portas 5199/3399).
  - O QA reutiliza os dois comandos.
- Dados reais: `data/clave.db` está na v5 com 1 pauta, 1 bloco e 4 anexos (2 imagens, 2 links), e há 800 KB pendentes em `data/clave.db-wal`. É a primeira entrada real da conversão.
- Árvore de trabalho: o trabalho do `clave` está sem commit (30 arquivos modificados, 6 não rastreados: `server/src/routes/openUrl.ts`, `server/src/services/openUrl.ts`, `src/features/stage/StageCarousel.tsx`, `src/features/stage/slides.ts`, `tests/api/openUrl.test.ts`, `tests/unit/slides.test.ts`). Vários deles estão entre os caminhos `retire`; ver Engineering Controls.
- Linguagem: identificadores, arquivos, rotas e títulos de teste em inglês, com o id do AC e a cópia de interface entre aspas. Todo arquivo de teste tocado tem os títulos reescritos em inglês (`aioson rules:check . --changed`). Textos de interface em pt-BR saem de `src/core/vocabulary.ts`.

## Contrato técnico da folha

Escolhas técnicas resolvidas a partir do repositório. Nenhuma muda produto.

- **Tabela `sheet_blocks`** (migração v6, aditiva). Colunas:
  - `id`, `rundown_id` (FK `ON DELETE CASCADE`), `position`, `depth` (CHECK 0–2)
  - `kind` (`text|image|video|audio`), `content` (JSON de `TextRun[]` no texto; vazio na mídia), `media_path`, `media_name`
  - `size` (`small|medium|large|title` = P/M/G/Título), `font_px`
  - `planned_visible`, `take_visible`, `reveal_step` (nulo ou o número do passo da tomada), `collapsed`
  - `created_at`, `updated_at`

  `rundowns` ganha `legacy_imported_at` (selo "veio da versão anterior" e guarda de idempotência). As tabelas antigas não mudam.
- **API.**
  - `GET /api/rundowns/:id/sheet` → `{ rundown, blocks }`.
  - `PUT /api/rundowns/:id/sheet` com `{ blocks: [{ id?, key, kind, depth, content, mediaPath, mediaName, size, fontPx, plannedVisible, takeVisible, revealStep, collapsed }] }` → `{ rundown, blocks, ids: { [key]: id }, savedAt }`.
  - O id é sempre gerado no servidor. A `key` é do cliente e serve de chave React.
- **Texto.** `TextRun = { text, bold?, color? }`, com `color` ∈ `text|accent|red|green|copper|lilac` (Texto, Destaque, Vermelho, Verde, Cobre, Lilás) e quebra como `\n`. Renderiza como nós de texto React, nunca `innerHTML`.
- **Tamanho.** Padrões 22/30/38/52 px; faixas 18–26/26–34/34–42/44–72 px; passo de 4 px em `font_px` (RULE-pauta-revelavel-05).
- **Revelar.**
  - `planned_visible` é o planejado.
  - `take_visible` + `reveal_step` são o progresso: PageUp esconde o grupo de maior `reveal_step`, e nova tomada copia o planejado e zera os passos.
  - `collapsed` só vale no preparo.
  - Blocos de falha de upload existem só no cliente e nunca são gravados.
- **Rotas do cliente.** `#/rundowns` e `#/rundown/:id`. Qualquer outro hash leva à lista.
- **Preferências.** As chaves são `tourSeen`, `theme`, `accent` (`#RRGGBB` ou ausente) e `background` (JSON `{ kind: 'theme'|'color'|'gradient'|'image', value }`).

## Autoridade de review e desvios aprovados

- F21 `titulo-menor-ajuste-bloco` (rodada 4, `refinement-feedback.applied-round4.json`, aceita, `single`): entra na Fase 5 por AC-pauta-revelavel-35 e -36 e é verificada em `tests/e2e/formatting.spec.ts`. Fonte aprovada: `plans/pauta-revelavel/pedido-ajuste-titulo.md`. As rodadas 1 a 3 entram pelo PRD.
- Desvios do PRD:
  - D1 ("Desfazer" ao reordenar): Fase 2.
  - D2 (limite de 512 MB): Fase 4.
  - D3 (fixar pauta): Fase 1.
  - D4 (tour persistido por `tourSeen`): Fase 6.
  - D5 (mídia, editor e persistência reais): Fases 1, 4 e 5.

## Engineering Controls

| Concern | Evidence / trigger | Planned control | Verification | Recovery |
|---|---|---|---|---|
| data/schema | `data/clave.db` v5 com dados reais e 800 KB no WAL; RULE-pauta-revelavel-09; aprendizado `.aioson/learnings/gotchas/backup-de-migracao-em-wal-copia-um-banco-vazio.md` | A migração v6 `revealable-sheet` roda numa transação de `runMigrations`. Cria `sheet_blocks` e acrescenta `rundowns.legacy_imported_at` com guarda por `PRAGMA table_info`. Converte só as pautas com `legacy_imported_at IS NULL` e sem `sheet_blocks`. O backup existente (`checkpoint` + `.bak`) roda antes, e nenhuma tabela antiga é alterada | `pnpm vitest run tests/api/legacyImport.test.ts` (WAL pendente aparece no `.bak`; duas execuções não duplicam; tabelas antigas presentes) + boot numa cópia de `data/` na Fase 1 | Uma falha na conversão desfaz a v6 inteira, e o backend sai com o erro. Restaurar `data/clave.db.bak` e voltar ao commit anterior devolve a v5 intacta |
| data loss | AC-pauta-revelavel-05 apaga mídia da pasta; a cópia (AC-pauta-revelavel-04) e os anexos antigos apontam para o mesmo arquivo | Ao apagar a pauta, o serviço coleta os `media_path`, apaga a linha e só depois remove os arquivos sem referência em `mediaReferenceRepository` (folha, anexos e pontos antigos, fundo escolhido), sempre via `resolveInsideMedia` | Caso AC-pauta-revelavel-05 em `tests/api/rundowns.test.ts`: o arquivo usado pela cópia continua no disco | Apagar o arquivo exclusivo é o comportamento pedido; a guarda protege o compartilhado |
| retirement | `git status`: 6 arquivos não rastreados e 30 modificados do `clave` estão entre os caminhos `retire` das Fases 1 e 6; a feature `clave` foi encerrada como `abandoned` em 2026-11-11 (questão 4 do PRD) | Antes da Fase 1, o trabalho em aberto do `clave` é commitado. O DEV para se `git status --porcelain` mostrar um caminho `retire` como `??` ou ` M` | `git status --porcelain` limpo para os caminhos retirados, antes de cada fase com `retire` | `git checkout <commit> -- <caminho>` |
| identity/concurrency | `.aioson/learnings/gotchas/tres-defeitos-que-so-o-e2e-pegou.md` (id de rascunho virou chave primária); salvamento sem botão (RULE-pauta-revelavel-08) | O cliente usa `key` própria. O servidor gera todo id novo, devolve `ids` por `key` e só reconhece ids da própria pauta. `useAutosave` é uma fila serial: uma escrita por vez, sempre com o retrato mais recente | `tests/api/sheet.test.ts` (dois saves criando blocos; id de outra pauta ignorado) + `tests/e2e/sheet.spec.ts` passando duas vezes no mesmo banco | `replaceSheet` é uma transação; nenhuma gravação parcial |
| failure/retry | RULE-pauta-revelavel-11, BR-pauta-revelavel-14, AC-pauta-revelavel-09, AC-pauta-revelavel-55 | Revelar e ocultar mudam o estado local primeiro. Um `PUT` que falha mostra o aviso do AC-pauta-revelavel-09 e tenta de novo a cada 5 s com o retrato mais recente. A tela nunca volta atrás | `page.route` abortando o `PUT` em `tests/e2e/sheet.spec.ts` e `tests/e2e/reveal.spec.ts` | A próxima tentativa grava o estado inteiro |
| validation (SEC-SBD-01) | `PUT /api/rundowns/:id/sheet` recebe texto livre, níveis, tamanhos e caminhos; o parser tem `express.json({ limit: '1mb' })` (`server/src/app.ts`) | `validateSheet` responde 422 antes de qualquer escrita para: tipo fora da lista, árvore inválida, `fontPx` fora da faixa, mais de 1000 blocos, mais de 10000 caracteres por bloco ou nome de mídia com mais de 255 caracteres. Marcação fora da lista é descartada | Casos negativos em `tests/api/sheet.test.ts` | Um 422 não grava nada |
| upload (SEC-SBD-02) | `storeUpload` confere assinatura e 512 MB, mas aceita pdf/txt/md/json/csv, que a folha não usa | A lista se reduz às 11 extensões do AC-pauta-revelavel-20 (mais `.jpeg`), vindas de `shared/media.ts`. O cliente classifica antes de enviar; o servidor continua sendo a autoridade | `tests/api/media.test.ts`: extensão forjada e pdf recusados; mp3, wav, m4v e mkv aceitos | Sem migração; arquivos antigos continuam servidos por `GET /api/media/*` |
| external URL (SEC-SBD-06, AC-pauta-revelavel-56) | URL colada vira texto (F12); anexos antigos usam YouTube e imagem por URL; `server/src/services/openUrl.ts` abre URL no navegador do sistema | `media_path` só aceita caminho relativo dentro da pasta de mídia. Na conversão, anexo ou imagem de ponto com URL vira bloco de texto com a URL. `openUrl` sai na Fase 6 | `tests/api/sheet.test.ts` (`https://…` e `../` recusados), `tests/api/legacyImport.test.ts`, log de rede em `tests/e2e/platform.spec.ts` | Sem estado persistente novo |
| capture privacy | RULE-pauta-revelavel-01, AC-pauta-revelavel-27 | Com o preparo desligado, `SheetColumn` não monta o bloco oculto (nem espaço nem foco), e todo editável tem `spellCheck={false}` | `tests/e2e/reveal.spec.ts` (ausência no DOM e na árvore de acessibilidade) + captura com OBS pelo @qa | Sem estado persistente |
| compatibility (Play) | `tests/api/platform.test.ts` compara `API_ENDPOINTS` com `registeredApiRoutes()`; regra 7 do CLAUDE.md | Toda rota criada ou retirada atualiza `server/src/http/apiCatalog.ts` na mesma fase. As portas seguem `PORT`/`BACKEND_PORT` | `pnpm vitest run tests/api/platform.test.ts` nas Fases 1 e 6 | Reverter a rota e a entrada do catálogo juntas |

## Implementation Delta

| CAP | Action | Existing evidence | Exact paths | Required change |
|---|---|---|---|---|
| CAP-pauta-revelavel-pautas | modify | `listRundowns` ordena por `pinned DESC, last_opened_at DESC` e resume blocos, resgates, minutos e execuções das tabelas antigas | server/src/repositories/rundownRepository.ts | F1: o resumo ganha `blockCount`, `initiallyVisibleCount` e `legacyImported` e a ordem desempata por `created_at`. `duplicateRundown` copia `sheet_blocks` com a tomada zerada, herda `last_opened_at` da origem (a cópia fica logo abaixo) e para de copiar blocos, pontos e anexos antigos. F6: tira do resumo os campos de execução, resgate e minutos |
| CAP-pauta-revelavel-pautas | modify | `remove` só apaga a linha; `getRundownWithBlocks` lê `listBlocks` antigo | server/src/services/rundownService.ts | F1: `remove` coleta os caminhos de mídia, apaga a pauta e chama `removeUnreferencedMedia`. F6: retira `getRundownWithBlocks` e o import de `blockRepository` |
| CAP-pauta-revelavel-pautas | modify | `GET /rundowns/:id` devolve os blocos antigos | server/src/routes/rundowns.ts | F1: rotas finas `GET /rundowns/:id/sheet` e `PUT /rundowns/:id/sheet` chamando `sheetService`. F6: retira `GET /rundowns/:id` |
| CAP-pauta-revelavel-pautas | create | Nenhuma consulta de referência de mídia existe (inspecionados `attachmentRepository.ts`, `beatRepository.ts` e `preferenceRepository.ts`) | server/src/repositories/mediaReferenceRepository.ts | `isMediaReferenced(db, path)` com consultas parametrizadas em `sheet_blocks.media_path`, `attachments.path`, `beats.image_path` e na preferência `background` de `kind: 'image'` |
| CAP-pauta-revelavel-pautas | modify | Mensagem de título vazio "Dê um título à pauta." | shared/validation/rundown.ts | Troca pela mensagem do AC-pauta-revelavel-02. `date` e `kind` continuam opcionais na API e saem da interface |
| CAP-pauta-revelavel-pautas | modify | A lista mostra minutos, tipo e execução, e abrir leva à Bancada via `useWorkspace` | src/features/rundowns/RundownListPage.tsx | Linhas por id persistido com o resumo do AC-pauta-revelavel-06, selo e fixar. Abrir e criar navegam para `#/rundown/:id`. Renomear e apagar pelo `Modal`, como pedem AC-pauta-revelavel-03 e AC-pauta-revelavel-05. Sem `src/core/store.ts` |
| CAP-pauta-revelavel-pautas | modify | O formulário pede título, data e `kind` | src/features/rundowns/RundownForm.tsx | Um campo, "Nome da pauta", com `noValidate` e erro inline do 422 com `aria-invalid` |
| CAP-pauta-revelavel-pautas | modify | `formatBrDate`, `formatMinutes` e `daysSince` | src/features/rundowns/format.ts | "editada há…" a partir de `updatedAt`; remove o que a lista deixa de usar |
| CAP-pauta-revelavel-pautas | modify | Estilos da lista antiga | src/features/rundowns/rundowns.css | Lista do protótipo `#/pautas` (populada, vazia, migrada), com alvos de pelo menos 44 px |
| CAP-pauta-revelavel-pautas | modify | Títulos em pt-BR e campos antigos | tests/api/rundowns.test.ts | AC-pauta-revelavel-02 (nome vazio recusado no servidor), AC-pauta-revelavel-04 (cópia completa, tomada zerada, logo abaixo), AC-pauta-revelavel-05 (mídia exclusiva apagada, compartilhada preservada) e AC-pauta-revelavel-06 (contagens), com títulos em inglês |
| CAP-pauta-revelavel-pautas | modify | `createRundown` usa "Título da live" e espera `#/board/`; `createBlock` e `goLive` dirigem a Bancada | tests/e2e/helpers.ts | `createRundown` passa pelo modal novo e espera `#/rundown/`; os helpers de Bancada e Palco saem |
| CAP-pauta-revelavel-pautas | modify | Spec da lista antiga | tests/e2e/rundowns.spec.ts | AC-pauta-revelavel-01 a AC-pauta-revelavel-06 e AC-pauta-revelavel-57 dirigindo o formulário real: criar, renomear uma linha específica, duplicar, apagar (Cancelar, Esc, confirmar), reabrir pela mais recente com outra fixada, pauta inexistente → lista, servidor fora do ar → "Tentar de novo" |
| CAP-pauta-revelavel-pautas | reuse | Carregamento, erro e vazio já existem | src/ui/LoadingSkeleton.tsx, src/ui/ErrorBanner.tsx | Estados de carregamento, erro e vazio da lista e da folha |
| CAP-pauta-revelavel-pautas | retire | A clave do estado vazio antigo não está no protótipo `#/pautas` (desvio da Fase 1, registrado no dossiê) | src/features/rundowns/EmptyStaffMark.tsx | Removido (F1) |
| CAP-pauta-revelavel-pautas | reuse | Servidor de teste real e fixture de tour visto | tests/helpers/testServer.ts, tests/e2e/fixtures.ts | Base das suítes novas |
| CAP-pauta-revelavel-coluna | create | Nenhuma tabela de folha em `server/src/db/schema.sql`; nenhum repositório equivalente | server/src/repositories/sheetRepository.ts | `listSheetBlocks`; `replaceSheet` numa transação (reconhece só ids da pauta, gera id para `key` nova, apaga os ausentes, posição = índice); `copySheet` com a tomada zerada; `listSheetMediaPaths` |
| CAP-pauta-revelavel-coluna | create | Não há serviço de folha; `blockService.ts` é do modelo de live | server/src/services/sheetService.ts | F1: `getSheet` (404 para pauta inexistente) e `saveSheet` (valida, grava, toca `updated_at` e devolve `{ rundown, blocks, ids, savedAt }`). F4: marca `mediaMissing` conferindo o arquivo com `resolveInsideMedia` |
| CAP-pauta-revelavel-coluna | create | Padrão `shared/validation/beat.ts` + `result.ts` | shared/validation/sheet.ts | `validateSheet`: RULE-04 (árvore), RULE-05 (via `blockSize`), RULE-06 (via `textMarks`), RULE-07 (via `shared/media.ts`) e os limites SEC-SBD-01 de Engineering Controls |
| CAP-pauta-revelavel-coluna | modify | Só existem `Block`, `Beat`, `Attachment` e `Preferences { tourSeen }` | shared/types.ts | F1: `SheetBlock`, `SheetBlockKind`, `BlockSize`, `TextRun`, `TextColor` e o resumo novo. F4: `mediaMissing`. F5: `THEME_IDS`, `GRADIENT_IDS`, `Background` e `Preferences` de aparência. F6: remove os tipos de live |
| CAP-pauta-revelavel-coluna | modify | Abre `rundowns[0]` e monta Topbar, Bancada, Palco, Acervo, Relatório e `GuideLayer` | src/App.tsx | F1: o boot abre a pauta de maior `lastOpenedAt`, a rota `rundown` não tem Topbar, qualquer outra rota leva à lista e `GuideLayer` sai de cena. F5: aplica a aparência antes do primeiro render pronto. F6: monta o tour novo |
| CAP-pauta-revelavel-coluna | modify | `RouteName` = rundowns, board, stage, library, report | src/core/router.ts | Só `rundowns` e `rundown`, com `routes.rundown(id)`; nomes antigos não casam |
| CAP-pauta-revelavel-coluna | modify | Vocabulário de live; `FORBIDDEN_TERMS` inclui `item` | src/core/vocabulary.ts | Textos da folha fase a fase. O vocabulário de live sai, e "sub-itens" passa a ser permitido |
| CAP-pauta-revelavel-coluna | modify | `Modal` foca o primeiro controle, mas não prende o Tab | src/ui/Modal.tsx | Prende o foco e devolve o foco a quem abriu (AC-pauta-revelavel-53) |
| CAP-pauta-revelavel-coluna | modify | Tokens Tinta & Ouro fixos e mapa tipo→metal | src/ui/tokens.css | F1: tokens da folha de `identity.md` (pauta de 44 px, escala de conteúdo, 6 cores do tema padrão) e o mapa tipo→metal sai. F5: as cores viram variáveis escritas por `applyAppearance` |
| CAP-pauta-revelavel-coluna | modify | `#topbar`, navegação e grão | src/ui/chrome.css | Tira a barra de navegação; fica a base de página |
| CAP-pauta-revelavel-coluna | create | Nenhuma rota de folha em `src/core/router.ts`; o protótipo `#/pauta/:id` é o contrato visual | src/features/sheet/SheetPage.tsx | F1: carrega pela store; 404 → lista; erro com "Tentar de novo". F3: modal de nova tomada |
| CAP-pauta-revelavel-coluna | create | Inspecionado `src/features/stage/StagePage.tsx` e `src/App.tsx` (Topbar): nenhuma régua de folha | src/features/sheet/SheetRuler.tsx | F1: nome editável, "N de M na tela" e estado de salvamento. F3: Ocultar último, Revelar próximo, Preparo, Nova tomada e a faixa de preparo. F5: Aparência. F6: Como usar e as âncoras `data-aioson-tour` |
| CAP-pauta-revelavel-coluna | create | Inspecionado `src/features/board/TrackCanvas.tsx`: compõe em pistas, não numa coluna capturável | src/features/sheet/SheetColumn.tsx | F1: folha pautada, blocos com chave `key`, "Folha em branco." e a área "Clique para escrever…". F2: `@dnd-kit` sortable movendo a subárvore. F3: não monta o oculto fora do preparo; recolher no preparo. F4: colar fora da edição, soltar e a faixa "Solte para criar blocos aqui" |
| CAP-pauta-revelavel-coluna | create | Inspecionado `src/features/board/BlockCard.tsx`: cartão que abre gaveta, sem edição no lugar | src/features/sheet/SheetBlock.tsx | F1: invólucro do bloco; a mídia convertida aparece como prévia estática. F2: alça, lixeira, marcador •/◦ e linha-guia. F3: olho, "começa oculto/visível", hachura e animação de tinta. F4: `MediaBlock`. F5: barras de tamanho e formatação no foco e no hover |
| CAP-pauta-revelavel-coluna | create | Inspecionado `src/features/board/BlockDrawer.tsx`: edição por formulário em modal; nenhum `contenteditable` em `src/` | src/features/sheet/TextBlockEditor.tsx | F1: `contenteditable` com `spellCheck={false}`; Enter quebra linha, Enter duas vezes cria bloco, Backspace no bloco vazio apaga, Esc sai. F2: Tab, Shift+Tab, Alt+←/→ e o primeiro sub-item. F3: atalhos de revelar sem inserir texto. F4: colar no cursor. F5: marcas no trecho e Ctrl+B |
| CAP-pauta-revelavel-coluna | create | Nenhum mapeamento de DOM para texto em `src/` (busca por `Selection`/`Range` sem ocorrência) | src/features/sheet/domText.ts | DOM ↔ `TextRun[]`, deslocamento de cursor e de seleção em texto plano |
| CAP-pauta-revelavel-coluna | create | `src/core/store.ts` (zustand) é do modelo de live | src/features/sheet/sheetStore.ts | F1: pauta e blocos com `key`, edição e `ids` vindos do servidor. F2: operações de árvore e snapshot para "Desfazer". F3: revelar, ocultar, olho, preparo, nova tomada e planejado. F4: blocos de mídia pendentes e de falha (só no cliente). F5: tamanho, ajuste e marcas |
| CAP-pauta-revelavel-coluna | create | Nenhum salvamento automático existe | src/features/sheet/useAutosave.ts | Fila serial com debounce na digitação e envio imediato no revelar; estados "Salvando", "Salvo às HH:MM" e falha com nova tentativa em 5 s |
| CAP-pauta-revelavel-coluna | create | `src/features/stage/useStageShortcuts.ts` só funciona dentro do Palco e sai na Fase 1 | src/features/sheet/useSheetShortcuts.ts | F2: Alt+↑/↓, Delete e Tab com o bloco selecionado. F3: PgDn, PgUp, Shift+PgDn e F2 com captura. F4: Ctrl+Enter. F5: Ctrl+Alt+1–4 e Ctrl+Alt+−/= |
| CAP-pauta-revelavel-coluna | create | Inspecionado `src/features/board/board.css` e `src/features/stage/stage.css`: estilos das superfícies que saem | src/features/sheet/sheet.css | A composição do protótipo, fase a fase, com quebra de linha em 360 px |
| CAP-pauta-revelavel-coluna | create | Nenhum teste de folha | tests/api/sheet.test.ts | F1: ida e volta de conteúdo, ordem, níveis, tamanhos, ajustes, marcas, planejado e progresso; ids gerados no servidor; negativos SEC-SBD-01; árvore inválida, `../` e `https://` recusados. F4: `mediaMissing` |
| CAP-pauta-revelavel-coluna | create | Inspecionado `tests/e2e/`: os specs cobrem Bancada e Palco | tests/e2e/sheet.spec.ts | AC-pauta-revelavel-07 a AC-pauta-revelavel-11, AC-pauta-revelavel-53, AC-pauta-revelavel-54 e AC-pauta-revelavel-57; reinício; falha de `PUT` com nova tentativa; `localStorage` vazio |
| CAP-pauta-revelavel-coluna | create | Não há passeio da aplicação real | .aioson/qa/walkthroughs/pauta-revelavel/write-and-save.json | Passeio da Fase 1 no formato de `.aioson/briefings/pauta-revelavel/walkthrough.json` |
| CAP-pauta-revelavel-entrada | create | As extensões e o teto estão presos ao servidor em `mediaService.ts` | shared/media.ts | Extensões aceitas → `image`/`video`/`audio`, `MAX_MEDIA_BYTES` e `isWebUrl`, compartilhados por validação, conversão, servidor e cliente |
| CAP-pauta-revelavel-entrada | modify | `SIGNATURES` aceita pdf e textos; nenhuma remoção de arquivo | server/src/services/mediaService.ts | F1: `removeUnreferencedMedia(paths, isReferenced)`. F4: lista e teto vindos de `shared/media.ts` |
| CAP-pauta-revelavel-entrada | reuse | `POST /api/media` em streaming e `GET /api/media/*` com `acceptRanges` | server/src/routes/media.ts | Gravação e reprodução da mídia |
| CAP-pauta-revelavel-entrada | modify | `request` usa `fetch`, que não reporta progresso de envio | src/core/api.ts | `uploadMedia(file, onProgress)` via `XMLHttpRequest` com o cabeçalho `x-clave-filename` e erro tipado (`unsupported_media`, `media_too_large`, `media_signature_mismatch`) |
| CAP-pauta-revelavel-entrada | create | Nenhum `onPaste` ou `clipboardData` em `src/` | src/features/sheet/paste.ts | Divide por linha em branco (CRLF igual), detecta lista (`-`, `*`, `•`, `1.`, tab, espaços) e dá níveis pela ordem dos recuos (até 3), URL vira texto, fica só `text/plain` |
| CAP-pauta-revelavel-entrada | create | Inspecionado `src/features/board/AttachmentFields.tsx`: arquivo entra por campo de formulário, sem classificar nem mostrar progresso | src/features/sheet/mediaIntake.ts | Classifica arquivos (aceito, formato não suportado, grande demais), cria o bloco pendente com progresso, envia, trata "Tentar de novo" e "Procurar o arquivo" no mesmo lugar |
| CAP-pauta-revelavel-entrada | create | Inspecionado `tests/unit/`: nenhum teste de colagem | tests/unit/paste.test.ts | AC-pauta-revelavel-13, AC-pauta-revelavel-15 e AC-pauta-revelavel-19 |
| CAP-pauta-revelavel-entrada | modify | Os casos atuais aceitam pdf e têm títulos em pt-BR | tests/api/media.test.ts | AC-pauta-revelavel-20: lista aceita, pdf recusado, assinatura divergente recusada; AC-pauta-revelavel-16: o arquivo gravado é servido de volta; títulos em inglês |
| CAP-pauta-revelavel-entrada | create | Inspecionado `tests/e2e/attachments.spec.ts`: mídia entra só por formulário | tests/e2e/paste.spec.ts | AC-pauta-revelavel-13, AC-pauta-revelavel-14, AC-pauta-revelavel-15 e AC-pauta-revelavel-19 por eventos de colagem reais |
| CAP-pauta-revelavel-revelar | create | `src/features/stage/beats.ts` só tem `done`, sem planejado | shared/reveal.ts | `isShown` (com ancestrais), `revealNext`, `revealNextTopic`, `hideLast`, `toggleEye`, `newTake`, `countShown` e `plannedCounts` |
| CAP-pauta-revelavel-revelar | modify | Movimentos curtos com `prefers-reduced-motion` | src/ui/motion.css | "Tinta assentando" só no conteúdo do bloco, sem animação em movimento reduzido |
| CAP-pauta-revelavel-revelar | create | Inspecionado `tests/unit/beats.test.ts`: cobre `done`, não planejado × progresso | tests/unit/reveal.test.ts | AC-pauta-revelavel-21 e AC-pauta-revelavel-31 (RULE-02, RULE-03) |
| CAP-pauta-revelavel-revelar | create | Inspecionado `tests/e2e/stage.spec.ts`: revela pontos só no Palco | tests/e2e/reveal.spec.ts | AC-pauta-revelavel-10 (próxima tomada), AC-pauta-revelavel-22 a AC-pauta-revelavel-30, AC-pauta-revelavel-32, AC-pauta-revelavel-43, AC-pauta-revelavel-52 e AC-pauta-revelavel-55 |
| CAP-pauta-revelavel-revelar | create | Inspecionado `.aioson/briefings/pauta-revelavel/walkthrough.json`: passeio do protótipo, não da aplicação | .aioson/qa/walkthroughs/pauta-revelavel/reveal-and-take.json | Passeio da Fase 3 |
| CAP-pauta-revelavel-midia | create | `AttachmentViewer.tsx` abre mídia só no Palco e não tem áudio | src/features/sheet/MediaBlock.tsx | Imagem, vídeo e áudio parados; tocar e pausar pelo botão e por Ctrl+Enter; ocultar pausa; "Gravando…" com progresso; "Arquivo não encontrado" com Procurar e Remover; os três estados de falha |
| CAP-pauta-revelavel-midia | create | Inspecionado `tests/e2e/attachments.spec.ts`: mídia no Palco, sem áudio nem colagem | tests/e2e/media.spec.ts | AC-pauta-revelavel-16, AC-pauta-revelavel-17, AC-pauta-revelavel-18, AC-pauta-revelavel-33, AC-pauta-revelavel-34 e AC-pauta-revelavel-45 (bloco de falha sem confirmação) |
| CAP-pauta-revelavel-midia | create | Inspecionado `.aioson/briefings/pauta-revelavel/walkthrough.json`: passeio do protótipo, não da aplicação | .aioson/qa/walkthroughs/pauta-revelavel/paste-and-media.json | Passeio da Fase 4 |
| CAP-pauta-revelavel-formatacao | create | `Block.title` e `Beat.text` são texto simples | shared/blockSize.ts | Padrões, faixas, passo de 4 px, `stepSize(±1)` no recuo e `clampFontPx` (RULE-05) |
| CAP-pauta-revelavel-formatacao | create | Nenhum modelo de marcas | shared/textMarks.ts | `sanitizeRuns` (fica só negrito, as 6 cores e `\n`), `runsFromPlainText`, `plainText`, `applyMark` e `clearMarks` por deslocamento |
| CAP-pauta-revelavel-formatacao | create | Inspecionado `tests/unit/`: nenhum teste de tamanho ou marcas | tests/unit/blockSize.test.ts, tests/unit/textMarks.test.ts | RULE-05; AC-pauta-revelavel-39 com HTML colado, marcas desconhecidas e cores fora da lista |
| CAP-pauta-revelavel-formatacao | create | Inspecionado `src/features/`: nenhum controle de tamanho de texto | src/features/sheet/SizeBar.tsx | P, M, G e Título; A− e A+ com o valor em px, desativados no limite (F21) |
| CAP-pauta-revelavel-formatacao | create | Inspecionado `src/features/`: nenhum controle de formatação de trecho | src/features/sheet/FormatBar.tsx | Negrito, as 6 cores e Normal sobre a seleção |
| CAP-pauta-revelavel-formatacao | create | Inspecionado `src/ui/tokens.css`: uma paleta fixa, sem teste de contraste | tests/unit/themes.test.ts | AC-pauta-revelavel-38: as 6 cores atingem ≥ 4,5:1 sobre a folha em cada um dos 5 temas |
| CAP-pauta-revelavel-formatacao | create | Inspecionado `tests/e2e/`: nenhum spec de formatação | tests/e2e/formatting.spec.ts | AC-pauta-revelavel-35, AC-pauta-revelavel-36, AC-pauta-revelavel-37, AC-pauta-revelavel-54 (barras quebram em 360 px) e a persistência depois de recarregar |
| CAP-pauta-revelavel-subitens | create | A regra de árvore existe só para pontos (`shared/validation/beat.ts`) | shared/sheetTree.ts | `subtreeRange`, `indent`/`outdent` levando a subárvore e mudando o tamanho, `canIndent` (BR-08), `moveSubtree` (↑/↓ e índice de arraste), `removeAndPromote` e `normalizeDepths` |
| CAP-pauta-revelavel-subitens | create | Inspecionado `tests/unit/track.test.ts`: cobre o trilho de live, não a árvore | tests/unit/sheetTree.test.ts | AC-pauta-revelavel-42 (unit) e RULE-04 depois de mover, apagar e colar |
| CAP-pauta-revelavel-subitens | create | Inspecionado `tests/e2e/board.spec.ts`: sub-pontos só dentro da gaveta | tests/e2e/subitems.spec.ts | AC-pauta-revelavel-11 (sub-item), AC-pauta-revelavel-40, AC-pauta-revelavel-41 e AC-pauta-revelavel-42 |
| CAP-pauta-revelavel-organizar | reuse | `@dnd-kit/core`, `@dnd-kit/sortable` e `@dnd-kit/utilities` já instalados | package.json | Arraste sem dependência nova |
| CAP-pauta-revelavel-organizar | reuse | O toast já aceita ação | src/ui/Toast.tsx | "Desfazer" (D1) e as recusas do Tab |
| CAP-pauta-revelavel-organizar | create | Inspecionado `tests/e2e/board.spec.ts`: arraste entre pistas da Bancada, que sai | tests/e2e/organize.spec.ts | AC-pauta-revelavel-44 (arraste real, recarregar, Desfazer, teclado com região ao vivo, toque na alça) e AC-pauta-revelavel-45 (confirmar, Cancelar, Esc) |
| CAP-pauta-revelavel-organizar | create | Inspecionado `.aioson/briefings/pauta-revelavel/walkthrough.json`: passeio do protótipo, não da aplicação | .aioson/qa/walkthroughs/pauta-revelavel/subitems-and-order.json | Passeio da Fase 2 |
| CAP-pauta-revelavel-aparencia | create | Identidade fixa em `tokens.css`; nenhum painel de aparência | src/features/appearance/AppearancePanel.tsx | 5 temas, destaque livre com aviso abaixo de 4,5:1 e "Usar a do tema", fundo (tema, cor, 3 gradientes, imagem enviada pela pasta de mídia) e véu da folha |
| CAP-pauta-revelavel-aparencia | create | Inspecionado `src/ui/tokens.css` e `.aioson/briefings/pauta-revelavel/identity.md`: paletas só na identidade | src/features/appearance/themes.ts | Paletas dos 5 temas, 6 cores de texto por tema e 3 gradientes, conforme `identity.md` (fonte única) |
| CAP-pauta-revelavel-aparencia | create | Inspecionado `src/main.tsx`: tokens só por CSS estático | src/features/appearance/applyAppearance.ts | Escreve as variáveis CSS e `data-theme` no `:root` a partir das preferências |
| CAP-pauta-revelavel-aparencia | create | Nenhum cálculo de contraste em `src/` ou `shared/` | src/features/appearance/contrast.ts | Razão de contraste WCAG |
| CAP-pauta-revelavel-aparencia | create | Inspecionado `src/ui/`: nenhum painel equivalente | src/features/appearance/appearance.css | Composição do painel do protótipo |
| CAP-pauta-revelavel-aparencia | modify | `DEFAULTS = { tourSeen: false }`, valores gravados como texto | server/src/repositories/preferenceRepository.ts | Lê e grava `theme`, `accent` e `background` (JSON) com os padrões do tema Tinta & Ouro |
| CAP-pauta-revelavel-aparencia | modify | Valida só `tourSeen` | server/src/services/preferenceService.ts | Valida tema na lista, destaque `#RRGGBB` ou nulo, e fundo por `kind` (a imagem precisa ser caminho relativo na pasta de mídia) |
| CAP-pauta-revelavel-aparencia | reuse | `GET/PUT /api/preferences` | server/src/routes/preferences.ts | Mesma rota |
| CAP-pauta-revelavel-aparencia | modify | Casos de `tourSeen` com títulos em pt-BR | tests/api/preferences.test.ts | AC-pauta-revelavel-46 (persiste e recusa tipo errado), com títulos em inglês |
| CAP-pauta-revelavel-aparencia | create | Inspecionado `tests/e2e/`: nenhum spec de aparência | tests/e2e/appearance.spec.ts | AC-pauta-revelavel-46 (aplica na hora, vale em outra pauta, sobrevive ao reinício) |
| CAP-pauta-revelavel-aparencia | create | Inspecionado `.aioson/briefings/pauta-revelavel/walkthrough.json`: passeio do protótipo, não da aplicação | .aioson/qa/walkthroughs/pauta-revelavel/format-and-appearance.json | Passeio da Fase 5 |
| CAP-pauta-revelavel-migracao | modify | Migrações até a v5; `EXPECTED_TABLES` sem a folha | server/src/db/migrations.ts | v6 `revealable-sheet` (tabela, coluna e conversão na mesma transação) e `sheet_blocks` em `EXPECTED_TABLES` |
| CAP-pauta-revelavel-migracao | create | Nenhuma conversão existe | server/src/db/legacySheetImport.ts | Lê blocos, pontos e anexos antigos com SQL parametrizado e grava `sheet_blocks` como manda o AC-pauta-revelavel-47. A web vira texto; tudo nasce "começa oculto"; marca `legacy_imported_at` |
| CAP-pauta-revelavel-migracao | create | Inspecionado `tests/api/persistence.test.ts`: confere tabelas, não conversão | tests/api/legacyImport.test.ts | AC-pauta-revelavel-47 com um banco v5 de fixture (trilho, resgate, sub-pontos, imagem de ponto e os 6 tipos de anexo, incluindo URL) e AC-pauta-revelavel-48 (WAL no `.bak`, duas execuções, tabelas antigas) |
| CAP-pauta-revelavel-migracao | reuse | `checkpoint()` + cópia `.bak` | server/src/db/database.ts, tests/api/persistence.test.ts | Backup consistente; `EXPECTED_TABLES` conferido |
| CAP-pauta-revelavel-migracao | modify | O teste varre o vocabulário de live | tests/unit/vocabulary.test.ts | AC-pauta-revelavel-49 sobre `src/core/vocabulary.ts`, com títulos em inglês |
| CAP-pauta-revelavel-migracao | modify | O spec usa `createBlock` e `goLive` | tests/e2e/vocabulary.spec.ts | AC-pauta-revelavel-12 (rotas antigas → lista) e AC-pauta-revelavel-49 nas telas novas |
| CAP-pauta-revelavel-migracao | retire | Bancada substituída pela folha | src/features/board/AttachmentFields.tsx, src/features/board/BeatFields.tsx, src/features/board/BlockCard.tsx, src/features/board/BlockDrawer.tsx, src/features/board/BoardPage.tsx, src/features/board/TrackCanvas.tsx, src/features/board/board.css | Remover (F1) |
| CAP-pauta-revelavel-migracao | retire | Palco substituído pela folha | src/features/stage/PrivateNote.tsx, src/features/stage/RescueDeck.tsx, src/features/stage/StageBeats.tsx, src/features/stage/StageCarousel.tsx, src/features/stage/StagePage.tsx, src/features/stage/StageTimers.tsx, src/features/stage/beats.ts, src/features/stage/rescue.ts, src/features/stage/slides.ts, src/features/stage/stage.css, src/features/stage/useRunClock.ts, src/features/stage/useStageShortcuts.ts | Remover (F1) |
| CAP-pauta-revelavel-migracao | retire | Relatório, Acervo, execução e anexos fora do produto | src/features/report/ReportPage.tsx, src/features/report/report.css, src/features/library/LibraryItemForm.tsx, src/features/library/LibraryPage.tsx, src/features/library/library.css, src/features/runs/GoLiveButton.tsx, src/features/runs/GoLiveGate.tsx, src/features/runs/OpenRunModal.tsx, src/features/attachments/AttachmentViewer.tsx, src/features/attachments/PrivatePanel.tsx, src/features/attachments/attachments.css, src/features/attachments/videoSource.ts, src/ui/typeColors.ts, src/core/store.ts, shared/time.ts | Remover (F1) |
| CAP-pauta-revelavel-migracao | retire | Specs das superfícies removidas | tests/e2e/attachments.spec.ts, tests/e2e/board.spec.ts, tests/e2e/library.spec.ts, tests/e2e/report.spec.ts, tests/e2e/rescue.spec.ts, tests/e2e/scenography.spec.ts, tests/e2e/stage.spec.ts, tests/e2e/persistence.spec.ts, tests/e2e/onboarding.spec.ts, tests/unit/beats.test.ts, tests/unit/rescue.test.ts, tests/unit/slides.test.ts, tests/unit/videoSource.test.ts, tests/unit/time.test.ts | Remover (F1); a cobertura passa para `sheet.spec.ts` e, na F6, `tour.spec.ts` |
| CAP-pauta-revelavel-migracao | retire | Rotas e serviços de live sem consumidor desde a F1 | server/src/routes/blocks.ts, server/src/routes/attachments.ts, server/src/routes/runs.ts, server/src/routes/library.ts, server/src/routes/openUrl.ts, server/src/services/blockService.ts, server/src/services/runService.ts, server/src/services/reportService.ts, server/src/services/libraryService.ts, server/src/services/openUrl.ts | Remover (F6) |
| CAP-pauta-revelavel-migracao | retire | Repositórios e domínio de live; as tabelas ficam no disco | server/src/repositories/blockRepository.ts, server/src/repositories/attachmentRepository.ts, server/src/repositories/beatRepository.ts, server/src/repositories/runRepository.ts, server/src/repositories/libraryRepository.ts, shared/track.ts, shared/validation/block.ts, shared/validation/attachment.ts, shared/validation/beat.ts, shared/validation/libraryItem.ts | Remover (F6) |
| CAP-pauta-revelavel-migracao | retire | Testes das rotas removidas | tests/api/blocks.test.ts, tests/api/runs.test.ts, tests/api/report.test.ts, tests/api/library.test.ts, tests/api/openUrl.test.ts, tests/unit/track.test.ts | Remover (F6) |
| CAP-pauta-revelavel-tour | modify | O tour lê `tourSeen`; o "Como usar" abre o guia completo do Clave | src/features/guide/GuideLayer.tsx | Primeira abertura → tour; "Como usar" reabre o tour; fechar grava `tourSeen` |
| CAP-pauta-revelavel-tour | modify | Holofote sobre alvos da Bancada | src/features/guide/TourOverlay.tsx | 5 passos sobre `data-aioson-tour`, Pular, Próximo e Começar, Esc e foco preso |
| CAP-pauta-revelavel-tour | modify | Conteúdo do Clave antigo | src/features/guide/guideContent.ts | Os 5 passos do protótipo: folha, revelar, colar e formatar, preparo, aparência |
| CAP-pauta-revelavel-tour | modify | Estilos do guia | src/features/guide/guide.css | Holofote do protótipo; o estilo do painel de guia sai |
| CAP-pauta-revelavel-tour | retire | Guia completo da live sem lugar no PRD | src/features/guide/GuidePanel.tsx | Remover (F6) |
| CAP-pauta-revelavel-tour | reuse | Negrito inline nos passos | src/features/guide/richText.tsx | Mantido |
| CAP-pauta-revelavel-tour | create | Inspecionado `tests/e2e/onboarding.spec.ts`: cobre o tour e o guia do Clave antigo, retirado na Fase 1 | tests/e2e/tour.spec.ts | AC-pauta-revelavel-50 (abre sozinho uma vez, Pular/Próximo/Começar, Esc, "Como usar" reabre, nada no `localStorage`) e AC-pauta-revelavel-08 com a régua completa |
| CAP-pauta-revelavel-tour | create | Inspecionado `.aioson/briefings/pauta-revelavel/walkthrough.json`: passeio do protótipo, não da aplicação | .aioson/qa/walkthroughs/pauta-revelavel/first-open.json | Passeio da Fase 6 |
| CAP-pauta-revelavel-play | create | Inspecionado `.aioson/plans/`: nenhum contrato de runtime para esta feature | .aioson/plans/pauta-revelavel/harness-contract.json | RG-build `pnpm build`; RG-migrate `pnpm exec tsx scripts/migrate-check.mjs`; RG-boot `node scripts/smoke-boot.mjs`; RG-smoke `pnpm playwright test` |
| CAP-pauta-revelavel-play | modify | O catálogo anuncia execução, relatório, acervo, blocos, pontos, anexos e open-url | server/src/http/apiCatalog.ts | F1: anuncia `GET/PUT /api/rundowns/:id/sheet`. F6: retira tudo que deixar de existir, inclusive `GET /api/rundowns/:id` |
| CAP-pauta-revelavel-play | modify | `API_ROUTERS` monta 9 routers | server/src/app.ts | F6: só `platformRoutes`, `rundownRoutes`, `mediaRoutes` e `preferenceRoutes` |
| CAP-pauta-revelavel-play | modify | Asserções AC-clave-41 a 43 em pt-BR | tests/api/platform.test.ts | AC-pauta-revelavel-51: portas por variável, catálogo igual às rotas, nenhuma rota de execução, relatório ou acervo; títulos em inglês |
| CAP-pauta-revelavel-play | modify | Espera `#topbar` e `#/(rundowns\|board)` | tests/e2e/platform.spec.ts | F1: a primeira tela é a lista ou a folha, sem login. F6: AC-pauta-revelavel-56, com todo request no mesmo host |
| CAP-pauta-revelavel-play | modify | Grava uma pauta e confere que ela sobrevive ao restart | scripts/smoke-boot.mjs | Também grava uma folha por `PUT` e confere conteúdo e progresso depois do restart |
| CAP-pauta-revelavel-play | reuse | Contrato do Play já cumprido | scripts/migrate-check.mjs, manifest.json, vite.config.ts, server/src/main.ts, src/ui/fonts.css, public/fonts/inter-variable.woff2, public/fonts/jetbrains-mono-variable.woff2 | Portas, migração e fontes locais sem mudança |

## Capability Delivery Plan

| CAP | Phase | Files | Verification |
|---|---|---|---|
| CAP-pauta-revelavel-pautas | 1, 6 | server/src/repositories/rundownRepository.ts, server/src/services/rundownService.ts, server/src/routes/rundowns.ts, server/src/repositories/mediaReferenceRepository.ts, shared/validation/rundown.ts, src/features/rundowns/RundownListPage.tsx, src/features/rundowns/RundownForm.tsx, src/features/rundowns/format.ts, src/features/rundowns/rundowns.css, tests/api/rundowns.test.ts, tests/e2e/helpers.ts, tests/e2e/rundowns.spec.ts, src/ui/LoadingSkeleton.tsx, src/ui/ErrorBanner.tsx, src/features/rundowns/EmptyStaffMark.tsx, tests/helpers/testServer.ts, tests/e2e/fixtures.ts | `pnpm vitest run tests/api/rundowns.test.ts` + `pnpm playwright test tests/e2e/rundowns.spec.ts` + passeio `write-and-save.json` no build servido |
| CAP-pauta-revelavel-coluna | 1, 2, 3, 4, 5, 6 | server/src/repositories/sheetRepository.ts, server/src/services/sheetService.ts, shared/validation/sheet.ts, shared/types.ts, src/App.tsx, src/core/router.ts, src/core/vocabulary.ts, src/ui/Modal.tsx, src/ui/tokens.css, src/ui/chrome.css, src/features/sheet/SheetPage.tsx, src/features/sheet/SheetRuler.tsx, src/features/sheet/SheetColumn.tsx, src/features/sheet/SheetBlock.tsx, src/features/sheet/TextBlockEditor.tsx, src/features/sheet/domText.ts, src/features/sheet/sheetStore.ts, src/features/sheet/useAutosave.ts, src/features/sheet/useSheetShortcuts.ts, src/features/sheet/sheet.css, tests/api/sheet.test.ts, tests/e2e/sheet.spec.ts, .aioson/qa/walkthroughs/pauta-revelavel/write-and-save.json | `pnpm vitest run tests/api/sheet.test.ts` + `pnpm playwright test tests/e2e/sheet.spec.ts` + `node scripts/smoke-boot.mjs` + passeio `write-and-save.json` |
| CAP-pauta-revelavel-entrada | 1, 4 | shared/media.ts, server/src/services/mediaService.ts, server/src/routes/media.ts, src/core/api.ts, src/features/sheet/paste.ts, src/features/sheet/mediaIntake.ts, tests/unit/paste.test.ts, tests/api/media.test.ts, tests/e2e/paste.spec.ts | `pnpm vitest run tests/unit/paste.test.ts tests/api/media.test.ts` + `pnpm playwright test tests/e2e/paste.spec.ts tests/e2e/media.spec.ts` + passeio `paste-and-media.json` |
| CAP-pauta-revelavel-revelar | 3 | shared/reveal.ts, src/ui/motion.css, tests/unit/reveal.test.ts, tests/e2e/reveal.spec.ts, .aioson/qa/walkthroughs/pauta-revelavel/reveal-and-take.json | `pnpm vitest run tests/unit/reveal.test.ts` + `pnpm playwright test tests/e2e/reveal.spec.ts` + passeio `reveal-and-take.json` + captura com OBS (@qa) |
| CAP-pauta-revelavel-midia | 4 | src/features/sheet/MediaBlock.tsx, tests/e2e/media.spec.ts, .aioson/qa/walkthroughs/pauta-revelavel/paste-and-media.json | `pnpm playwright test tests/e2e/media.spec.ts` + `pnpm vitest run tests/api/sheet.test.ts` + passeio `paste-and-media.json` |
| CAP-pauta-revelavel-formatacao | 1, 5 | shared/blockSize.ts, shared/textMarks.ts, tests/unit/blockSize.test.ts, tests/unit/textMarks.test.ts, src/features/sheet/SizeBar.tsx, src/features/sheet/FormatBar.tsx, tests/unit/themes.test.ts, tests/e2e/formatting.spec.ts | `pnpm vitest run tests/unit/blockSize.test.ts tests/unit/textMarks.test.ts tests/unit/themes.test.ts` + `pnpm playwright test tests/e2e/formatting.spec.ts` + passeio `format-and-appearance.json` |
| CAP-pauta-revelavel-subitens | 2, 3 | shared/sheetTree.ts, tests/unit/sheetTree.test.ts, tests/e2e/subitems.spec.ts | `pnpm vitest run tests/unit/sheetTree.test.ts tests/api/sheet.test.ts` + `pnpm playwright test tests/e2e/subitems.spec.ts tests/e2e/reveal.spec.ts` |
| CAP-pauta-revelavel-organizar | 2, 4 | package.json, src/ui/Toast.tsx, tests/e2e/organize.spec.ts, .aioson/qa/walkthroughs/pauta-revelavel/subitems-and-order.json | `pnpm playwright test tests/e2e/organize.spec.ts tests/e2e/media.spec.ts` + passeio `subitems-and-order.json` |
| CAP-pauta-revelavel-aparencia | 5 | src/features/appearance/AppearancePanel.tsx, src/features/appearance/themes.ts, src/features/appearance/applyAppearance.ts, src/features/appearance/contrast.ts, src/features/appearance/appearance.css, server/src/repositories/preferenceRepository.ts, server/src/services/preferenceService.ts, server/src/routes/preferences.ts, tests/api/preferences.test.ts, tests/e2e/appearance.spec.ts, .aioson/qa/walkthroughs/pauta-revelavel/format-and-appearance.json | `pnpm vitest run tests/api/preferences.test.ts tests/unit/themes.test.ts` + `pnpm playwright test tests/e2e/appearance.spec.ts` + passeio `format-and-appearance.json` |
| CAP-pauta-revelavel-migracao | 1, 6 | server/src/db/migrations.ts, server/src/db/legacySheetImport.ts, tests/api/legacyImport.test.ts, server/src/db/database.ts, tests/api/persistence.test.ts, tests/unit/vocabulary.test.ts, tests/e2e/vocabulary.spec.ts, src/features/board/AttachmentFields.tsx, src/features/board/BeatFields.tsx, src/features/board/BlockCard.tsx, src/features/board/BlockDrawer.tsx, src/features/board/BoardPage.tsx, src/features/board/TrackCanvas.tsx, src/features/board/board.css, src/features/stage/PrivateNote.tsx, src/features/stage/RescueDeck.tsx, src/features/stage/StageBeats.tsx, src/features/stage/StageCarousel.tsx, src/features/stage/StagePage.tsx, src/features/stage/StageTimers.tsx, src/features/stage/beats.ts, src/features/stage/rescue.ts, src/features/stage/slides.ts, src/features/stage/stage.css, src/features/stage/useRunClock.ts, src/features/stage/useStageShortcuts.ts, src/features/report/ReportPage.tsx, src/features/report/report.css, src/features/library/LibraryItemForm.tsx, src/features/library/LibraryPage.tsx, src/features/library/library.css, src/features/runs/GoLiveButton.tsx, src/features/runs/GoLiveGate.tsx, src/features/runs/OpenRunModal.tsx, src/features/attachments/AttachmentViewer.tsx, src/features/attachments/PrivatePanel.tsx, src/features/attachments/attachments.css, src/features/attachments/videoSource.ts, src/ui/typeColors.ts, src/core/store.ts, shared/time.ts, tests/e2e/attachments.spec.ts, tests/e2e/board.spec.ts, tests/e2e/library.spec.ts, tests/e2e/report.spec.ts, tests/e2e/rescue.spec.ts, tests/e2e/scenography.spec.ts, tests/e2e/stage.spec.ts, tests/e2e/persistence.spec.ts, tests/e2e/onboarding.spec.ts, tests/unit/beats.test.ts, tests/unit/rescue.test.ts, tests/unit/slides.test.ts, tests/unit/videoSource.test.ts, tests/unit/time.test.ts, server/src/routes/blocks.ts, server/src/routes/attachments.ts, server/src/routes/runs.ts, server/src/routes/library.ts, server/src/routes/openUrl.ts, server/src/services/blockService.ts, server/src/services/runService.ts, server/src/services/reportService.ts, server/src/services/libraryService.ts, server/src/services/openUrl.ts, server/src/repositories/blockRepository.ts, server/src/repositories/attachmentRepository.ts, server/src/repositories/beatRepository.ts, server/src/repositories/runRepository.ts, server/src/repositories/libraryRepository.ts, shared/track.ts, shared/validation/block.ts, shared/validation/attachment.ts, shared/validation/beat.ts, shared/validation/libraryItem.ts, tests/api/blocks.test.ts, tests/api/runs.test.ts, tests/api/report.test.ts, tests/api/library.test.ts, tests/api/openUrl.test.ts, tests/unit/track.test.ts | `pnpm vitest run tests/api/legacyImport.test.ts tests/api/persistence.test.ts tests/unit/vocabulary.test.ts` + `pnpm playwright test tests/e2e/vocabulary.spec.ts` + boot sobre a cópia de `data/` |
| CAP-pauta-revelavel-tour | 6 | src/features/guide/GuideLayer.tsx, src/features/guide/TourOverlay.tsx, src/features/guide/guideContent.ts, src/features/guide/guide.css, src/features/guide/GuidePanel.tsx, src/features/guide/richText.tsx, tests/e2e/tour.spec.ts, .aioson/qa/walkthroughs/pauta-revelavel/first-open.json | `pnpm playwright test tests/e2e/tour.spec.ts` + passeio `first-open.json` |
| CAP-pauta-revelavel-play | 1, 6 | .aioson/plans/pauta-revelavel/harness-contract.json, server/src/http/apiCatalog.ts, server/src/app.ts, tests/api/platform.test.ts, tests/e2e/platform.spec.ts, scripts/smoke-boot.mjs, scripts/migrate-check.mjs, manifest.json, vite.config.ts, server/src/main.ts, src/ui/fonts.css, public/fonts/inter-variable.woff2, public/fonts/jetbrains-mono-variable.woff2 | `pnpm vitest run tests/api/platform.test.ts` + `pnpm playwright test tests/e2e/platform.spec.ts` + `aioson harness:check . --feature=pauta-revelavel` + dev-link no Play |

## Phase 1 — Abrir o app cai na última pauta, numa folha única onde se escreve, que salva sozinha e já traz as pautas antigas

- CAP/AC: CAP-pauta-revelavel-pautas (AC-pauta-revelavel-01, AC-pauta-revelavel-02, AC-pauta-revelavel-03, AC-pauta-revelavel-04, AC-pauta-revelavel-05, AC-pauta-revelavel-06, AC-pauta-revelavel-57); CAP-pauta-revelavel-coluna (AC-pauta-revelavel-07, AC-pauta-revelavel-08 para nome, contador e salvamento, AC-pauta-revelavel-09, AC-pauta-revelavel-10 até "aparece na hora", AC-pauta-revelavel-11 sem sub-item, AC-pauta-revelavel-53, AC-pauta-revelavel-54); CAP-pauta-revelavel-formatacao (AC-pauta-revelavel-39); CAP-pauta-revelavel-entrada (base de RULE-07); CAP-pauta-revelavel-migracao (AC-pauta-revelavel-12, AC-pauta-revelavel-47, AC-pauta-revelavel-48, AC-pauta-revelavel-49); CAP-pauta-revelavel-play (contrato mantido).
- User-visible outcome: o app abre na pauta aberta por último, inclusive a antiga, convertida e com o selo. A pauta é uma folha só, onde se clica e escreve. Enter duas vezes abre o próximo bloco, e tudo volta igual depois de reiniciar. A régua mostra o nome editável, "N de M na tela" e o estado do salvamento. Bancada, Palco, Acervo, relatório e relógio não existem mais.
- Implementation:
  0. **Pré-condição (Engineering Controls, linha retirement).** A feature `clave` está encerrada (`abandoned`, 2026-11-11), e o trabalho em aberto dela precisa estar commitado. Spike R2 do PRD (questão 1), sem código: no webview do Play (dev-link), copiar um `.mp4` e um `.mp3` no Explorer e colar com um ouvinte `paste` mínimo no console. Registrar se `clipboardData.files` traz os arquivos com `aioson dossier:add-finding . --slug=pauta-revelavel --agent=dev --section="Code Map" --content="R2: ..."`. Não bloqueia: soltar (AC-pauta-revelavel-17) cobre.
  1. Servidor:
     - Migração v6 + `legacySheetImport.ts`. Sem nada no trilho, só os blocos de resgate vão para o fim.
     - `shared/blockSize.ts`, `shared/textMarks.ts`, `shared/media.ts` e `shared/validation/sheet.ts`.
     - `sheetRepository`, `sheetService`, as rotas `GET/PUT /api/rundowns/:id/sheet` e o catálogo.
     - Resumo, ordem, duplicar e apagar com limpeza de mídia: `rundownRepository`, `rundownService`, `mediaReferenceRepository` e `mediaService.removeUnreferencedMedia`.
  2. Cliente:
     - `router.ts` com `#/rundown/:id`.
     - Boot em `App.tsx` pela maior `lastOpenedAt`, com esqueleto, erro e pauta inexistente → lista.
     - Lista e formulário novos.
     - `sheetStore` + `useAutosave`; `SheetPage`, `SheetRuler`, `SheetColumn`, `SheetBlock`, `TextBlockEditor` e `domText` seguindo a composição de `#/pauta/:id` do protótipo.
     - Bloco novo nasce `plannedVisible=false` e `takeVisible=true` com o preparo desligado (BR-01).
     - A mídia convertida aparece como prévia estática até a Fase 4.
     - `Modal` com foco preso; tokens da folha; `GuideLayer` desmontado até a Fase 6.
  3. Retirar a interface de live e os specs dela (Implementation Delta, linhas F1 de CAP-migracao).
  4. Testes e `smoke-boot.mjs` gravando e relendo uma folha.
- Runtime contract: DEV grava `.aioson/plans/pauta-revelavel/harness-contract.json` com RG-build (`pnpm build`), RG-migrate (`pnpm exec tsx scripts/migrate-check.mjs`), RG-boot (`node scripts/smoke-boot.mjs`) e RG-smoke (`pnpm playwright test`) e roda `aioson harness:check . --feature=pauta-revelavel`; a Fase 6 roda de novo o mesmo contrato.
- Create/modify/reuse/retire:
  - create:
    - server/src/repositories/sheetRepository.ts, server/src/services/sheetService.ts, server/src/repositories/mediaReferenceRepository.ts, server/src/db/legacySheetImport.ts
    - shared/validation/sheet.ts, shared/blockSize.ts, shared/textMarks.ts, shared/media.ts
    - src/features/sheet/SheetPage.tsx, src/features/sheet/SheetRuler.tsx, src/features/sheet/SheetColumn.tsx, src/features/sheet/SheetBlock.tsx, src/features/sheet/TextBlockEditor.tsx, src/features/sheet/domText.ts, src/features/sheet/sheetStore.ts, src/features/sheet/useAutosave.ts, src/features/sheet/sheet.css
    - tests/api/sheet.test.ts, tests/api/legacyImport.test.ts, tests/unit/blockSize.test.ts, tests/unit/textMarks.test.ts, tests/e2e/sheet.spec.ts
    - .aioson/qa/walkthroughs/pauta-revelavel/write-and-save.json, .aioson/plans/pauta-revelavel/harness-contract.json
  - modify:
    - server/src/db/migrations.ts, server/src/repositories/rundownRepository.ts, server/src/services/rundownService.ts, server/src/routes/rundowns.ts, server/src/services/mediaService.ts, server/src/http/apiCatalog.ts
    - shared/types.ts, shared/validation/rundown.ts
    - src/App.tsx, src/core/router.ts, src/core/vocabulary.ts, src/ui/Modal.tsx, src/ui/tokens.css, src/ui/chrome.css
    - src/features/rundowns/RundownListPage.tsx, src/features/rundowns/RundownForm.tsx, src/features/rundowns/format.ts, src/features/rundowns/rundowns.css
    - tests/api/rundowns.test.ts, tests/e2e/helpers.ts, tests/e2e/rundowns.spec.ts, tests/e2e/vocabulary.spec.ts, tests/e2e/platform.spec.ts, tests/unit/vocabulary.test.ts
    - scripts/smoke-boot.mjs
  - reuse: src/ui/LoadingSkeleton.tsx, src/ui/ErrorBanner.tsx, tests/helpers/testServer.ts, tests/e2e/fixtures.ts, server/src/db/database.ts, tests/api/persistence.test.ts, scripts/migrate-check.mjs
  - retire:
    - src/features/board/AttachmentFields.tsx, src/features/board/BeatFields.tsx, src/features/board/BlockCard.tsx, src/features/board/BlockDrawer.tsx, src/features/board/BoardPage.tsx, src/features/board/TrackCanvas.tsx, src/features/board/board.css
    - src/features/stage/PrivateNote.tsx, src/features/stage/RescueDeck.tsx, src/features/stage/StageBeats.tsx, src/features/stage/StageCarousel.tsx, src/features/stage/StagePage.tsx, src/features/stage/StageTimers.tsx, src/features/stage/beats.ts, src/features/stage/rescue.ts, src/features/stage/slides.ts, src/features/stage/stage.css, src/features/stage/useRunClock.ts, src/features/stage/useStageShortcuts.ts
    - src/features/report/ReportPage.tsx, src/features/report/report.css, src/features/library/LibraryItemForm.tsx, src/features/library/LibraryPage.tsx, src/features/library/library.css, src/features/runs/GoLiveButton.tsx, src/features/runs/GoLiveGate.tsx, src/features/runs/OpenRunModal.tsx
    - src/features/attachments/AttachmentViewer.tsx, src/features/attachments/PrivatePanel.tsx, src/features/attachments/attachments.css, src/features/attachments/videoSource.ts, src/ui/typeColors.ts, src/core/store.ts, shared/time.ts, src/features/rundowns/EmptyStaffMark.tsx
    - tests/e2e/attachments.spec.ts, tests/e2e/board.spec.ts, tests/e2e/library.spec.ts, tests/e2e/report.spec.ts, tests/e2e/rescue.spec.ts, tests/e2e/scenography.spec.ts, tests/e2e/stage.spec.ts, tests/e2e/persistence.spec.ts, tests/e2e/onboarding.spec.ts
    - tests/unit/beats.test.ts, tests/unit/rescue.test.ts, tests/unit/slides.test.ts, tests/unit/videoSource.test.ts, tests/unit/time.test.ts
- Verification:
  - `pnpm vitest run tests/unit/blockSize.test.ts tests/unit/textMarks.test.ts tests/unit/vocabulary.test.ts tests/api/sheet.test.ts tests/api/legacyImport.test.ts tests/api/rundowns.test.ts tests/api/persistence.test.ts tests/api/platform.test.ts tests/api/media.test.ts`
  - `pnpm playwright test tests/e2e/sheet.spec.ts tests/e2e/rundowns.spec.ts tests/e2e/vocabulary.spec.ts tests/e2e/platform.spec.ts`
  - `pnpm build && pnpm exec tsx scripts/migrate-check.mjs && node scripts/smoke-boot.mjs && aioson harness:check . --feature=pauta-revelavel`
  - **Cópia do banco real:** copiar `data/clave.db`, `data/clave.db-wal`, `data/clave.db-shm` e `data/media/` para `test-results/real-copy/data/` e subir com `AIOSON_APP_DIR=test-results/real-copy`. A pauta antiga aparece com o selo, 2 blocos de imagem e 2 de texto com a URL, e `test-results/real-copy/data/clave.db.bak` contém as linhas pendentes do WAL. O app só abre o `data/` real depois disso.
- Runtime: `pnpm build && PORT=5280 BACKEND_PORT=3380 AIOSON_APP_DIR=test-results/prod-smoke pnpm start` (no PowerShell, definir as três variáveis com `$env:` antes), depois `aioson browser:run . --script=.aioson/qa/walkthroughs/pauta-revelavel/write-and-save.json --url=http://127.0.0.1:5280 --slug=pauta-revelavel`. Depois, abrir o app pelo dev-link do Play e confirmar que ele cai na última pauta.
- Done when: os comandos acima saem com código 0. No build servido e no Play, o app abre na pauta aberta por último, e o texto digitado em blocos volta igual depois de reiniciar o processo. A pauta real convertida aparece com o selo. Nenhuma tela, rota ou texto de Bancada, Palco, Acervo, relatório ou relógio existe.

## Phase 2 — Tab cria sub-itens, e mover ou apagar leva o tópico inteiro sem perder o controle

- CAP/AC: CAP-pauta-revelavel-subitens (AC-pauta-revelavel-40, AC-pauta-revelavel-41, AC-pauta-revelavel-42); CAP-pauta-revelavel-organizar (AC-pauta-revelavel-44, AC-pauta-revelavel-45 com confirmação); CAP-pauta-revelavel-coluna (AC-pauta-revelavel-11 com sub-item, AC-pauta-revelavel-53 para alça e lixeira).
- User-visible outcome: Tab e Shift+Tab (ou Alt+→/←) recuam e voltam o bloco com a subárvore, mostram • e ◦ com a linha-guia e mudam o tamanho; a recusa vem em toast. Arrastar pela alça ou usar Alt+↑/↓ move o tópico inteiro, a nova ordem sobrevive ao recarregar e "Desfazer" volta atrás. Apagar confirma no modal e avisa que os sub-itens sobem.
- Implementation:
  - `shared/sheetTree.ts` puro e as operações correspondentes no `sheetStore`.
  - Sortable do `@dnd-kit` (padrão de `TrackCanvas.tsx` no `HEAD`) com ids únicos por bloco e a subárvore movida no `onDragEnd`.
  - Toque na alça; anúncio do movimento por teclado em `aria-live`.
  - Toast com "Desfazer" (snapshot anterior, D1); `Modal` "Apagar bloco?".
  - A validação do servidor (Fase 1) continua recusando árvore inválida.
- Create/modify/reuse/retire:
  - create: shared/sheetTree.ts, src/features/sheet/useSheetShortcuts.ts, tests/unit/sheetTree.test.ts, tests/e2e/subitems.spec.ts, tests/e2e/organize.spec.ts, .aioson/qa/walkthroughs/pauta-revelavel/subitems-and-order.json
  - create (estende os arquivos criados na Fase 1): src/features/sheet/sheetStore.ts, src/features/sheet/SheetColumn.tsx, src/features/sheet/SheetBlock.tsx, src/features/sheet/TextBlockEditor.tsx, src/features/sheet/sheet.css
  - modify: src/core/vocabulary.ts
  - reuse: package.json, src/ui/Toast.tsx
- Verification:
  - `pnpm vitest run tests/unit/sheetTree.test.ts tests/api/sheet.test.ts`
  - `pnpm playwright test tests/e2e/subitems.spec.ts tests/e2e/organize.spec.ts tests/e2e/sheet.spec.ts`
- Runtime: build servido como na Fase 1, depois `aioson browser:run . --script=.aioson/qa/walkthroughs/pauta-revelavel/subitems-and-order.json --url=http://127.0.0.1:5280 --slug=pauta-revelavel`.
- Done when: depois de recuar, mover por arraste e por teclado, desfazer e apagar um tópico, a folha recarregada mostra exatamente a ordem e os níveis esperados, e o servidor recusa uma árvore inválida (422).

## Phase 3 — Cada bloco aparece só quando o apresentador manda, e cada tomada recomeça do planejado

- CAP/AC: CAP-pauta-revelavel-revelar (AC-pauta-revelavel-21, AC-pauta-revelavel-22, AC-pauta-revelavel-23, AC-pauta-revelavel-24, AC-pauta-revelavel-25, AC-pauta-revelavel-26, AC-pauta-revelavel-27, AC-pauta-revelavel-28, AC-pauta-revelavel-29, AC-pauta-revelavel-30, AC-pauta-revelavel-31, AC-pauta-revelavel-32, AC-pauta-revelavel-52, AC-pauta-revelavel-55); CAP-pauta-revelavel-subitens (AC-pauta-revelavel-43); CAP-pauta-revelavel-coluna (AC-pauta-revelavel-08 com os botões de revelar, ocultar, preparo e nova tomada; AC-pauta-revelavel-10 "some na próxima tomada"; AC-pauta-revelavel-53 para o olho).
- User-visible outcome:
  - PageDown e "Revelar próximo" mostram um bloco por vez, com a tinta assentando e a rolagem até ele. Shift+PageDown mostra o tópico inteiro, e PageUp desfaz o último passo.
  - O olho esconde ou mostra um bloco. F2 liga e desliga o preparo, com hachura, "começa oculto/visível" e recolher.
  - "Nova tomada" pede confirmação e volta ao planejado. O progresso sobrevive ao fechamento do app.
  - O oculto não existe na página, e revelar nunca espera o salvamento.
- Implementation:
  - `shared/reveal.ts` puro, chamado pelo `sheetStore` (estado local primeiro, `useAutosave` depois).
  - `SheetColumn` só monta o que `isShown` aprova quando o preparo está desligado.
  - Atalhos em fase de captura que funcionam dentro do texto sem inserir caractere.
  - Modal de nova tomada com plural correto, e toasts dos estados vazios e de fim.
  - `motion.css` com a variante de movimento reduzido.
- Create/modify/reuse/retire:
  - create: shared/reveal.ts, tests/unit/reveal.test.ts, tests/e2e/reveal.spec.ts, .aioson/qa/walkthroughs/pauta-revelavel/reveal-and-take.json
  - create (estende os arquivos criados nas fases anteriores): src/features/sheet/sheetStore.ts, src/features/sheet/SheetPage.tsx, src/features/sheet/SheetRuler.tsx, src/features/sheet/SheetColumn.tsx, src/features/sheet/SheetBlock.tsx, src/features/sheet/TextBlockEditor.tsx, src/features/sheet/useSheetShortcuts.ts, src/features/sheet/sheet.css
  - modify: src/ui/motion.css, src/core/vocabulary.ts
- Verification:
  - `pnpm vitest run tests/unit/reveal.test.ts tests/api/sheet.test.ts`
  - `pnpm playwright test tests/e2e/reveal.spec.ts tests/e2e/subitems.spec.ts tests/e2e/sheet.spec.ts`
  - O @qa grava a captura com OBS e confere quadro a quadro (métrica do PRD).
- Runtime: build servido como na Fase 1, depois `aioson browser:run . --script=.aioson/qa/walkthroughs/pauta-revelavel/reveal-and-take.json --url=http://127.0.0.1:5280 --slug=pauta-revelavel`.
- Done when: num roteiro de 10 blocos com sub-itens, PageDown, Shift+PageDown, PageUp, o olho, o preparo e a nova tomada produzem exatamente os blocos visíveis esperados. Nenhum bloco oculto aparece no DOM com o preparo desligado. O progresso volta igual depois de recarregar, e com o `PUT` falhando a tela não volta atrás.

## Phase 4 — Colar ou soltar texto, lista, imagem, vídeo e áudio vira bloco, e a mídia toca no comando

- CAP/AC: CAP-pauta-revelavel-entrada (AC-pauta-revelavel-13, AC-pauta-revelavel-14, AC-pauta-revelavel-15, AC-pauta-revelavel-16, AC-pauta-revelavel-17, AC-pauta-revelavel-18, AC-pauta-revelavel-19, AC-pauta-revelavel-20); CAP-pauta-revelavel-midia (AC-pauta-revelavel-33, AC-pauta-revelavel-34); CAP-pauta-revelavel-organizar (AC-pauta-revelavel-45, bloco de falha sem confirmação); CAP-pauta-revelavel-coluna (blocos de mídia na folha).
- User-visible outcome:
  - Ctrl+V de texto cria um bloco por parágrafo, ou insere no cursor; uma lista vira tópicos e sub-itens; uma URL vira texto.
  - Ctrl+V ou soltar de um print, imagem, vídeo ou áudio cria o bloco, mostra a gravação com progresso e o arquivo sobrevive ao reinício.
  - As falhas aparecem no próprio bloco, sem travar a coluna.
  - Vídeo e áudio tocam e pausam pelo botão ou por Ctrl+Enter, e ocultar pausa.
  - Mídia ausente vira "Arquivo não encontrado", e "Procurar o arquivo" recria o bloco no lugar.
- Implementation:
  - `paste.ts` puro; `mediaIntake.ts` + `api.uploadMedia` com progresso por XHR.
  - `MediaBlock.tsx` substitui a prévia estática da Fase 1.
  - `sheetService` marca `mediaMissing`; `mediaService` usa a lista de `shared/media.ts`.
  - Blocos pendentes e de falha ficam só no `sheetStore` e ficam fora do `PUT` e do contador.
  - O resultado do spike R2 decide se a colagem de arquivo do Explorer entra no passeio do Play; soltar é sempre provado.
- Create/modify/reuse/retire:
  - create: src/features/sheet/paste.ts, src/features/sheet/mediaIntake.ts, src/features/sheet/MediaBlock.tsx, tests/unit/paste.test.ts, tests/e2e/paste.spec.ts, tests/e2e/media.spec.ts, .aioson/qa/walkthroughs/pauta-revelavel/paste-and-media.json
  - modify: server/src/services/mediaService.ts, src/core/api.ts, tests/api/media.test.ts, src/core/vocabulary.ts, shared/types.ts
  - create (estende os arquivos criados nas fases anteriores): server/src/services/sheetService.ts, tests/api/sheet.test.ts, src/features/sheet/sheetStore.ts, src/features/sheet/SheetColumn.tsx, src/features/sheet/SheetBlock.tsx, src/features/sheet/TextBlockEditor.tsx, src/features/sheet/useSheetShortcuts.ts, src/features/sheet/sheet.css
  - reuse: server/src/routes/media.ts
- Verification:
  - `pnpm vitest run tests/unit/paste.test.ts tests/api/media.test.ts tests/api/sheet.test.ts`
  - `pnpm playwright test tests/e2e/paste.spec.ts tests/e2e/media.spec.ts tests/e2e/organize.spec.ts`
  - Dados de teste: WAV gerado no próprio teste para tocar e pausar; arquivo acima de 512 MB simulado por `File` com `size` redefinido no `page.evaluate`; falha de gravação por `page.route` abortando `POST /api/media`; arquivo ausente apagado de `CLAVE_E2E_APP_DIR`.
- Runtime: build servido como na Fase 1, depois `aioson browser:run . --script=.aioson/qa/walkthroughs/pauta-revelavel/paste-and-media.json --url=http://127.0.0.1:5280 --slug=pauta-revelavel`. No dev-link do Play: soltar um vídeo e um áudio do Explorer e colar um print.
- Done when: colar um roteiro de 10 parágrafos cria 10 blocos, e uma lista de 3 níveis cria a hierarquia certa. No Play, um vídeo e um áudio soltos tocam por Ctrl+Enter e voltam depois de reiniciar. Os 4 estados de falha aparecem no bloco e os atalhos continuam respondendo.

## Phase 5 — Tamanhos com ajuste fino, negrito e cor no trecho, e a aparência do app inteiro

- CAP/AC: CAP-pauta-revelavel-formatacao (AC-pauta-revelavel-35, AC-pauta-revelavel-36, AC-pauta-revelavel-37, AC-pauta-revelavel-38; F21); CAP-pauta-revelavel-aparencia (AC-pauta-revelavel-46); CAP-pauta-revelavel-coluna (AC-pauta-revelavel-08 com Aparência, AC-pauta-revelavel-53 para tamanhos, AC-pauta-revelavel-54 para as barras).
- User-visible outcome:
  - Focar um bloco de texto mostra P, M, G e Título e o A−/A+ com o valor em px. Selecionar um trecho mostra Negrito, as 6 cores e Normal.
  - Tudo persiste e responde aos atalhos.
  - O painel Aparência troca tema, destaque (com aviso de contraste) e fundo na hora, para todas as pautas e depois do reinício.
- Implementation:
  - `SizeBar` e `FormatBar` sobre `shared/blockSize.ts` e `shared/textMarks.ts` (Fase 1), com a seleção mapeada por `domText`.
  - `themes.ts` é a fonte única das paletas de `identity.md`; `applyAppearance` aplica no boot em `App.tsx` e a cada mudança.
  - Preferências validadas no servidor; a imagem de fundo vai pela pasta de mídia.
- Create/modify/reuse/retire:
  - create: src/features/sheet/SizeBar.tsx, src/features/sheet/FormatBar.tsx, src/features/appearance/AppearancePanel.tsx, src/features/appearance/themes.ts, src/features/appearance/applyAppearance.ts, src/features/appearance/contrast.ts, src/features/appearance/appearance.css, tests/unit/themes.test.ts, tests/e2e/formatting.spec.ts, tests/e2e/appearance.spec.ts, .aioson/qa/walkthroughs/pauta-revelavel/format-and-appearance.json
  - modify: server/src/repositories/preferenceRepository.ts, server/src/services/preferenceService.ts, tests/api/preferences.test.ts, shared/types.ts, src/App.tsx, src/ui/tokens.css, src/core/vocabulary.ts
  - create (estende os arquivos criados nas fases anteriores): src/features/sheet/SheetRuler.tsx, src/features/sheet/SheetBlock.tsx, src/features/sheet/TextBlockEditor.tsx, src/features/sheet/useSheetShortcuts.ts, src/features/sheet/sheetStore.ts, src/features/sheet/sheet.css
  - reuse: server/src/routes/preferences.ts
- Verification:
  - `pnpm vitest run tests/unit/themes.test.ts tests/unit/blockSize.test.ts tests/unit/textMarks.test.ts tests/api/preferences.test.ts tests/api/sheet.test.ts`
  - `pnpm playwright test tests/e2e/formatting.spec.ts tests/e2e/appearance.spec.ts`
  - O @qa faz a checagem visual de AC-pauta-revelavel-38 e AC-pauta-revelavel-41 e a legibilidade em 720p (questão 2 do PRD).
- Runtime: build servido como na Fase 1, depois `aioson browser:run . --script=.aioson/qa/walkthroughs/pauta-revelavel/format-and-appearance.json --url=http://127.0.0.1:5280 --slug=pauta-revelavel`.
- Done when: o Título nasce em 52 px, A+ vai a 56 e A− trava em 44. O negrito e a cor valem só no trecho e sobrevivem ao recarregar. Cada um dos 5 temas passa o contraste das 6 cores. A aparência escolhida vale em outra pauta e depois de reiniciar.

## Phase 6 — A primeira abertura explica a folha, e o Play só enxerga o que existe

- CAP/AC: CAP-pauta-revelavel-tour (AC-pauta-revelavel-50); CAP-pauta-revelavel-play (AC-pauta-revelavel-51, AC-pauta-revelavel-56); CAP-pauta-revelavel-migracao (retirada do servidor de live); CAP-pauta-revelavel-pautas (contrato final da API de pauta); CAP-pauta-revelavel-coluna (AC-pauta-revelavel-08 com "Como usar", AC-pauta-revelavel-53 com o tour); regressão final.
- User-visible outcome: na primeira abertura, um tour de 5 passos com holofote explica a folha, revelar, colar e formatar, o preparo e a aparência. Ele não volta sozinho, e "Como usar" o reabre. O catálogo do Play lista só as rotas da folha, das pautas, da mídia e das preferências. A interface não faz nenhuma requisição externa.
- Implementation:
  - Tour novo sobre as âncoras `data-aioson-tour` da régua e da folha; `GuideLayer` volta ao `App.tsx`.
  - Retira as rotas, serviços, repositórios, o domínio de live e os testes deles (Implementation Delta, linhas F6), mais `GET /api/rundowns/:id` e os campos de live do resumo.
  - `app.ts` e `apiCatalog.ts` andam juntos.
  - Rodar o harness, `rules:check` e as suítes inteiras.
- Create/modify/reuse/retire:
  - create: tests/e2e/tour.spec.ts, .aioson/qa/walkthroughs/pauta-revelavel/first-open.json
  - modify: src/features/guide/GuideLayer.tsx, src/features/guide/TourOverlay.tsx, src/features/guide/guideContent.ts, src/features/guide/guide.css, server/src/app.ts, server/src/http/apiCatalog.ts, server/src/routes/rundowns.ts, server/src/services/rundownService.ts, server/src/repositories/rundownRepository.ts, tests/api/platform.test.ts, tests/e2e/platform.spec.ts, shared/types.ts, src/App.tsx, src/core/vocabulary.ts
  - create (estende o arquivo criado na Fase 1): src/features/sheet/SheetRuler.tsx
  - reuse: src/features/guide/richText.tsx, manifest.json, vite.config.ts, server/src/main.ts, src/ui/fonts.css, public/fonts/inter-variable.woff2, public/fonts/jetbrains-mono-variable.woff2
  - retire:
    - src/features/guide/GuidePanel.tsx
    - server/src/routes/blocks.ts, server/src/routes/attachments.ts, server/src/routes/runs.ts, server/src/routes/library.ts, server/src/routes/openUrl.ts
    - server/src/services/blockService.ts, server/src/services/runService.ts, server/src/services/reportService.ts, server/src/services/libraryService.ts, server/src/services/openUrl.ts
    - server/src/repositories/blockRepository.ts, server/src/repositories/attachmentRepository.ts, server/src/repositories/beatRepository.ts, server/src/repositories/runRepository.ts, server/src/repositories/libraryRepository.ts
    - shared/track.ts, shared/validation/block.ts, shared/validation/attachment.ts, shared/validation/beat.ts, shared/validation/libraryItem.ts
    - tests/api/blocks.test.ts, tests/api/runs.test.ts, tests/api/report.test.ts, tests/api/library.test.ts, tests/api/openUrl.test.ts, tests/unit/track.test.ts
- Verification:
  - `pnpm vitest run`
  - `pnpm playwright test`
  - `pnpm build && pnpm exec tsx scripts/migrate-check.mjs && node scripts/smoke-boot.mjs && aioson harness:check . --feature=pauta-revelavel`
  - `aioson rules:check . --changed`
- Runtime: build servido como na Fase 1, depois `aioson browser:run . --script=.aioson/qa/walkthroughs/pauta-revelavel/first-open.json --url=http://127.0.0.1:5280 --slug=pauta-revelavel`. Fechamento no dev-link do Play com um roteiro real:
  1. colar o texto, uma lista e uma mídia;
  2. formatar, recuar, reordenar e marcar o que começa visível;
  3. gravar com OBS revelando por PageDown e Shift+PageDown;
  4. tocar a mídia por Ctrl+Enter;
  5. começar uma nova tomada;
  6. reiniciar o app e conferir a pauta.
- Done when: as suítes inteiras, o build, o harness (RG-build, RG-migrate, RG-boot, RG-smoke) e o `rules:check` saem limpos. `GET /api/aioson-play` lista só rotas que respondem, sem execução, relatório, acervo, blocos antigos ou open-url. O tour aparece uma vez e reabre por "Como usar". O roteiro real é gravado de ponta a ponta no Play.
