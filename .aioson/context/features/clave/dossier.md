---
feature_slug: clave
schema_version: "1.2"
created_by: dossier-init
created_at: 2026-08-18T05:33:03.037Z
status: active
classification: MICRO
last_updated_by: dossier-init
last_updated_at: 2026-08-18T05:33:03.037Z
---
## Why

_(preencher manualmente — PRD não encontrado ou sem seção de Vision/Problem)_

## What

O MVP é a live inteira funcionando de ponta a ponta para um criador solo: compor, ver o vale, entrar no ar, desviar e voltar, e sair com os marcadores. As fases da fonte (SRC-001 §7) são a sequência vinculante de entrega para `@planner`:

1. **Bancada** — modelo de dados, 5 pistas, CRUD de bloco, arraste, persistência (CAP-clave-bancada, CAP-clave-pautas, CAP-clave-persistencia, CAP-clave-play).
2. **Curva de energia** — cálculo, desenho, detecção de vale (CAP-clave-curva). Fecha a Bancada.
3. **Palco** — cenografia, mini-pauta, cronômetro duplo, atalhos e controles, camada privada, deck com retorno ao trilho (CAP-clave-palco, CAP-clave-resgate).
4. **Anexos** — pasta local de mídia, seis tipos, abertura no Palco, checagem pré-live (CAP-clave-anexos).
5. **Trajeto e relatório** — gravação, planejado × tocado, capítulos e cortes (CAP-clave-trajeto).
6. **Acervo** — promover, contadores, trazer cópia, gestão mínima (CAP-clave-acervo).

CAP-clave-vocabulario e CAP-clave-cenografia são transversais: valem em toda tela entregue, desde a fase 1.

O primeiro item da fase 1 é o spike de persistência local no runtime real do Play via dev-link (instalar, abrir e gravar um banco). O contrato de produto é AC-clave-40; a escolha do motor e o fallback documentado no briefing pertencem a `@planner`.

## Code Map

```yaml
files: []
modules: []
patterns: []
```

## Rules & Design-Docs aplicáveis

_(vazio — populado a partir da Phase 2)_

## Agent Trail

_(vazio — populado a partir da Phase 2)_

<!-- sha256:dceb22010acc6d5aafc2acbb627fec6fbb50df83c1345a32a2590f2205b1d299 -->
**2026-08-18T05:33:41.839Z** | @dev | _Agent Trail_

Phase 1 preflight: CAP-clave-play (AC-41..44), CAP-clave-persistencia (AC-40,45,48), CAP-clave-pautas (AC-01..05); write paths manifest.json, .gitignore, package.json, tsconfig/server tsconfig, vite/vitest/playwright configs, index.html, src/{main,App,core,ui,features/rundowns}, shared/{types,validation/rundown}, server/src/{main,app,http,db,repositories,services,routes}, scripts/{smoke-boot,migrate-check}.mjs, tests/{helpers,api,e2e}; focused check: pnpm vitest run tests/api/platform.test.ts tests/api/persistence.test.ts tests/api/rundowns.test.ts + node scripts/migrate-check.mjs; smoke: node scripts/smoke-boot.mjs + pnpm playwright test tests/e2e/rundowns.spec.ts tests/e2e/persistence.spec.ts

<!-- sha256:3a28ee986f0d2a410a196c947cb65ea0cbef08d71b9340973d3fd86080131763 -->
**2026-08-18T05:59:31.774Z** | @dev | _Agent Trail_

Fase 1 OK (CAP-clave-play, -persistencia, -pautas): vitest 25 passed, migrate-check OK, smoke-boot OK, playwright 11 passed, pnpm build OK; app abre no Play e a pauta sobrevive ao restart. Spike: better-sqlite3 roda sincrono em Node 24/win32, fallback node:sqlite nao foi necessario.

<!-- sha256:18e58d7de5cf564f510d5c7ce956e3c7ee9b3239038ee65b3a690ac4fdf62f6e -->
**2026-08-18T06:19:39.930Z** | @dev | _Agent Trail_

Fase 2 OK (CAP-clave-bancada, AC-07..12): shared/track.ts, shared/validation/{block,attachment}.ts, blockService, rotas /api/blocks e /api/rundowns/:id/track/reorder, LaneCanvas + BlockCard + BlockDrawer + AttachmentFields. Verificacao: vitest 53 passed (track 16, blocks 12); playwright 18 passed. Dois defeitos reais achados e corrigidos pelo e2e: validacao nativa do browser bloqueava o submit antes da validacao de dominio (form noValidate) e ids de droppable repetidos entre pistas anulavam o alvo do arraste (id agora carrega a pista). Esc fecha a gaveta, como no prototipo.

<!-- sha256:090ec6e6869e1e8e4884e26d8f78f7951aa426396d135bdbeb15026447d34e96 -->
**2026-08-18T06:22:10.278Z** | @dev | _Agent Trail_

