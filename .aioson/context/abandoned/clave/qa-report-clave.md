---
feature: clave
verdict: fail
verified_at: 2026-08-20T05:11:45Z
production_entry: PORT=4711 BACKEND_PORT=4712 AIOSON_APP_DIR=<dir> AIOSON_APP_SLUG=clave pnpm dev (como o AIOSON Play spawna) → webview em http://127.0.0.1:4711, backend em http://127.0.0.1:4712
---

# QA — Clave (round 4 / F14)

## Verdict and blocking findings

**FAIL.**

O software entregue está bom. Rodei tudo o que executa e tudo passou: build,
migrações, boot, 156 testes de domínio/API, 66 e2e, harness 4/4, e um smoke
independente que conduziu uma live inteira pelo boundary real e conferiu o
resultado no arquivo SQLite em disco. As sete ACs novas do `CAP-clave-pontos`
— a entrega inteira do round 4 — estão de pé pelo caminho de produção.

O que reprova não é o código: são **os artefatos que deviam autorizar esse
código**. O round 4 mudou o escopo pelo chat e a implementação seguiu, mas o PRD
e o plano não acompanharam. Cinco achados, um deles defeito bounded e quatro de
intenção de produto.

| # | Severidade | Achado | Rota |
|---|---|---|---|
| Q-06 | **HIGH (regra de projeto)** | `rules:check --changed` = FAIL: identificador não-inglês `texto` em `tests/e2e/report.spec.ts:70` | @dev (bounded) |
| Q-07 | **High** | AC-clave-18 aprovada ainda exige a tecla `C` de marcar trecho; a entrega removeu `C` e um teste afirma que ele não faz nada | @product |
| Q-08 | **High** | `CAP-clave-pontos` (AC-49 a AC-55) não existe no plano de implementação: sem Implementation Delta, sem Capability Delivery, sem fase | @planner (depois de @product/@sheldon) |
| Q-09 | Medium | Valores de ciclo de vida inválidos travam o preflight em BLOCKED: `CAP-clave-curva.decision = retired-f14`, `PROM-003.decision = null`, `PROM-006.decision = null` | @product |
| Q-10 | Medium | Duas linhas `F14` na tabela de feedback aplicado do PRD; a do round 4 não tem arquivo de feedback arquivado | @product |

Q-06 sozinho já é FAIL: o contrato do QA diz que um `HIGH` de `rules:check` é
reprovação por conta própria, independente do que o PRD ou o plano digam. Q-07 é
FAIL por outra razão — uma AC obrigatória do contrato aprovado não está entregue.

## CAP/AC evidence table

