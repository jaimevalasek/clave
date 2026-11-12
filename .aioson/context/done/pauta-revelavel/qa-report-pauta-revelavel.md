---
feature: pauta-revelavel
verdict: pass
verified_at: 2026-11-11T19:49:49Z
production_entry: "pnpm build && PORT=5290 BACKEND_PORT=3390 AIOSON_APP_DIR=<cópia de data/ real v5> pnpm start → http://127.0.0.1:5290/ (abre #/rundown/<última pauta aberta>)"
---

# QA Report — pauta-revelavel

Sessão de QA independente (sessão nova; nada da conversa do @dev foi herdado). Todo o comportamento foi verificado no build de produção (`pnpm build` + `pnpm start`, o mesmo caminho que o Play usa no app buildado), sobre uma **cópia dos dados reais** de `data/` (schema v5, 1 pauta antiga, 1 bloco, 2 imagens, 2 links, 800 KB pendentes no WAL), migrada para v6 no boot. As specs e2e rodam contra `pnpm dev` com backend Express + SQLite reais (sem mock).

## Verdict and blocking findings

**Verdict: PASS.** Os 12 CAP e os 57 AC têm evidência executada e concreta. Nenhum achado Critical/High. `rules:check --changed`: 0 violações (`RULES=OK`). Não existe `security-findings-pauta-revelavel.json` nem `agent-execution-pauta-revelavel.json`; nenhum gatilho para @pentester ou @tester.

Bloqueios: nenhum.

Resíduos não bloqueantes (fora das promessas dos AC; registrados como observações, não corrigidos em passagem):

| Id | Severidade | Achado verificado | Por que não bloqueia |
|---|---|---|---|
| OBS-6f24c9 | Low | Confirmado por leitura de `shared/sheetTree.ts:115` (`moveSubtree` anda pela lista inteira, ocultos incluídos): com o Preparo desligado, Alt+↓ num sub-item ao lado de um tópico oculto o põe como filho desse tópico, e o bloco sai da tela. O arraste já usa só os blocos na página (`SheetColumn.tsx`, `order`). | AC-44 pede que a ordem mude e que "Desfazer" volte; as duas coisas acontecem. Nada se perde. A reorganização acontece no fluxo de preparo (Preparo ligado), onde todos os blocos estão montados. Melhoria de produto: mover relativo aos blocos na tela. |
| OBS-246f13 | Low (pergunta de produto) | A lista `#/rundowns` não tem "Como usar" nem "Aparência"; o manifesto do protótipo descreve o painel Aparência "sobre qualquer tela". | AC-08 e AC-46 (contrato aprovado) colocam os dois na régua da folha, onde estão e funcionam. Decidir se a lista também deve tê-los é do @product. |
| OBS-e8705f | Advisory | Telemetria visual: aderência a tokens 57% e 34 espaçamentos fora da grade de 4px. A parte "efeitos declarados e nunca usados" é **falso positivo**: `ink-settle` e `block-leave` estão ligados em `src/ui/motion.css:53,57`, `modal-enter` em `src/ui/modal.css:21`, `--shadow-lift` em `src/features/sheet/sheet.css:261`. | Capturas do app real (régua, folha pautada, sub-item com marcador e linha-guia, imagem migrada) conferem com o protótipo. É ofício de CSS, não comportamento prometido. |

Não executado nesta sessão (precisa de uma pessoa no dev-link do Play): gravação real com OBS quadro a quadro (métrica de sucesso e questão aberta 2 do PRD, legibilidade a 720p) e colar arquivos do Explorer no webview real (risco R2; AC-17 cobre a promessa por arrastar). A prova de captura do AC-27 foi feita por ausência no DOM e na árvore de acessibilidade mais uma captura da janela em produção (abaixo).

## CAP/AC evidence table