Fase 3 OK (CAP-clave-curva, AC-13/14): shared/energy.ts + EnergyCurve.tsx + energy.css, curva alinhada as pistas e vale em perigo. Verificacao: vitest energy 9 passed; playwright energy 3 passed (curva dentro da dobra em 1280x800, redesenho ao mudar energia e duracao, vale de 20 min somado).

<!-- sha256:ce1aef80c72349dae6f605ca0e0f58c4ba6bddb67d368ce25dd5e02fe8f0c55d -->
**2026-08-18T06:37:00.725Z** | @dev | _Agent Trail_

Fase 4 OK (CAP-clave-palco AC-15..20, CAP-clave-resgate AC-21/22, CAP-clave-pautas AC-06): runRepository/runService/rotas de execucao, preflight, StagePage com quatro faixas, PrivateNote hold-to-show, StageTimers, useRunClock, useStageShortcuts, RescueDeck, rescue.ts, GoLiveGate/GoLiveButton, OpenRunModal. Relogio sai do startedAt gravado no servidor: recarregar nao zera a live. Verificacao: vitest runs 16 + rescue 11 passed; playwright stage 7 + rescue 4 passed. Gotchas do Palco aplicados: faixas nomeadas na regra de camada e faixa central com overflow hidden + rolagem interna.

<!-- sha256:0af88f0f9c0ee60e81e1f77b2ad749271940ab21f45092de789a4bc03576c8f2 -->
**2026-08-18T06:51:32.414Z** | @dev | _Agent Trail_

Fase 5 OK (CAP-clave-anexos, AC-23..26): mediaService com assinatura por magic bytes, teto de 512MB e nome proprio; rota /api/media com sendFile a partir da raiz da pasta de midia e recusa de travessia; videoSource (local/web/YouTube embed); AttachmentViewer (tomada de tela) e PrivatePanel; seletor de arquivo por linha na gaveta. Verificacao: vitest videoSource 6 + media 8 + blocks 14 passed; playwright attachments 5 passed. Defeito real achado pelo e2e: o id de rascunho do anexo virava chave primaria e colidia entre blocos (500 no segundo bloco com anexo) - corrigido gerando o id no servidor; de quebra, bloco e anexos passaram a gravar numa transacao so, sem estado parcial.

<!-- sha256:b2133d46408a0e9db2355d2779e96cfc496ef6d10813a2891d72a4a9979a095d -->
**2026-08-18T06:56:38.393Z** | @dev | _Agent Trail_

Fase 6 OK (CAP-clave-trajeto, AC-27..30 e AC-47): shared/markers.ts (MM:SS ate 59:59, H:MM:SS a partir de 1h, primeira linha sempre 00:00, colapso de passos consecutivos, trecho aberto fecha no fim), reportService, GET /api/runs/:id/report, ReportPage com planejado x tocado e as duas caixas de exportacao. Verificacao: vitest markers 16 + report 8 passed (129 no total); playwright report 4 passed, incluindo excluir bloco ja tocado e o relatorio continuar mostrando o passo.

<!-- sha256:85f474f0cbc41acad7a7307b657dcdbd40335d42a44e40a45be11db73ff90c42 -->
**2026-08-18T07:02:00.368Z** | @dev | _Agent Trail_

Fase 7 OK (CAP-clave-acervo, AC-31..34): libraryRepository/libraryService/rotas, LibraryPage + LibraryItemForm com tipo imutavel e razao na propria superficie, Guardar no acervo na gaveta, trazer copia independente com origemAcervoId, contadores subindo no fechamento da execucao dentro da mesma transacao. Verificacao: vitest library 13 passed; playwright library 6 passed.

<!-- sha256:3b460359c8a51f42deb718b6e526a06633bb597f3aeed3dcc5ff42ffc6c19c56 -->
**2026-08-18T07:46:12.098Z** | @dev | _Agent Trail_

Fase 8 OK (CAP-clave-cenografia AC-36..39/46, CAP-clave-vocabulario AC-35): tokens/fonts/motion/typeColors/vocabulary fechados sobre as telas reais. Verificacao: vitest vocabulary 8 passed (150 no total); playwright scenography 5 + vocabulary 1 passed. Regressao completa: pnpm build OK, migrate-check OK, smoke-boot OK (30 rotas), pnpm vitest run 150 passed, pnpm playwright test 56 passed. harness:check 4/4 (RG-build, RG-migrate, RG-boot, RG-smoke). ac:test-audit --strict = PASS, 48/48 ACs cobertos. Production smoke: pnpm dev spawnado com PORT/BACKEND_PORT/AIOSON_APP_DIR/AIOSON_APP_SLUG como o Play injeta - compor 5 blocos, guardar no acervo, trazer copia, checagem pre-live, entrar no ar, marcar trecho, sacar resgate, encerrar, ler relatorio (4 capitulos comecando em 00:00); derrubar a arvore de processos e subir de novo com pauta, blocos, acervo (1x no ar) e relatorio no lugar.