| CAP | AC | Result | Evidence |
|---|---|---|---|
| CAP-clave-pautas | AC-clave-01 | PASS | `pnpm playwright test` › `rundowns.spec.ts` "a lista mostra título, data e contagem" (ok 42); no smoke real `GET /api/rundowns` devolveu a pauta com `trackBlockCount`/`plannedMinutes` |
| CAP-clave-pautas | AC-clave-02 | PASS | e2e "criar pauta exige título e abre a Bancada vazia" (ok 41); no boundary real `POST /api/rundowns` com título vazio → `422 validation_failed` "Dê um título à pauta." |
| CAP-clave-pautas | AC-clave-03 | PASS | e2e "renomear muda só a pauta escolhida e duplicar preserva a original" (ok 43); smoke: `POST /api/rundowns/:id/duplicate` criou pauta nova sem tocar na original |
| CAP-clave-pautas | AC-clave-04 | PASS | e2e "apagar passa pelo modal do design system; Esc cancela" (ok 45) + "nenhuma confirmação nativa existe no produto" (ok 46) |
| CAP-clave-pautas | AC-clave-05 | PASS | e2e "sem nenhuma pauta, o boot cai no empty state que leva à criação" (ok 48) |
| CAP-clave-pautas | AC-clave-06 | PASS | `pnpm vitest run tests/api/runs.test.ts` (16 passed) + e2e "a lista marca a pauta com execução em aberto e oferece as duas saídas" (ok 47) |
| CAP-clave-bancada | AC-clave-07 | PASS | e2e `board.spec.ts`; smoke real: a pauta voltou linear — `"Abertura do programa" pos=0`, `"Demonstração" pos=1`, nenhuma pista por tipo |
| CAP-clave-bancada | AC-clave-08 | PASS | e2e `board.spec.ts`; no boundary real `PATCH /api/blocks/:id` sem título → `422` "Dê um título ao bloco." |
| CAP-clave-bancada | AC-clave-09 | PASS | `pnpm vitest run tests/unit/track.test.ts` (16 passed); smoke: bloco `type: rescue` gravou `position = null` e não ocupou posição na pauta |
| CAP-clave-bancada | AC-clave-10 | PASS | e2e `board.spec.ts` — arrasta, recarrega e percorre o caminho por teclado |
| CAP-clave-bancada | AC-clave-11 | PASS | e2e `board.spec.ts` — confirmar e cancelar no modal do design system |
| CAP-clave-bancada | AC-clave-12 | PASS | e2e `board.spec.ts` — edita uma linha, salva e verifica que só o registro certo mudou |
| CAP-clave-pontos | AC-clave-49 | PASS | `pnpm vitest run tests/api/blocks.test.ts` (19 passed); smoke real: reescrever a lista preservou o id existente (`true`, 3 pontos) e ponto sem texto foi recusado no domínio com `422` "Escreva o ponto ou remova a linha." |
| CAP-clave-pontos | AC-clave-50 | PASS | e2e "os pontos aparecem um a um e só então a live troca de bloco" (ok 60); smoke: marcar os 3 pontos e reler → `3 de 3`, confirmados no SQLite em disco (`done=1`) |
| CAP-clave-pontos | AC-clave-51 | PASS | `pnpm vitest run tests/unit/beats.test.ts` (15 passed) + e2e "avanços em sequência rápida não se perdem esperando a gravação" (ok 61) |
| CAP-clave-pontos | AC-clave-52 | PASS | `tests/unit/beats.test.ts` (`remainingSeconds`, incluindo estouro e resgate no ar) + e2e "o Palco diz quanto falta para fechar a pauta" (ok 62) |
| CAP-clave-pontos | AC-clave-53 | PASS | e2e "entrar no ar começa a live com o checklist limpo" (ok 63); smoke: ponto marcado no ensaio, `POST /api/runs` → checklist inteiro limpo (`true`), dentro da transação de `runService.ts:122-127` |
| CAP-clave-pontos | AC-clave-54 | PASS | `pnpm vitest run tests/api/library.test.ts` (14 passed); smoke: acervo guardou 3 pontos, cópia de volta com ids próprios (`true`) e desmarcados (`true`), confirmado em disco (`done=0`) |
| CAP-clave-pontos | AC-clave-55 | PASS | e2e "duplicar a pauta leva os pontos de cada bloco" (ok 44); smoke: duplicata com 3 pontos, ids próprios e desmarcados |
| CAP-clave-palco | AC-clave-15 | PASS | e2e "entrar no ar é um gate, e o anexo local quebrado é nomeado antes" (ok 54) |
| CAP-clave-palco | AC-clave-16 | PASS | e2e "o Palco monta as quatro faixas" (ok 55), "o título gigante é pintado com os espaços entre as palavras" (ok 56), "a tela capturada não carrega aviso da Bancada" (ok 57) |
| CAP-clave-palco | AC-clave-17 | PASS | e2e "a nota privada só existe no DOM enquanto N está pressionada" (ok 58) |
| CAP-clave-palco | AC-clave-18 | **FAIL** | e2e "atalhos conduzem a live e têm controle clicável equivalente" (ok 59) exercita `espaço`/`→`/`←` e os botões, mas **não exercita `C`**; `src/features/stage/useStageShortcuts.ts` não tem ramo para `C`; `tests/e2e/report.spec.ts:60-62` afirma que `C` não produz nada. A AC aprovada exige o `C` alternando trecho aberto/fechado. Ver Q-07 |
| CAP-clave-palco | AC-clave-19 | PASS | e2e "os dois cronômetros correm e o estouro é sinalizado sem esconder o timecode" (ok 64) |
| CAP-clave-palco | AC-clave-20 | PASS | e2e "sair mantém a execução em aberto; encerrar exige modal" (ok 65) |
| CAP-clave-resgate | AC-clave-21 | PASS | `pnpm vitest run tests/unit/rescue.test.ts` (11 passed) + e2e ok 37, 38 e 39 — clique, `R` com a carta usada saindo do sorteio, e a retomada reconstruindo o estado do trajeto |
| CAP-clave-resgate | AC-clave-22 | PASS | e2e "pauta sem resgates mostra o deck em estado vazio explícito" (ok 40) |
| CAP-clave-anexos | AC-clave-23 | PASS | e2e `attachments.spec.ts` — abrir e copiar por tipo de anexo |
| CAP-clave-anexos | AC-clave-24 | PASS | e2e `attachments.spec.ts` — tela cheia contra painel privado |
| CAP-clave-anexos | AC-clave-25 | PASS | `pnpm vitest run tests/unit/videoSource.test.ts` (6 passed) + e2e `attachments.spec.ts` — local, URL e a falha explícita |
| CAP-clave-anexos | AC-clave-26 | PASS | `pnpm vitest run tests/api/media.test.ts` (8 passed) — grava caminho relativo, nunca absoluto |
| CAP-clave-trajeto | AC-clave-27 | PASS | `pnpm vitest run tests/api/runs.test.ts` + e2e ok 34; smoke: `run_steps` em disco com `blockTitle`/`blockType`/`plannedSeconds`/`wasRescue` (3 passos) |
| CAP-clave-trajeto | AC-clave-28 | PASS | e2e "o relatório abre ao encerrar, com planejado × tocado" (ok 34) |
| CAP-clave-trajeto | AC-clave-29 | PASS | e2e "o relatório não oferece capítulos nem trechos para corte" (ok 35); smoke: `GET /api/runs/:id/report` sem `chapters`/`cuts`, e `GET /api/aioson-play` lista 32 rotas, nenhuma de trecho |
| CAP-clave-trajeto | AC-clave-47 | PASS | e2e "excluir um bloco já tocado não o remove do relatório" (ok 36) |
| CAP-clave-acervo | AC-clave-31 | PASS | `pnpm vitest run tests/api/library.test.ts` + e2e `library.spec.ts`; smoke: `POST /api/library` criou o item com os pontos |
| CAP-clave-acervo | AC-clave-32 | PASS | e2e `library.spec.ts`; smoke: `copy-to` devolveu bloco independente |
| CAP-clave-acervo | AC-clave-33 | PASS | e2e `library.spec.ts` — tipo imutável com a razão na própria superfície e remoção por modal |
| CAP-clave-acervo | AC-clave-34 | PASS | `tests/api/library.test.ts` — contadores sobem no encerramento, na mesma transação (`registerAiringsFromRun`, `runService.ts:166-170`) |
| CAP-clave-vocabulario | AC-clave-35 | PASS | `pnpm vitest run tests/unit/vocabulary.test.ts` (9 passed) + e2e "as telas do produto falam o vocabulário canônico" (ok 66); `grep -rn "Pista\|Marcador" src/` não retorna nada |
| CAP-clave-cenografia | AC-clave-36 | PASS | e2e "a mesma etiqueta mostra o mesmo metal nas seis superfícies" (ok 49) |
| CAP-clave-cenografia | AC-clave-37 | PASS | e2e "nada do Palco fica abaixo do piso de legibilidade" (ok 50) |
| CAP-clave-cenografia | AC-clave-38 | PASS | e2e "com reduced-motion tudo fica estático" (ok 51) |
| CAP-clave-cenografia | AC-clave-39 | PASS | e2e "a entrada do bloco é a única coreografia" (ok 52) |
| CAP-clave-cenografia | AC-clave-46 | PASS | e2e "a interface recompõe em 900px, 360px e em janela baixa" (ok 53) |
| CAP-clave-persistencia | AC-clave-40 | PASS | e2e ok 27 e 28 + `node scripts/smoke-boot.mjs` (restart real do processo preservou a pauta); smoke: SQLite em disco com `user_version = 3`, 7 pontos e 3 passos gravados |
| CAP-clave-persistencia | AC-clave-45 | PASS | e2e "o boot mostra o estado de carregamento em vez de conteúdo vazio" (ok 29) |
| CAP-clave-persistencia | AC-clave-48 | PASS | e2e "falha de escrita aparece na tela e preserva o que foi digitado" (ok 30) + "backend fora do ar é dito na tela, não engolido" (ok 31) |
| CAP-clave-play | AC-clave-41 | PASS | `manifest.json` com `slug: clave`, `runtime: node`, `stack: split`, `processes` com `port_env`, `webview_target: frontend`, `has_api: true`, sem `requires_services` |
| CAP-clave-play | AC-clave-42 | PASS | smoke real: subiu em `PORT=4711`/`BACKEND_PORT=4712` injetadas; `vite.config.ts:6` lê `process.env.PORT`; nenhuma porta fixa no servidor |
| CAP-clave-play | AC-clave-43 | PASS | e2e "GET /api/aioson-play anuncia só rotas que respondem de verdade" (ok 32); smoke: catálogo com 32 rotas, incluindo `PATCH /api/beats/:id` e nenhuma de corte |
| CAP-clave-play | AC-clave-44 | PASS | e2e "o app abre direto no produto, sem login e sem tela de configuração" (ok 33); smoke: `GET http://127.0.0.1:4711/` → `200` direto no produto |