Legenda dos walkthroughs de QA (escritos por mim, rodados no build de produção):
- W1 = `.aioson/context/features/pauta-revelavel/browser/qa-production-smoke.json` (120/120 passos; script `.aioson/qa/walkthroughs/pauta-revelavel/qa-production-smoke.json`)
- W2 = `.aioson/context/features/pauta-revelavel/browser/qa-paste-production.json` (23/23; script `.aioson/qa/walkthroughs/pauta-revelavel/qa-paste-production.json`)
- W3 = `.aioson/context/features/pauta-revelavel/browser/qa-capture-check.json` (6/6; script `.aioson/qa/walkthroughs/pauta-revelavel/qa-capture-check.json`)
- E2E = `pnpm playwright test` (74/74, rodado em duas partes); VT = `pnpm vitest run` (168/168)

| CAP | AC | Result | Evidence |
|---|---|---|---|
| CAP-pauta-revelavel-pautas | AC-pauta-revelavel-01 | PASS | W1 passos 0–2: abrir `/` cai em `#/rundown/2b5f87b5…` (a pauta migrada, última aberta); passos 116–119: com a migrada fixada, `/` abre "Pauta QA independente" (abertura mais recente). E2E `rundowns.spec.ts` "with no rundown the list shows the empty state" e "reopens the last rundown opened, even with another one pinned" |
| CAP-pauta-revelavel-pautas | AC-pauta-revelavel-02 | PASS | W1 passos 105–112: "Criar pauta" vazio mostra 'Dê um nome à pauta, por exemplo "Episódio 12: filas".' com `aria-invalid="true"` e não cria; nome preenchido → `POST /api/rundowns` 200 → "Folha em branco.". VT `tests/api/rundowns.test.ts` "AC-pauta-revelavel-02 — the rundown name is required by the server"; E2E `rundowns.spec.ts` AC-02 |
| CAP-pauta-revelavel-pautas | AC-pauta-revelavel-03 | PASS | E2E `rundowns.spec.ts` "renaming from the list changes only that row and survives a restart" e `sheet.spec.ts` "the name edited on the ruler saves and shows the same in the list" |
| CAP-pauta-revelavel-pautas | AC-pauta-revelavel-04 | PASS | W1 passos 92–93: "Duplicar" → `POST /api/rundowns/2b5f…/duplicate` 201 → "O Aioson Play (Construa qualquer coisa) (cópia)" na lista. E2E `rundowns.spec.ts` AC-04 (todos os blocos, tomada zerada); VT `tests/api/rundowns.test.ts` |
| CAP-pauta-revelavel-pautas | AC-pauta-revelavel-05 | PASS | W1 passos 94–104: modal "Apagar pauta?" com "Não dá para desfazer."; Esc mantém a cópia; confirmar → `DELETE /api/rundowns/470c6ffd…` 204 e a linha some; a imagem compartilhada com a original continua servida (`GET /api/media/7d20dee9….jpg` 200) e a original fica na lista após recarregar. E2E `rundowns.spec.ts` AC-05 |
| CAP-pauta-revelavel-pautas | AC-pauta-revelavel-06 | PASS | W1 passos 89–91, 117: linha da migrada com "veio da versão anterior", "6 blocos", "1 na tela no início"; "fixada" após Fixar. E2E `rundowns.spec.ts` AC-06 (fixadas primeiro, id persistido) |
| CAP-pauta-revelavel-pautas | AC-pauta-revelavel-57 | PASS | E2E `sheet.spec.ts` "loading shows the skeleton, a dead server shows "Tentar de novo", a missing rundown leads to the list" e `rundowns.spec.ts` AC-57 |
| CAP-pauta-revelavel-coluna | AC-pauta-revelavel-07 | PASS | W1: escrever (passo 62) e revelar com PageDown (passo 12) na mesma rota `#/rundown/:id`, sem modal de edição; passo 112 abre a pauta nova direto na coluna. E2E `sheet.spec.ts` "one column, with name, counter and save state on the ruler" |
| CAP-pauta-revelavel-coluna | AC-pauta-revelavel-08 | PASS | W1 passos 2–11, 35: régua com nome editável, "0 de 5 na tela", "Salvo às HH:MM", "Ocultar último", "Revelar próximo", "Preparo", "Nova tomada", "Aparência", "Como usar". E2E `tour.spec.ts` AC-08 |
| CAP-pauta-revelavel-coluna | AC-pauta-revelavel-09 | PASS | W1 passos 64–67 (salva sem botão, volta após recarregar); 72–81 (todo `PUT` bloqueado → "Falha ao salvar · nova tentativa em 5 s"; rede volta → nova tentativa sozinha → "Salvo às"; recarregar mantém "2 de 6"); `localStorage.length` = 0. Reinício real do processo (`taskkill` + `pnpm start` de novo): `GET /api/rundowns/2b5f…/sheet` devolveu os 6 blocos com planejado e progresso intactos. E2E `sheet.spec.ts` AC-09 ×2 |
| CAP-pauta-revelavel-coluna | AC-pauta-revelavel-10 | PASS | W1 passos 60–71: com o Preparo desligado, "Clique para escrever…" cria um bloco com foco (`isContentEditable`), o texto digitado aparece na hora ("2 de 6"), persiste e some depois de uma nova tomada ("1 de 6", texto fora da página) |
| CAP-pauta-revelavel-coluna | AC-pauta-revelavel-11 | PASS | E2E `sheet.spec.ts` "Enter breaks the line, Enter twice opens the next block, Backspace on an empty block removes it" e `subitems.spec.ts` AC-11 (primeiro sub-item; Backspace sobe os sub-itens) |
| CAP-pauta-revelavel-coluna | AC-pauta-revelavel-53 | PASS | E2E `sheet.spec.ts` "Esc leaves the text and Tab goes back to the controls with visible focus", `formatting.spec.ts`, `organize.spec.ts`, `reveal.spec.ts` (olho por teclado) e `tour.spec.ts` "the tour traps the focus" |
| CAP-pauta-revelavel-coluna | AC-pauta-revelavel-54 | PASS | E2E `sheet.spec.ts` "at 360 px there is no horizontal scroll and targets have at least 44 px" e `formatting.spec.ts` "at 360 px the size and format bars wrap" |
| CAP-pauta-revelavel-entrada | AC-pauta-revelavel-13 | PASS | W2 passos 3–5, 12: texto com CRLF colado fora da edição → "3 blocos criados…"; no disco, 3 blocos sem negrito/cor apesar do `text/html` colado junto. E2E `paste.spec.ts` "a ten-paragraph script … becomes ten blocks after the selected topic and its sub-items" |
| CAP-pauta-revelavel-entrada | AC-pauta-revelavel-14 | PASS | E2E `paste.spec.ts` "a paste with the caret in a block goes in at the caret and the paragraphs after a blank line become the next blocks" |
| CAP-pauta-revelavel-entrada | AC-pauta-revelavel-15 | PASS | W2 passos 6–11: lista com "-" e recuo de espaços → "Lista colada: 4 blocos"; no disco níveis `0,1,2,0` e sub-itens `small` (P). VT `tests/unit/paste.test.ts`; E2E `paste.spec.ts` AC-15 |
| CAP-pauta-revelavel-entrada | AC-pauta-revelavel-16 | PASS | W2 passos 13–20: print colado → `POST /api/media` → bloco de imagem; arquivo de 208 bytes gravado em `data/media/8ceda89b….png`; após recarregar, a imagem 64×40 volta da pasta de mídia (`mediaMissing:false`). E2E `media.spec.ts` AC-16 ("Gravando … na pasta de mídia") |
| CAP-pauta-revelavel-entrada | AC-pauta-revelavel-17 | PASS | E2E `media.spec.ts` "dragging files shows "Solte para criar blocos aqui" and the drop creates the blocks where it happened" |
| CAP-pauta-revelavel-entrada | AC-pauta-revelavel-18 | PASS | E2E `media.spec.ts` "format, size and write failures show in the block while the column and the shortcuts keep working; "Tentar de novo"…"; VT `tests/api/media.test.ts` |
| CAP-pauta-revelavel-entrada | AC-pauta-revelavel-19 | PASS | E2E `paste.spec.ts` "a pasted URL becomes a text block holding the URL, never a link or an embed" |
| CAP-pauta-revelavel-entrada | AC-pauta-revelavel-20 | PASS | VT `tests/api/media.test.ts` "AC-pauta-revelavel-20 — accepted formats, checked against their signature" (Express real: extensão forjada e pdf recusados; mp3, wav, m4v, mkv aceitos) |
| CAP-pauta-revelavel-revelar | AC-pauta-revelavel-21 | PASS | W1 passos 52–58: no Preparo o bloco troca de "começa oculto" para "começa visível" (PUT 200) e a nova tomada mostra só ele ("1 visível e 4 ocultos", "1 de 5"); blocos novos nascem ocultos (passo 71). VT `tests/unit/reveal.test.ts` |
| CAP-pauta-revelavel-revelar | AC-pauta-revelavel-22 | PASS | W1 passos 12–14 (PageDown → `PUT …/sheet` 200, "1 de 5"), 28–29 ("Tudo já está na tela."), 113–114 ("A pauta está vazia. Cole ou escreva o primeiro bloco."). E2E `reveal.spec.ts` AC-08/22 (um por vez, atravessando níveis, rolagem) |
| CAP-pauta-revelavel-revelar | AC-pauta-revelavel-23 | PASS | W1 passos 17–20: PageUp esconde o último ("0 de 5"); de novo → "Nada foi revelado nesta tomada ainda." E2E `reveal.spec.ts` AC-23 |
| CAP-pauta-revelavel-revelar | AC-pauta-revelavel-24 | PASS | W1 passos 21–22: Shift+PageDown revela o tópico com 4 sub-itens ("5 de 5"); passos 30–31: um PageUp esconde o grupo inteiro ("0 de 5"). E2E `reveal.spec.ts` AC-24 |
| CAP-pauta-revelavel-revelar | AC-pauta-revelavel-25 | PASS | E2E `reveal.spec.ts` "the eye hides one block alone, a topic with its sub-items, with a toast"; VT `tests/unit/reveal.test.ts` |
| CAP-pauta-revelavel-revelar | AC-pauta-revelavel-26 | PASS | E2E `reveal.spec.ts` "PageDown, Shift+PageDown, PageUp and F2 work with the caret in a text and insert nothing" |
| CAP-pauta-revelavel-revelar | AC-pauta-revelavel-27 | PASS | W3: captura da janela em produção com "2 de 6 na tela" mostra só o título e harness.jpg; a 2ª imagem, os links e o bloco do QA não estão na página (`2,1,false,false`) nem na imagem; todo editável com `spellcheck=false`. W1 passos 5, 15–16, 59, 71 (0, 1 e 1 bloco no DOM). E2E `reveal.spec.ts` AC-27 (fora do DOM e da árvore de acessibilidade) |
| CAP-pauta-revelavel-revelar | AC-pauta-revelavel-28 | PASS | W1 passos 47–54: F2 liga "Preparo ligado", os 5 ocultos montam, plano clicável "começa oculto"→"começa visível"; F2 de novo remove a faixa. E2E `reveal.spec.ts` AC-28 (esmaecido com hachura) |
| CAP-pauta-revelavel-revelar | AC-pauta-revelavel-29 | PASS | W1 passos 38–46, 56–58: "Começar uma nova tomada?" com "0 visíveis e 5 ocultos" / "1 visível e 4 ocultos"; Esc mantém "2 de 5"; confirmar volta ao planejado ("0 de 5") com `PUT` 200 |
| CAP-pauta-revelavel-revelar | AC-pauta-revelavel-30 | PASS | W1 passo 37 ("2 de 5" após recarregar); reinício real do processo: blocos com `takeVisible:true`/`revealStep:1` preservados no `GET …/sheet`. E2E `reveal.spec.ts` AC-30 |
| CAP-pauta-revelavel-revelar | AC-pauta-revelavel-31 | PASS | W1 passos 4, 13 ("0 de 5", "1 de 5"); VT `tests/unit/reveal.test.ts` (sub-item de tópico oculto não conta) |
| CAP-pauta-revelavel-revelar | AC-pauta-revelavel-32 | PASS | W1 passo 23: "Fim da pauta · tudo na tela" ao revelar o último |
| CAP-pauta-revelavel-revelar | AC-pauta-revelavel-52 | PASS | E2E `reveal.spec.ts` "with reduced motion, revealing and hiding happen without animation and the scroll is not smooth" |
| CAP-pauta-revelavel-revelar | AC-pauta-revelavel-55 | PASS | W1 passos 72–80: com todo `PUT` falhando, PageDown muda o contador na hora ("2 de 6"), o bloco revelado fica na tela e aparece "Falha ao salvar · nova tentativa em 5 s". E2E `reveal.spec.ts` AC-55 |
| CAP-pauta-revelavel-midia | AC-pauta-revelavel-33 | PASS | E2E `media.spec.ts` "audio starts still; the button and Ctrl+Enter play and pause it inside the block; hiding stops it", "a dropped video starts still and plays inside the block" e BR-09 (último revelado) |
| CAP-pauta-revelavel-midia | AC-pauta-revelavel-34 | PASS | E2E `media.spec.ts` "a file gone from the media folder shows "Arquivo não encontrado" with the preparation off, and "Procurar o arquivo"…"; o servidor marca `mediaMissing` (W2 passo 20 mostra `false` para o arquivo presente) |
| CAP-pauta-revelavel-formatacao | AC-pauta-revelavel-35 | PASS | E2E `formatting.spec.ts` "focusing a text shows P, M, G and Título with the default sizes; Ctrl+Alt+1 to 4 do the same" |
| CAP-pauta-revelavel-formatacao | AC-pauta-revelavel-36 | PASS | E2E `formatting.spec.ts` "A− and A+ move 4 px inside the range, show the value, stop at the limit and persist"; servidor de produção recusa `fontPx` 76 em Título com 422 "O tamanho vai de 44 a 72px, de 4 em 4." |
| CAP-pauta-revelavel-formatacao | AC-pauta-revelavel-37 | PASS | E2E `formatting.spec.ts` "a selected passage gets bold and a color of the theme; "Normal" removes both; it persists" |
| CAP-pauta-revelavel-formatacao | AC-pauta-revelavel-38 | PASS | Cálculo WCAG independente (fórmula própria, não a `contrastRatio` do app) sobre `src/features/appearance/themes.ts`: menor contraste 4,67:1 (Caderno/destaque); todas as 30 combinações ≥ 4,5:1. VT `tests/unit/themes.test.ts` |
| CAP-pauta-revelavel-formatacao | AC-pauta-revelavel-39 | PASS | VT `tests/unit/textMarks.test.ts`; W2 passo 12: HTML colado com negrito/cor não chega ao disco. Nenhum `innerHTML`/`dangerouslySetInnerHTML` em `src/` |
| CAP-pauta-revelavel-subitens | AC-pauta-revelavel-40 | PASS | E2E `subitems.spec.ts` AC-40 ×3 (Tab/Shift+Tab com mudança de tamanho; recusa com toast; tópico leva os sub-itens; mídia recua) |
| CAP-pauta-revelavel-subitens | AC-pauta-revelavel-41 | PASS | E2E `subitems.spec.ts` "level 1 shows "•", level 2 "◦", in the accent colour, indented with a guide line"; captura W1/W3 mostra o marcador dourado e a linha-guia na imagem migrada de nível 1 |
| CAP-pauta-revelavel-subitens | AC-pauta-revelavel-42 | PASS | E2E `subitems.spec.ts` AC-42; VT `tests/api/sheet.test.ts` "the server refuses a tree that a move or a delete would break"; servidor de produção recusa sub-item no topo com 422 sem gravar nada (folha continuou com 6 blocos) |
| CAP-pauta-revelavel-subitens | AC-pauta-revelavel-43 | PASS | E2E `reveal.spec.ts` "in preparation "recolher" hides the sub-items from the edition and shows the count; with preparation off nothing changes" |
| CAP-pauta-revelavel-organizar | AC-pauta-revelavel-44 | PASS | E2E `organize.spec.ts` ×4 (alça, bloco levantado, marca de destino, "Desfazer", Alt+↑/↓ anunciado em região ao vivo, toque no celular). Ver resíduo OBS-6f24c9 |
| CAP-pauta-revelavel-organizar | AC-pauta-revelavel-45 | PASS | E2E `organize.spec.ts` ""Apagar bloco?" confirms the trash and Delete; Cancelar and Esc keep the block" e `media.spec.ts` AC-45 (falha de mídia sai sem confirmação) |
| CAP-pauta-revelavel-aparencia | AC-pauta-revelavel-46 | PASS | E2E `appearance.spec.ts` ×3 (tema na hora para todas as pautas e após reinício; aviso abaixo de 4,5:1 e "Usar a do tema"; fundo cor/gradiente/imagem gravada com véu); VT `tests/api/preferences.test.ts` |
| CAP-pauta-revelavel-migracao | AC-pauta-revelavel-12 | PASS | W1 passos 84–88: `#/board/…` e `#/stage/…` levam a `#/rundowns`; nenhuma tela com "Entrar no ar", Bancada, Palco, Acervo, cronômetro, Relatório ou Trajeto. E2E `vocabulary.spec.ts` AC-12 |
| CAP-pauta-revelavel-migracao | AC-pauta-revelavel-47 | PASS | Dados reais migrados no boot: título do bloco antigo → texto nível 0; 2 anexos de imagem → blocos de imagem nível 1 (arquivos presentes); 2 links → texto nível 1 com a URL; tudo "começa oculto"; selo `legacyImported`. W1 passos 2–4, 14, 25–26, 89 (imagens migradas renderizam de `/api/media`). VT `tests/api/legacyImport.test.ts` |
| CAP-pauta-revelavel-migracao | AC-pauta-revelavel-48 | PASS | Dados reais: `clave.db.bak` gerado no boot está em `user_version` 5 com 1 pauta, 1 bloco e 4 anexos (conteúdo que só existia no WAL incluído); tabelas `blocks`, `attachments`, `runs`, `run_steps`, `run_cuts`, `library_items`, `beats` seguem no banco v6; reinício não duplicou (6 blocos, 1 pauta migrada). VT `tests/api/legacyImport.test.ts` AC-48 |
| CAP-pauta-revelavel-migracao | AC-pauta-revelavel-49 | PASS | W1 passo 88; E2E `vocabulary.spec.ts` "the list and the sheet speak Pauta, bloco, revelar and ocultar only"; VT `tests/unit/vocabulary.test.ts` |
| CAP-pauta-revelavel-tour | AC-pauta-revelavel-50 | PASS | E2E `tour.spec.ts` ×4 (5 passos com holofote; Pular/Esc; "Como usar" reabre do passo 1; instalação nova sem tour na lista e com tour na primeira pauta; 360px) |
| CAP-pauta-revelavel-play | AC-pauta-revelavel-51 | PASS | `pnpm start` com `PORT=5290`/`BACKEND_PORT=3390` serviu exatamente nessas portas; `GET /api/aioson-play` lista 15 rotas (health, aioson-play, rundowns, sheet, media, preferences), sem execuções, relatório ou acervo. VT `tests/api/platform.test.ts` (13); E2E `platform.spec.ts` AC-51 |
| CAP-pauta-revelavel-play | AC-pauta-revelavel-56 | PASS | W1 passos 25, 82–83: todo recurso da página tem a mesma origem; fontes carregadas "Inter, JetBrains Mono"; imagens de `/api/media`. W2 passo 19. E2E `platform.spec.ts` AC-56 |