<!-- sha256:e54c9e9dd29776d6517f09e3842b848fd947025c2124ced5b1ec317531180c07 -->
**2026-08-18T07:56:16.909Z** | @qa | _Agent Trail_

QA verdict: FAIL. 48/48 ACs com evidencia e 12/12 capacidades executadas pelo caminho de producao, mas dois achados no Palco: Q-01 High (titulo gigante renderiza sem espacos entre palavras - innerText 'Abertura:oqueeoClave' enquanto textContent tem os espacos, por isso toda a suite passava) e Q-02 Medium (toast da Bancada cobre a nota privada e o rodape na tela capturada). Smoke independente pela interface com pnpm dev spawnado como o Play injeta; restart completo preservou tudo. Correction packet no qa-report-clave.md.

<!-- sha256:07c3acf46d910d2c403e8c72850cc8c06c55eb81be9640bd2a7823f1425b6a26 -->
**2026-08-18T08:10:05.342Z** | @qa | _Agent Trail_

QA verdict: PASS depois de um ciclo de correcao. Ciclo 1 reprovou por tres achados no Palco invisiveis para a suite (ela lia o DOM, nao o pintado): Q-01 High titulo gigante sem espacos renderizados, Q-02 toast da Bancada na tela capturada, Q-03 nota privada debaixo das cartas do deck por contexto de empilhamento. Dev corrigiu os tres com regressao que falha pelo motivo certo. Ciclo 2: rules:check OK, prototype:check 33/33, ac:test-audit 48/48, pnpm build OK, migrate-check OK, smoke-boot OK, vitest 150 passed, playwright 58 passed, harness 4/4, e smoke independente pela interface com pnpm dev spawnado como o Play injeta - live inteira e restart completo com tudo no lugar. Gate D aprovado. Advertencias nao bloqueantes: Q-04 capitulos a menos de 10s em live muito curta (decisao de produto) e Q-05 pilha de toasts sem teto na Bancada.

<!-- sha256:95db669a18fc409d39ed40e5f5d0e2cc63cbf0192cc51b406783276c39c1d60e -->
**2026-08-18T15:10:49.581Z** | @dev | _Agent Trail_

Camada didatica portada do prototipo aprovado: tour de 5 passos + guia completo no controle '? Como usar'. Ela estava na tabela de superficie modelada do prototype-manifest mas fora do indice '## Core interactions', entao prototype:check --strict passou 33/33 sem enxerga-la e o PRD nunca a converteu em CAP/AC. Escopo autorizado pelo usuario em 2026-08-18. Verificacao: vitest 154/154, playwright 64/64, harness:check 4/4. Production smoke: preview do Play em localhost:3524 responde GET /api/preferences com tourSeen:false e o catalogo /api/aioson-play anuncia as duas rotas novas.

<!-- sha256:a85c039fdeca60f83e36b5f2a9f270332c20e9cd8872f6370da822c1295e456f -->
**2026-08-18T15:10:59.502Z** | @dev | _Agent Trail_

Quatro desvios registrados na camada didatica. (1) A cadencia do C foi corrigida: a copia do prototipo dizia marcacao instantanea, o produto entrega trecho com inicio e fim (AC-clave-18/30). (2) O bloco 'O que este prototipo ainda nao faz' saiu por afirmar que os dados sao de exemplo e que recarregar volta tudo ao comeco, o contrario de CAP-clave-persistencia; no lugar entrou 'Onde o Clave guarda tudo'. (3) A preferencia tourSeen persiste no banco em disco (migracao 2, tabela preferences, GET/PUT /api/preferences) porque AC-clave-40 proibe localStorage e a suite exige storage estritamente vazio. (4) scripts/migrate-check.mjs deixou de repetir a lista de tabelas e passou a importar runMigrations/EXPECTED_TABLES reais; RG-migrate agora roda sob tsx e confere user_version contra LATEST_VERSION.

<!-- sha256:be41101b8039aee37b41d30f465e8e2bfc3e923886962961ae289cd7638aa522 -->
**2026-08-20T03:34:34.812Z** | @dev | _Agent Trail_