**51 PASS / 1 FAIL** sobre 52 ACs obrigatórias.

## Commands executed and results

- `aioson context:validate . --json`: PASS (`valid: true`, 0 issues)
- `aioson preflight . --agent=qa --feature=clave`: **BLOCKED** — 8 achados de completude (ver Q-08, Q-09, Q-10)
- `aioson prototype:check . --feature=clave --strict`: PASS (`status: ok`, 33/33 interações, binding `current`)
- `aioson ac:test-audit . --feature=clave --strict`: PASS (52/52 cobertas, 0 fracas, 27 testes) — **mas ver Q-07**: a cobertura de AC-clave-18 é por etiqueta de id, não por contrato
- `aioson feature:trace . --feature=clave --json`: 8 `gaps[]` (6 em `product`, 2 em `plan`)
- `aioson review:prepare . --feature=clave --agent=qa`: `terminal: false` — não há PASS promovido para o estado atual
- `aioson rules:check . --changed`: **FAIL** — 1 violação HIGH em 132 arquivos
- `pnpm build`: PASS (exit 0, 98 módulos, bundle gerado)
- `pnpm exec tsx scripts/migrate-check.mjs`: PASS — schema v3, tabelas `rundowns, library_items, blocks, attachments, beats, runs, run_steps, run_cuts, preferences`
- `node scripts/smoke-boot.mjs`: PASS — porta 57440, 32 rotas, pauta persistida e relida após restart do processo
- `pnpm vitest run`: PASS — **156/156** em 15 arquivos
- `pnpm playwright test`: PASS — **66/66** (3.3 min)
- Harness (`RG-build`, `RG-migrate`, `RG-boot`, `RG-smoke`): **4/4**