## Commands executed and results

- `aioson preflight . --agent=qa --feature=pauta-revelavel`: Gates A/B/C aprovados; bloqueio só pela ausência deste relatório (esperado).
- `aioson prototype:check . --feature=pauta-revelavel --strict`: PASS (status ok, 46/46 interações, identidade `current`).
- `aioson ac:test-audit . --feature=pauta-revelavel --strict`: PASS (57/57; oráculo: 0 tautológico, 0 expected-to-fail, 0 desativado, 0 snapshot).
- `aioson feature:trace . --feature=pauta-revelavel --json`: `gaps: []`, 12 CAP, 57 AC, 17/17 promessas cobertas.
- `pnpm vitest run`: PASS (exit 0) — 14 arquivos, 168/168.
- `pnpm build`: PASS (exit 0).
- `pnpm playwright test tests/e2e/paste.spec.ts tests/e2e/media.spec.ts tests/e2e/formatting.spec.ts tests/e2e/subitems.spec.ts tests/e2e/organize.spec.ts tests/e2e/appearance.spec.ts tests/e2e/tour.spec.ts tests/e2e/sheet.spec.ts tests/e2e/reveal.spec.ts`: PASS (exit 0) — 61/61.
- `pnpm playwright test tests/e2e/rundowns.spec.ts tests/e2e/platform.spec.ts tests/e2e/vocabulary.spec.ts`: PASS (exit 0) — 13/13.
- `PORT=5290 BACKEND_PORT=3390 AIOSON_APP_DIR=<scratchpad>/qa-app2 pnpm start` (cópia de `data/` real): boot com migração v5→v6, "schema v6", API em 3390, web em 5290.
- `aioson browser:run . --script=.aioson/qa/walkthroughs/pauta-revelavel/qa-production-smoke.json --url=http://127.0.0.1:5290 --slug=pauta-revelavel`: PASS 120/120 (a 1ª execução parou no passo 111 só porque eu esperava 201 e a criação responde 200; a pauta foi criada; corrigi a expectativa e reexecutei do zero sobre nova cópia dos dados).
- `aioson browser:run . --script=.aioson/qa/walkthroughs/pauta-revelavel/qa-paste-production.json --url=http://127.0.0.1:5290 --slug=pauta-revelavel`: PASS 23/23.
- `aioson browser:run . --script=.aioson/qa/walkthroughs/pauta-revelavel/qa-capture-check.json --url=http://127.0.0.1:5290 --slug=pauta-revelavel`: PASS 6/6.
- `curl` no servidor de produção: `/api/media/..%2F..%2Fclave.db` 400, `/api/media/..%2Fclave.db` 400, `/api/media/%2e%2e/clave.db` 404, `/api/media/C:%5CWindows%5Cwin.ini` 400; `PUT …/sheet` com `mediaPath` "../clave.db" 422, primeiro bloco no nível 1 422, `fontPx` 76 em Título 422; folha intacta depois (6 blocos).
- Reinício real do processo (`taskkill` + `pnpm start` sobre a mesma pasta): progresso, planejado e conteúdo preservados; migração não reaplicada.
- `aioson rules:check . --changed`: `RULES=OK`, 0 violações (8 regras verificáveis em 112 arquivos).
- Cálculo de contraste WCAG independente (`tsx` sobre `themes.ts` com fórmula própria): mínimo 4,67:1.