Round 4 (F14) - simplificacao pedida pelo criador, executada pelo caminho de producao. SAIU: as 4 pistas por tipo (a Bancada virou pauta linear numerada; o tipo sobrevive como etiqueta de cor, so rescue muda comportamento), a curva de energia com o campo energia 1-5 (CAP-clave-curva retired, criterios 13/14 aposentados) e os capitulos do YouTube com os trechos para corte mais a tecla C (criterio 30 aposentado, AC-clave-29 reescrito) - todos dependiam do 00:00 da execucao coincidir com o da gravacao, e ele nunca coincide. ENTROU: CAP-clave-pontos (AC-clave-49..55) - pontos do bloco revelados um a um pelo mesmo avanco, com imagem opcional por ponto e checkbox clicavel na Bancada e no Palco; e o 'falta X min para fechar a pauta' ao lado do cronometro do assunto. Migracao 3 aditiva (tabela beats, dono duplo block_id/library_item_id como os anexos); blocks.energy e run_cuts ficam no disco sem leitor. Verificacao: vitest 156/156, playwright 66/66, harness:check 4/4, ac:test-audit --strict PASS 55/55. Production smoke sobre copia do banco real do criador (v2 com 1 pauta, 1 bloco, 1 anexo, 1 execucao em aberto): migrou para v3 preservando tudo, pontos gravados e relidos do disco, rota de trecho devolve 404, relatorio sem chapters/cuts, catalogo com PATCH /api/beats/:id e sem cuts.

<!-- sha256:420a85f3490648a6e769bd16a0fc6b78d15852fd6f1216ef2cefedc08a468f0b -->
**2026-08-20T03:34:48.216Z** | @dev | _Agent Trail_

Tres defeitos reais achados pela verificacao, nao pela leitura do codigo. (1) Avanco perdido: marcar o ponto so mudava a tela quando o servidor respondia, entao apertar espaco duas vezes em sequencia - o gesto normal de uma live - fazia o segundo avanco reler o ponto ainda nao marcado e sumir. A escrita virou otimista, com refresh do disco se a gravacao falhar (AC-clave-51 guarda). (2) Checklist velho na segunda live: entrar no ar desmarca os pontos no servidor, mas o store nao era relido e o Palco mostrava a execucao anterior ate o criador recarregar - no meio da live. GoLiveButton passou a dar refresh antes de navegar (AC-clave-53 guarda). (3) Backup pre-migracao incompleto: o banco roda em WAL e backupBeforeMigrating copiava so o arquivo .db, produzindo um .bak do ultimo checkpoint - descoberto ao copiar o banco real do criador para o smoke e encontra-lo vazio. Entrou Database.checkpoint() (wal_checkpoint TRUNCATE) antes da copia; verificado com o banco real: o .bak agora tem a pauta em v2. Colisao de classe corrigida junto: .linha-pauta ja era a linha da lista de Pautas, a nova linha da Bancada virou .linha-bloco.

<!-- sha256:51e88428ec3b0086f960e2b009a86d60411bd60df3e66cb5fa3df89a823c6421 -->
**2026-08-20T05:16:08.557Z** | @qa | _Agent Trail_

QA verdict: FAIL (ciclo 1 do round 4). Software passa inteiro: build OK, migrate-check schema v3, smoke-boot 32 rotas com restart, vitest 156/156, playwright 66/66, harness 4/4, prototype:check 33/33, ac:test-audit 52/52. Smoke de producao independente com PORT/BACKEND_PORT/AIOSON_APP_DIR/AIOSON_APP_SLUG como o Play injeta: live inteira pelo boundary Express real e estado conferido por conexao SQLite separada (user_version=3, 7 pontos, 3 passos). As 7 ACs novas de CAP-clave-pontos (49..55) verificadas uma a uma no caminho real. O que reprova sao os artefatos, nao o codigo: Q-06 HIGH de rules:check (identificador nao-ingles 'texto' em tests/e2e/report.spec.ts:70) que ja e FAIL por conta propria; Q-07 High AC-clave-18 aprovada ainda exige a tecla C que o round 4 removeu (o teste com o id da AC nao exercita C, entao ac:test-audit marca coberta por etiqueta); Q-08 High CAP-clave-pontos com zero cobertura no implementation-plan, que ainda descreve a Phase 3 da curva apontando para arquivos apagados; Q-09 Medium decisions invalidas (CAP-clave-curva=retired-f14, PROM-003/PROM-006=null) travando preflight em BLOCKED; Q-10 Medium duas linhas F14 no PRD, a do round 4 sem arquivo arquivado. Correction packet completo em qa-report-clave.md.

<!-- sha256:4ffa5b77fd2ab2e1719b675c988ef24ce30e94fce57f7ef4e64adea72e86fcab -->
**2026-08-20T13:27:33.919Z** | @dev | _Agent Trail_

Q-06 corrigido (regra de projeto, bounded): identificador nao-ingles 'texto' renomeado para 'bodyText' em tests/e2e/report.spec.ts:70 (1 declaracao, 2 usos, zero mudanca de comportamento); verificacao: aioson rules:check . --changed = RULES=OK, 0 violacoes em 132 arquivos; desvios: nenhum

## Revision Requests

_(vazio — populado a partir da Phase 2)_