## Production-path smoke

- **Entry:** `PORT=4711 BACKEND_PORT=4712 AIOSON_APP_DIR=<dir descartável> AIOSON_APP_SLUG=clave pnpm dev` — exatamente as quatro variáveis que o Play injeta no spawn. Frontend `200` em `http://127.0.0.1:4711`; backend `{"ok":true,"slug":"clave","version":"0.1.0"}` em `http://127.0.0.1:4712/api/health`.
- **Trigger:** uma live inteira — criar pauta, compor três blocos (tema com 3 pontos, mídia com 1, resgate), reescrever a lista de pontos, marcar um ponto no ensaio, entrar no ar, marcar os três pontos, registrar dois passos, encerrar, abrir o relatório, duplicar a pauta, guardar o bloco no acervo e trazer a cópia de volta.
- **Real boundary:** as rotas Express de produção (`POST /api/rundowns`, `POST /api/blocks`, `PATCH /api/blocks/:id`, `PATCH /api/beats/:id`, `POST /api/runs`, `POST /api/runs/:id/steps`, `POST /api/runs/:id/finish`, `GET /api/runs/:id/report`, `POST /api/rundowns/:id/duplicate`, `POST /api/library`, `POST /api/library/:id/copy-to/:rundownId`) contra o `better-sqlite3` em disco — sem mock e sem fixture paralela.
- **State change:** o arquivo `data/clave.db` do app passou a `user_version = 3` com 7 linhas em `beats` (3 marcadas `done=1` pela live, 3 da cópia do acervo com `done=0`, 1 do bloco de mídia) e 3 linhas em `run_steps` com snapshot de título e tipo. Lido por conexão SQLite separada e somente-leitura, fora do processo do servidor.
- **Visible result:** a pauta voltou linear (`pos=0`, `pos=1`) com o resgate fora da ordem (`position = null`); entrar no ar zerou o checklist inteiro; os pontos marcados sobreviveram à releitura; o relatório trouxe os passos com planejado × tocado e **nenhum** capítulo ou trecho para corte; a duplicata e a cópia do acervo vieram com ids próprios e desmarcadas.