## Production-path smoke

- Entry: `pnpm build` + `PORT=5290 BACKEND_PORT=3390 AIOSON_APP_DIR=<cópia de data/ v5 real> pnpm start` → `http://127.0.0.1:5290/` (report W1: `.aioson/context/features/pauta-revelavel/browser/qa-production-smoke.json`)
- Trigger: tecla PageDown (e Shift+PageDown, PageUp, F2, "Nova tomada", digitação, Ctrl+V de texto/lista/print) na folha da pauta migrada "O Aioson Play (Construa qualquer coisa)"
- Real boundary: `PUT /api/rundowns/2b5f87b5-42ea-492f-b696-e68e7c5e9758/sheet` → 200 (proxy do `vite preview` → Express na 3390 → transação SQLite em `sheet_blocks`); `POST /api/media` (print colado, W2); `POST …/duplicate` 201, `DELETE /api/rundowns/:id` 204, `POST …/toggle-pin` 200
- State change: `sheet_blocks` grava `take_visible`/`reveal_step` e `planned_visible`; após recarregar e após reiniciar o processo, `GET …/sheet` devolve o mesmo progresso ("2 de 5", depois "2 de 6"); o print colado vira arquivo em `data/media/` e bloco `image` persistido
- Visible result: o contador da régua vai de "0 de 5 na tela" para "1 de 5" e o bloco "Aioson Play Apresentação" aparece; Shift+PageDown mostra o tópico com 4 sub-itens e "Fim da pauta · tudo na tela"; os blocos ocultos não estão na página nem na captura (W3)

## Prototype fidelity and approved deviations

- `prototype:check --strict`: 46/46 interações do protótipo ecoadas no contrato de AC; cada interação-chave exercida acima (revelar/ocultar/tópico, preparo com plano clicável, nova tomada com contagem, colar texto/lista/print, régua completa, lista com selo e fixar).
- Capturas do app real (W1 `qa-production-smoke-step-27-legacy-all-revealed.png`, W3 `qa-capture-check-step-05-capture-2-of-6.png`): régua fina com nome, chip "VERSÃO ANTERIOR", contador mono, "Salvo às", botões com teclas; folha pautada sobre fundo escuro Tinta & Ouro; sub-item com marcador dourado e linha-guia. Conferem com o protótipo.
- Desvios aprovados D1–D5 (plano, "Autoridade de review"): todos entregues ("Desfazer" ao reordenar, 512 MB, fixar, `tourSeen`, mídia/editor/persistência reais).
- F21 (refinamento rodada 4, vinculante, `refinement-feedback.applied-round4.json`): Título 52px padrão com faixa 44–72 e A−/A+ — entregue (AC-35/-36, E2E `formatting.spec.ts`; servidor recusa fora da faixa).
- Divergência sem decisão de produto: OBS-246f13 (lista sem "Como usar"/"Aparência"); não contraria nenhum AC aprovado.