## Prototype fidelity and approved deviations

`prototype:check --strict` = `ok`, 33/33 interações Core ecoadas no contrato de aceitação.

Desvios aprovados, todos do round 4 (decisão direta do criador em 19/08/2026, registrada em `## Revisão de escopo — round 4` do PRD):

1. As quatro pistas por tipo saíram; a Bancada virou pauta linear numerada. O tipo sobrevive como etiqueta de cor; só `rescue` muda comportamento.
2. A curva de energia e o campo `energia 1–5` saíram (`CAP-clave-curva` aposentada, critérios 13 e 14). `shared/energy.ts`, `src/features/energy/`, `tests/unit/energy.test.ts` e `tests/e2e/energy.spec.ts` não existem mais — confirmado por `ls`.
3. Capítulos do YouTube e trechos para corte saíram (critério 30 aposentado, AC-clave-29 reescrita). **A tecla `C` saiu junto, e é aí que o contrato quebrou** — ver Q-07.

A migração 3 é aditiva: `blocks.energy` e `run_cuts` continuam em disco sem leitor, como o PRD promete. Confirmei as duas tabelas presentes no `migrate-check`.

## Prototype binding resolution

- **Owner atual:** `.aioson/briefings/clave/identity.md`, binding `current` (`prototype:check --strict`).
- **Protótipo canônico:** `.aioson/briefings/clave/prototype.html`, indexado por `.aioson/briefings/clave/prototype-manifest.md` (`## Core interactions`).
- **Referências históricas excluídas:** o protótipo ainda desenha as cinco pistas e a curva de energia (19 ocorrências de "pista" e 67 de "curva/energia" no HTML). Essas superfícies são exclusão histórica sob a revisão do round 4 e **não** foram usadas como critério de aceitação. Os rounds 1 e 2 estão incorporados no `briefings.md` aprovado; o round 3 (`refinement-feedback.applied-round3.json`, `source_hash` conferido no relatório de refinamento) segue binding.

## Engineering-control evidence and recovery result

- **Transação do bloco (AC-49):** `server/src/services/blockService.ts:84,107` envolvem `replaceBeats` na mesma `db.transaction` do bloco. Verificado no boundary: a reescrita preservou o id existente.
- **Transação do entrar no ar (AC-53):** `server/src/services/runService.ts:122-127` chama `clearDoneForRundown` dentro da transação que abre a execução. Verificado: checklist limpo na mesma chamada.
- **Transação do encerramento (AC-34):** `runService.ts:166-170` sobe os contadores do Acervo dentro da transação de `finish`.
- **Recuperação:** `node scripts/smoke-boot.mjs` derruba e sobe o processo e relê a pauta do disco — PASS. Estado externamente visível confirmado por conexão SQLite independente.
- **Autoridade do relógio:** `registerStep` calcula `actualSeconds` a partir de `elapsedSeconds(run)` e ignora o valor enviado pelo cliente. Comportamento correto — verificado e descartado como defeito.

## Regression/security notes

- Não existe `.aioson/context/security-findings-clave.json`; `@pentester` não foi acionado e nenhum gatilho concreto apareceu (sem auth, sem rede externa, sem dado de terceiro; app local, sem `requires_services`).
- Regressão completa sobre toda a superfície mudada: 156 vitest + 66 playwright + harness 4/4, todos verdes.
- `blocks.energy` e `run_cuts` permanecem em disco sem leitor. É decisão explícita do PRD (migração aditiva não apaga dado do criador) e não é achado.

## Correction packet

### Q-06 — identificador não-inglês em teste e2e (HIGH, regra de projeto)

- **Regra:** `.aioson/rules/source-code-language-convention.md` — identificadores de código, testes inclusive, em inglês técnico.
- **AC:** nenhuma; é regra de projeto, que reprova por conta própria.
- **Reprodução:**
  ```bash
  aioson rules:check . --changed
  ```
- **Esperado:** `RULES=OK`.
- **Observado:** `RULES=FAIL` — `[HIGH] tests/e2e/report.spec.ts:70 — non-English identifier "texto"`.
- **Caminho suspeito:** `tests/e2e/report.spec.ts:70` — `const texto = await page.locator('body').innerText();` e os dois `expect(texto)` seguintes.
- **Correção sugerida:** renomear para `bodyText`. Uma declaração e dois usos; nenhum comportamento muda.

### Q-07 — AC-clave-18 exige a tecla `C` que a entrega removeu (High, intenção de produto)

- **AC:** AC-clave-18.
- **Reprodução:**
  ```bash
  grep -n "KeyC\|'C'" src/features/stage/useStageShortcuts.ts   # nenhum ramo para C
  sed -n '58,63p' tests/e2e/report.spec.ts                      # afirma que C não produz nada
  ```
- **Esperado (pelo PRD aprovado):** "`C` serve para marcar trecho para corte, alternando: o primeiro `C` abre o trecho e a tela mostra que há trecho aberto, o `C` seguinte o fecha", com controle clicável equivalente.
- **Observado:** `useStageShortcuts.ts` trata apenas `Escape`, `espaço`/`→`, `←`, `R` e `N`. Nenhuma rota de trecho existe no catálogo de 32 rotas. O teste de `report.spec.ts` afirma o oposto da AC — que `C` não abre nada.
- **Por que é de produto, não de Dev:** a remoção foi decisão do criador no round 4, e a razão é boa (o `00:00` da execução nunca coincide com o da gravação). O round 4 reescreveu AC-clave-29 e aposentou o critério 30, mas **esqueceu AC-clave-18**, que carregava a mesma tecla. Não peço a `C` de volta: peço que @product reescreva AC-clave-18 removendo a cláusula do `C`, como já fez com AC-clave-29.
- **Cobertura que faltou:** `ac:test-audit --strict` marcou AC-clave-18 como coberta porque `tests/e2e/stage.spec.ts:147` carrega o id no título. O teste não exercita `C`. Etiqueta de id não é prova de contrato — a auditoria não pega isso, e por isso o achado veio da leitura da AC contra o código. O relatório de QA anterior (2026-08-18) atestava AC-clave-18 **com** o `C` funcionando, o que confirma que o comportamento existia e foi removido sem a AC ser reescrita.

### Q-08 — `CAP-clave-pontos` não existe no plano de implementação (High)

- **Reprodução:**
  ```bash
  grep -c "CAP-clave-pontos\|beats\|AC-clave-49\|AC-clave-5[0-5]" .aioson/context/implementation-plan-clave.md   # → 0
  aioson feature:trace . --feature=clave --json
  ```