## Prototype binding resolution

- Dono atual: `pauta-revelavel`; caminho `.aioson/briefings/pauta-revelavel/prototype.html`; `prototype_status: current` no PRD e no plano; identidade `.aioson/briefings/pauta-revelavel/identity.md` `current`.
- `feature:trace` marca a evidência visual **do protótipo** como `stale` (o `prototype-manifest.md` foi editado ~6 min depois da medição de 06:18Z); a medição da implementação (19:36Z) não está obsoleta. Afeta só a proveniência da telemetria do protótipo, não o binding nem o contrato de AC.
- Referências históricas excluídas: `.aioson/briefings/clave/*` (feature `clave` encerrada como abandonada, superada por esta) e protótipos anteriores do Clave — não usados como autoridade.

## Engineering-control evidence and recovery

| Controle | Evidência QA | Resultado |
|---|---|---|
| data/schema (migração v6) | Boot real sobre cópia v5 com WAL: `.bak` v5 com o conteúdo do WAL; tabelas antigas intactas; 2º boot sem duplicar; VT `legacyImport.test.ts` 7/7 | PASS |
| data loss (mídia compartilhada) | W1: apagar a cópia não remove `7d20dee9….jpg` usado pela original (`GET` 200) | PASS |
| retirement | `git status`: caminhos `retire` aparecem como `D ` (removidos e indexados), sem `??`/` M` restantes; rotas antigas do cliente levam à lista (W1 84–87) | PASS |
| identity/concurrency | `replaceSheet` só reconhece ids da própria pauta e gera id novo no servidor (`sheetRepository.ts`); `useAutosave` é fila serial com o retrato mais recente; VT `sheet.test.ts` 24/24 | PASS |
| failure/retry | W1 72–81: falha de `PUT` → aviso, tela não volta atrás, nova tentativa em 5 s grava o estado inteiro (recuperação exercida e confirmada após recarregar) | PASS |
| validation (SEC-SBD-01) | Produção: 422 para caminho fora da pasta, árvore inválida e `fontPx` fora da faixa, sem escrita parcial | PASS |
| upload (SEC-SBD-02) | VT `media.test.ts` 12/12 (assinatura, pdf e extensão forjada recusados) | PASS |
| external URL (SEC-SBD-06) | Links antigos viraram texto; `mediaPath` "../" recusado; nenhum recurso de outra origem (W1 82) | PASS |
| capture privacy | W3 + W1 (contagem no DOM, `spellcheck=false`) | PASS |
| compatibility (Play) | Portas `PORT`/`BACKEND_PORT` respeitadas; catálogo com 15 rotas existentes; VT `platform.test.ts` 13/13 | PASS |

## Regression/security notes

- Suíte inteira verde: 168/168 unit+API e 74/74 e2e.
- Travessia de caminho em `/api/media/*` recusada (400/404) no build de produção.
- Sem `innerHTML`/`dangerouslySetInnerHTML`; colagem lê só `text/plain`; nada do produto em `localStorage`.
- Jev: não configurado neste projeto; revisão semântica pulada (não é bloqueante).
- OBS-2292af (processo): o harness segue `waiting_validation` em `.aioson/plans/pauta-revelavel/progress.json` apesar de `harness:check` 4/4; não afeta o veredito de QA, fica com o fluxo de workflow.