- **Esperado:** a capacidade obrigatória com 7 ACs tem linha em `## Implementation Delta`, linha em `## Capability Delivery Plan` e uma fase.
- **Observado:** zero menções. `feature:trace` devolve `capability_delivery_coverage_missing: required capabilities missing from delivery plan: CAP-clave-pontos` e `implementation_delta_coverage_missing`. Pior: o plano ainda descreve a **Phase 3 — A curva mostra o vale antes de entrar no ar** com `CAP-clave-curva (AC-clave-13, AC-clave-14)` e nomeia `shared/energy.ts`, `src/features/energy/EnergyCurve.tsx`, `tests/unit/energy.test.ts` e `tests/e2e/energy.spec.ts` como arquivos de entrega — **nenhum existe mais no repositório**.
- **Efeito:** a maior entrega do round 4 foi implementada sem plano aprovado que a autorizasse, e o plano hoje aponta para arquivos apagados.

### Q-09 — valores de ciclo de vida inválidos travam o preflight (Medium)

- **Reprodução:**
  ```bash
  aioson preflight . --agent=qa --feature=clave   # Readiness: BLOCKED
  ```
- **Observado:**
  - `CAP-clave-curva.decision = "retired-f14"` — não é valor válido (`required` | `not_applicable` | `deferred`), e a capacidade ficou sem actor ou gatilho de sistema.
  - `PROM-003.decision = null` e `PROM-006.decision = null` — exatamente as duas promessas que o round 4 mexeu.
  - `source_lifecycle_contradictory`: registro do briefing e PRD gerado não provam absorção canônica completa.
- **Correção sugerida:** `CAP-clave-curva` → `not_applicable` (aposentada, sem comportamento); `PROM-003` → `required` (agora servida por `CAP-clave-pontos`, que é o que o próprio `rationale` já diz); `PROM-006` → `required` (o trajeto gravado continua entregue; só os marcadores saíram).

### Q-10 — duas linhas `F14` no trilho de revisão (Medium)

- **Reprodução:**
  ```bash
  sed -n '82,86p' .aioson/context/prd-clave.md
  ls .aioson/briefings/clave/refinement-feedback.applied-round*.json   # rounds 1, 2 e 3 apenas
  ```
- **Observado:** a tabela de feedback aplicado tem **duas linhas com o id `F14`**. Uma é a simplificação de escopo do round 4; a outra é a F14 real e binding do round 3 (claim competitivo sustentado pela pesquisa), presente em `refinement-feedback.applied-round3.json`. A do round 4 não tem arquivo arquivado — não existe `refinement-feedback.applied-round4.json`.
- **Por que importa:** sob `.aioson/docs/briefing/review-authority.md`, material não arquivado não é autoridade, e o id repetido torna o trilho irresolvível — não dá para dizer, lendo o PRD, qual F14 uma decisão futura está citando.
- **Correção sugerida:** dar à decisão do round 4 um id próprio (ex.: `F16`), ou registrá-la como revisão de escopo direta sem reusar id de feedback, e arquivar o round 4 se ele for tratado como rodada de refinamento.

## Advertências não bloqueantes

| # | Achado |
|---|---|
| Q-11 | `## Open questions` #13 ainda diz "A regra determinística obrigatória (`00:00` na primeira linha) já é AC-clave-29" — a AC-clave-29 do round 4 diz o oposto: o relatório não oferece capítulos. Texto obsoleto. |
| Q-12 | `## Open questions` #15 continua "aberta" sobre o slug `aioson-crave-2`, mas o `manifest.json` já traz `slug: clave`. Questão respondida pela entrega. |
| Q-13 | A telemetria visual do `prototype:check` (aderência a token 37%, 79 espaçamentos fora da malha de 4px, JetBrains Mono nomeada sem `@font-face`) é advisory e mede o **arquivo de protótipo**, não o produto. AC-clave-37 exige fontes servidas localmente e o e2e correspondente passou (ok 50). Não é achado de entrega. |

## Ciclo de review

Ciclo 1 desta rodada. `aioson review:prepare` retornou `terminal: false` — não há PASS promovido para o estado atual do artefato.
