---
feature: pauta-revelavel
classification: MEDIUM
feature_completeness: required
product_scope: approved
prd_ready: approved
sheldon_review: approved
prototype: .aioson/briefings/pauta-revelavel/prototype.html
prototype_status: current
prototype_feature: pauta-revelavel
identity: .aioson/briefings/pauta-revelavel/identity.md
identity_status: current
---

# PRD: Pauta revelável

## Visão e problema

Quem grava vídeo para o YouTube ou apresenta compartilhando a tela quer que o roteiro apareça **na mesma tela em que foi escrito, só quando chega a hora de falar dele**. Hoje há duas saídas, e as duas falham:

- **Bloco de notas na tela.** O texto aparece na ordem, mas não dá para esconder o que já está escrito e revelar depois. Imagem, vídeo e áudio não ficam na mesma folha, e a aparência é a do editor do sistema.
- **O Clave entregue.** Ele separa compor (Bancada) de apresentar (Palco), pede formulário em vez de colar, não aceita áudio e carrega relógio, "Entrar no ar", trajeto e relatório. O dono usou e concluiu que "não é viável e funcional para este tipo de apresentação" (SRC-001).

A Pauta revelável troca isso por **uma folha pautada que é ao mesmo tempo editor e cenário**. O apresentador cola ou digita texto, imagem, vídeo e áudio numa coluna vertical. Cada bloco começa oculto ou visível, e o apresentador o revela com PageDown, um clique ou um tópico inteiro de uma vez, sem trocar de janela e sem relógio. A captura de tela (OBS ou compartilhamento) mostra exatamente essa folha. O bloco oculto não existe na imagem até ser revelado.

O que torna isto mais que um editor de texto é a regra que nenhum bloco de notas tem: **o que está oculto nunca aparece na captura, e cada tomada pode recomeçar do estado planejado.**

## Usuários

| Usuário | Contexto | O que precisa fazer |
|---|---|---|
| **Apresentador** (primário; o dono, em uso próprio) | Sozinho na máquina que grava, com a tela do app capturada pelo OBS ou pelo compartilhamento | Preparar o roteiro colando e escrevendo, gravar revelando no ritmo da fala, regravar sem refazer a preparação |
| **Público** (indireto, nunca opera o app) | Assiste ao vídeo comprimido, muitas vezes em 720p | Ler cada bloco quando ele aparece e nunca ver o que ainda está oculto |

Uso local, single-user, sem login. O app roda dentro do AIOSON Play.

## Feature Capability Map

| CAP | Promised outcome | Actor / trigger | Scope decision | Rationale |
|---|---|---|---|---|
| CAP-pauta-revelavel-pautas | O apresentador mantém várias pautas e cai direto na última que usou | Apresentador / abrir o app, lista de pautas | required | PROM-001; sem gestão de pautas não existe o segundo vídeo |
| CAP-pauta-revelavel-coluna | A pauta é uma única folha vertical onde se escreve e que a captura mostra, salva sozinha | Apresentador / abrir uma pauta, digitar | required | PROM-005, PROM-009, PROM-010; F1 e F2 da rodada 1 |
| CAP-pauta-revelavel-entrada | Texto, imagem, vídeo e áudio entram por Ctrl+V, por arrastar e soltar ou digitando, já como blocos | Apresentador / colar, soltar, digitar | required | PROM-003, PROM-004; S2, S3, F12 |
| CAP-pauta-revelavel-revelar | Cada bloco aparece só quando o apresentador manda, um por vez ou por tópico, e some de novo quando ele quiser | Apresentador / PageDown, PageUp, clique, Shift+PageDown, F2, nova tomada | required | PROM-006, PROM-007, PROM-008; F3 a F6, F13, F19, S1 |
| CAP-pauta-revelavel-midia | Vídeo e áudio tocam dentro do bloco, no comando do apresentador | Apresentador / clique ou Ctrl+Enter | required | PROM-003; F7, G1 |
| CAP-pauta-revelavel-formatacao | O apresentador escolhe o tamanho de cada bloco, ajusta 4px por vez e destaca trechos com cor e negrito | Apresentador / barra do bloco, seleção de texto, atalhos | required | PROM-013, PROM-014, PROM-015, PROM-017; F15 a F17, F21 |
| CAP-pauta-revelavel-subitens | Blocos viram sub-itens com Tab, até três níveis, e o roteiro ganha estrutura de tópicos | Apresentador / Tab, Shift+Tab, colar lista | required | PROM-016; F18 a F20, S8 |
| CAP-pauta-revelavel-organizar | O apresentador reordena e apaga blocos sem perder o controle do que fez | Apresentador / arraste, Alt+↑/↓, apagar | required | PROM-005, PROM-008; S4; regras `status-flow-drag-and-drop` e `status-change-confirmation` |
| CAP-pauta-revelavel-aparencia | O apresentador escolhe tema, cor de destaque e plano de fundo do app | Apresentador / painel Aparência | required | PROM-011; F8, F9, F14 |
| CAP-pauta-revelavel-migracao | As pautas criadas no Clave antigo continuam disponíveis como pautas reveláveis, e o modelo de live sai do app | Sistema / primeira abertura depois da atualização | required | PROM-002, PROM-012; F1, F10 |
| CAP-pauta-revelavel-tour | Na primeira abertura, um tour de 5 passos explica o uso, e ele pode ser reaberto | Apresentador / primeira abertura, botão "Como usar" | required | Protótipo aprovado (tour com `data-aioson-tour`); preferência `tourSeen` existente |
| CAP-pauta-revelavel-play | O app sobe no AIOSON Play, na porta que o Play alocar, e declara só as rotas que existem | Play / início do processo | required | Contrato Play do projeto (CLAUDE.md, `.aioson/docs/integrations/ai-app-integration.md`) |

## Source Coverage

| Promise | Product decision | CAP / AC | Evidence / rationale |
|---|---|---|---|
| PROM-001 | required | CAP-pauta-revelavel-pautas, CAP-pauta-revelavel-coluna / AC-pauta-revelavel-01, AC-pauta-revelavel-02, AC-pauta-revelavel-07 | SRC-001 mensagem 1: pauta para vídeos e apresentações por vídeo |
| PROM-002 | required | CAP-pauta-revelavel-migracao / AC-pauta-revelavel-12, AC-pauta-revelavel-49 | SRC-001: "sem tempo"; nenhum relógio, execução ou relatório sobrevive |
| PROM-003 | required | CAP-pauta-revelavel-entrada, CAP-pauta-revelavel-midia / AC-pauta-revelavel-16, AC-pauta-revelavel-18, AC-pauta-revelavel-20, AC-pauta-revelavel-33, AC-pauta-revelavel-34 | Texto, áudio, vídeo e imagem; áudio é novo no app |
| PROM-004 | required | CAP-pauta-revelavel-entrada / AC-pauta-revelavel-13, AC-pauta-revelavel-14, AC-pauta-revelavel-15, AC-pauta-revelavel-16, AC-pauta-revelavel-17 | Ctrl+V é o caminho principal; arrastar e soltar cobre o risco R2 (S3) |
| PROM-005 | required | CAP-pauta-revelavel-coluna / AC-pauta-revelavel-07 | Organização vertical |
| PROM-006 | required | CAP-pauta-revelavel-revelar / AC-pauta-revelavel-21, AC-pauta-revelavel-22, AC-pauta-revelavel-23, AC-pauta-revelavel-27, AC-pauta-revelavel-28 | Oculto e revelado por atalho |
| PROM-007 | required | CAP-pauta-revelavel-revelar / AC-pauta-revelavel-22, AC-pauta-revelavel-25 | Clique ou atalho para mostrar e esconder |
| PROM-008 | required | CAP-pauta-revelavel-revelar, CAP-pauta-revelavel-organizar / AC-pauta-revelavel-22, AC-pauta-revelavel-32, AC-pauta-revelavel-44 | A ordem vertical é a ordem de revelar |
| PROM-009 | required | CAP-pauta-revelavel-coluna / AC-pauta-revelavel-07, AC-pauta-revelavel-26 | Sem tela de edição e tela de visualização separadas |
| PROM-010 | required | CAP-pauta-revelavel-coluna / AC-pauta-revelavel-10, AC-pauta-revelavel-11 | Substitui o bloco de notas: escrever ao vivo aparece na hora |
| PROM-011 | required | CAP-pauta-revelavel-aparencia / AC-pauta-revelavel-46 | Cores do app e plano de fundo a partir do design system |
| PROM-012 | required | CAP-pauta-revelavel-migracao, CAP-pauta-revelavel-pautas / AC-pauta-revelavel-06, AC-pauta-revelavel-47, AC-pauta-revelavel-48 | O app atual muda; os dados criados nele seguem com o dono (F10) |
| PROM-013 | required | CAP-pauta-revelavel-formatacao / AC-pauta-revelavel-35 | Opções de tamanho de fonte |
| PROM-014 | required | CAP-pauta-revelavel-formatacao / AC-pauta-revelavel-37, AC-pauta-revelavel-38 | Cores no texto |
| PROM-015 | required | CAP-pauta-revelavel-formatacao / AC-pauta-revelavel-37, AC-pauta-revelavel-39 | Negrito ou normal |
| PROM-016 | required | CAP-pauta-revelavel-subitens / AC-pauta-revelavel-40, AC-pauta-revelavel-41, AC-pauta-revelavel-42, AC-pauta-revelavel-43, AC-pauta-revelavel-24 | Tab cria sub-item |
| PROM-017 | required | CAP-pauta-revelavel-formatacao / AC-pauta-revelavel-36 | Aumentar ou diminuir o tamanho para o Título não ficar exagerado |

### Trace de decisões de review

`refinement-report.md` traz `Status: applied` e `Approved review authority: binding` para a rodada 4, ligada ao arquivo exato `refinement-feedback.applied-round4.json`.

| Decisão | Estado | Onde entra neste PRD |
|---|---|---|
| F21: Título menor + A−/A+ no bloco (`titulo-menor-ajuste-bloco`) | accepted, binding | CAP-pauta-revelavel-formatacao; AC-pauta-revelavel-35, AC-pauta-revelavel-36 |

As rodadas 1 a 3 foram aplicadas antes da rodada 4 e estão incorporadas no texto do `briefings.md` aprovado. Este PRD as trata como conteúdo canônico do briefing; os arquivos de origem são `refinement-feedback.applied-round1.json`, `-round2.json` e `-round3.json`.

| Rodada | Decisões aceitas | Onde entram |
|---|---|---|
| 1 | F1 substituir; F2 público vê; F3 some + preparo; F4 bloco inteiro; F5 nasce oculto; F6 planejado × progresso + nova tomada; F7 toca no comando; F8 temas + destaque + fundo; F9 app inteiro; F10 migrar; F11 texto puro (revisto na rodada 2); F12 URL vira texto; F13 PgDn/PgUp; F14 identidade a partir de Tinta & Ouro; S1 rolagem; S2 dividir por linha em branco; S3 arrastar arquivos; S4 reordenar; G1 falhas de mídia; G2 salvamento automático; A1 vocabulário. S5, S6 e S7 ficaram adiados | CAP coluna, entrada, revelar, mídia, organizar, aparência, migração |
| 2 | F15 tamanho no bloco, cor e negrito no trecho; F16 paleta do tema, 6 cores; F17 4 tamanhos prontos | CAP formatação |
| 3 | F18 bloco inteiro recua; F19 um por vez + Shift+PgDn; F20 marcador por nível; S8 colar lista, recolher no preparo, tamanho menor, linha-guia | CAP sub-itens, revelar |

## Current System Fit

Inspeção do repositório em 2026-11-11 (commit `72a229f` mais o trabalho não commitado). O app entregue é React/Vite com Express + SQLite (`better-sqlite3`) e migrações por `PRAGMA user_version` (versão atual 5).

| CAP | Existing behavior / evidence | Fit decision | Required product delta |
|---|---|---|---|
| CAP-pauta-revelavel-pautas | `src/features/rundowns/RundownListPage.tsx` e `RundownForm.tsx` listam, criam, renomeiam, duplicam, fixam e apagam pautas; `server/src/routes/rundowns.ts` expõe `/api/rundowns`, `/:id/duplicate`, `/:id/toggle-pin`, `/:id/open`. Ao iniciar, `src/App.tsx` abre `rundowns[0]` de uma lista que `server/src/repositories/rundownRepository.ts` ordena por `pinned DESC, last_opened_at DESC`, então hoje uma pauta fixada ganha da última usada; o carregamento mostra `src/ui/LoadingSkeleton.tsx` e a falha mostra `src/ui/ErrorBanner.tsx` com "Tentar de novo". O resumo da lista conta `trackBlockCount`, `rescueBlockCount` e `plannedMinutes`, e o formulário pede `kind` (pauta, apresentação, evento) | extend | Manter criar, abrir, renomear, duplicar, fixar e apagar. A reabertura passa a escolher a pauta aberta por último, mesmo havendo fixadas; a lista continua com as fixadas primeiro. Manter o carregamento e o erro com "Tentar de novo". Trocar o resumo por blocos e "na tela no início", retirar `kind` da interface, mostrar o selo "veio da versão anterior" nas migradas |
| CAP-pauta-revelavel-coluna | Não existe superfície única: `src/features/board/` (Bancada com `BlockDrawer.tsx` em modal) compõe e `src/features/stage/` (Palco) apresenta, em rotas separadas de `src/core/router.ts`. O estado vive em `src/core/store.ts` (zustand) e persiste via API; `src/features/stage/beats.ts` já revela pontos um por vez dentro do Palco | replace | Uma rota de pauta com a coluna editável e capturável ao mesmo tempo, régua, contador e salvamento automático, sem modal de edição |
| CAP-pauta-revelavel-entrada | Nenhum tratamento de colagem em `src/` (`onPaste`/`clipboardData` sem ocorrência). A mídia entra por formulário (`src/features/board/AttachmentFields.tsx`) e é gravada por `server/src/services/mediaService.ts`, que confere assinatura por extensão (png, jpg, gif, webp, webm/mkv, mp4/m4v/mov, mp3, wav, pdf, txt/md/json/csv) e recusa acima de 512 MB (`MAX_UPLOAD_BYTES`) | extend | Reaproveitar a gravação e a validação de mídia; acrescentar colar, soltar, divisão de texto, lista como hierarquia e falhas no próprio bloco |
| CAP-pauta-revelavel-revelar | `src/features/stage/useStageShortcuts.ts` avança com espaço/→ e volta com ←, só dentro do Palco; o `Beat` tem `done` ("já falado"), não um estado de visibilidade; não há estado planejado separado do progresso | replace | Estado planejado por bloco e progresso da tomada separados e persistidos; PgDn, PgUp, Shift+PgDn, olho, preparo e nova tomada |
| CAP-pauta-revelavel-midia | `src/features/attachments/AttachmentViewer.tsx` e `videoSource.ts` abrem vídeo e imagem no Palco; `ATTACHMENT_TYPES` em `shared/types.ts` não tem áudio | extend | Reprodução dentro do bloco por comando, áudio novo, estado "arquivo não encontrado" |
| CAP-pauta-revelavel-formatacao | O bloco não tem tamanho nem formatação: `Block.title` e `Beat.text` são texto simples em `shared/types.ts` | new | Tamanho por bloco com faixa e ajuste de 4px; negrito e 6 cores por trecho, persistidos como marcas fechadas |
| CAP-pauta-revelavel-subitens | `Beat.depth` (0 a 2) numa lista plana, validado em `shared/validation/beat.ts` (primeiro nível 0, sem salto de mais de um nível), com subir e descer movendo a subárvore; vale só para pontos dentro de um bloco (`.aioson/context/simple-plans/pontos-aninhados.md`) | extend | Levar o mesmo modelo para o bloco da coluna (qualquer tipo), com Tab, marcador, linha-guia, revelar tópico e recolher no preparo |
| CAP-pauta-revelavel-organizar | A Bancada reordena com `@dnd-kit` (`src/features/board/TrackCanvas.tsx`) e `POST /api/rundowns/:id/track/reorder`; exclusão confirma por `src/ui/Modal.tsx`; toasts em `src/ui/Toast.tsx` | extend | Reordenar a coluna por arraste e teclado levando a subárvore, com "Desfazer" no toast; apagar com modal |
| CAP-pauta-revelavel-aparencia | Identidade "Tinta & Ouro" fixa em `src/ui/tokens.css`; preferências só guardam `tourSeen` (`server/src/services/preferenceService.ts`, `shared/types.ts` `Preferences`) | extend | Tokens parametrizados por tema, cor de destaque e fundo; preferências de aparência persistidas para o app inteiro |
| CAP-pauta-revelavel-migracao | Pautas, blocos, pontos e anexos em `server/src/db/schema.sql`; tabelas `runs`, `run_steps`, `run_cuts` e `library_items`; migrações aditivas em `server/src/db/migrations.ts` com backup antes de aplicar (aprendizado `.aioson/learnings/gotchas/backup-de-migracao-em-wal-copia-um-banco-vazio.md`) | extend | Migração aditiva que converte as pautas antigas, sem apagar tabelas antigas; remoção das superfícies e rotas de live |
| CAP-pauta-revelavel-tour | `src/features/guide/TourOverlay.tsx`, `src/features/guide/GuidePanel.tsx` e `src/features/guide/guideContent.ts` com tour e guia do Clave antigo, controlado por `tourSeen` | replace | Novo tour de 5 passos da coluna, mantendo `tourSeen` e o botão "Como usar" |
| CAP-pauta-revelavel-play | `manifest.json` split-stack (`PORT`, `BACKEND_PORT`), `GET /api/aioson-play` gerado de `server/src/http/apiCatalog.ts` com rotas de execução e acervo | extend | Manter o contrato e retirar do catálogo as rotas que deixarem de existir |

## Escopo do MVP

A Pauta revelável inteira, substituindo a superfície do Clave:

1. **Pautas e coluna**: lista de pautas, coluna única, régua, salvamento automático (CAP pautas, coluna).
2. **Entrada**: digitar, colar, soltar, dividir texto, lista como hierarquia, falhas de mídia (CAP entrada).
3. **Revelação**: planejado × progresso, PgDn/PgUp, olho, tópico inteiro, preparo, nova tomada, rolagem (CAP revelar).
4. **Mídia**: imagem, vídeo e áudio no bloco, tocando no comando (CAP mídia).
5. **Formatação e sub-itens**: tamanhos com ajuste, cor e negrito por trecho, Tab e Shift+Tab, marcador, linha-guia, recolher (CAP formatação, sub-itens, organizar).
6. **Aparência**: 5 temas, destaque, fundo (CAP aparência).
7. **Migração e limpeza**: pautas antigas convertidas, modelo de live retirado (CAP migração).
8. **Tour e Play**: tour novo e contrato do Play (CAP tour, play).

## Fora de escopo

| Excluído | Estado | Razão |
|---|---|---|
| Gravar ou transmitir pelo próprio app; cronômetros; "Entrar no ar"; trajeto; relatório | fora | PROM-002 e decisão F1 |
| Bancada e Palco separados; segunda tela só do apresentador | fora | PROM-009 e F2 |
| Tipos de bloco, duração prevista, cartas de resgate, Acervo, curva de energia | fora | Estrutura de live do Clave antigo (F1) |
| Desfazer geral com Ctrl+Z, modo limpo para captura, destaque do bloco atual | adiado | S5, S6, S7 ficaram sem recomendação e foram adiados na rodada 1. O "Desfazer" da reordenação fica dentro do escopo por exigência da regra `status-flow-drag-and-drop` |
| Revelação linha a linha e efeito de digitação | adiado | Alternativas de F4 não escolhidas |
| Escala global da pauta e cor de texto livre | adiado | Alternativas de F17/F21 e F16 não escolhidas |
| URL colada como link clicável ou vídeo incorporado | adiado | F12: URL vira texto |
| Formatação além de negrito e 6 cores (títulos internos, listas internas, links, fontes) | fora | F15 e risco R8 |
| Notas privadas do Clave antigo na coluna | adiado | Não existe camada privada; as notas ficam no disco, sem uso (pergunta 5) |
| Login, colaboração, sincronização entre máquinas | fora | Uso local single-user |

## Fluxos

**Preparar uma pauta**
1. O apresentador abre o app e cai na última pauta usada, ou cria uma pela lista.
2. Com o preparo ligado (F2), cola o roteiro. Cada linha em branco vira um bloco, uma lista com recuo vira tópicos e sub-itens, e um print, vídeo ou áudio vira bloco de mídia com progresso de gravação.
3. Ajusta tamanhos, destaca trechos com cor e negrito, recua com Tab, reordena por arraste e marca o que deve começar visível.
4. Desliga o preparo. A faixa de aviso some e só o planejado como visível fica na tela.
- Falhas visíveis: formato não suportado, arquivo grande demais, falha ao gravar e "Falha ao salvar · nova tentativa em 5 s" aparecem no lugar, sem travar a coluna.

**Gravar**
1. Com a captura ligada, o apresentador aperta PageDown (ou o passador de slides) e cada bloco entra com a animação de tinta, e a folha rola até ele.
2. Shift+PageDown traz um tópico inteiro. PageUp desfaz o último passo. O olho esconde um bloco específico.
3. Ctrl+Enter toca o vídeo ou o áudio revelado.
4. Ao revelar o último bloco, aparece "Fim da pauta · tudo na tela".
- Se ele digitar algo com o preparo desligado, o texto aparece na hora, como no bloco de notas, e fica planejado como oculto para as próximas tomadas.

**Regravar**
1. "Nova tomada" pede confirmação com a contagem de visíveis e ocultos.
2. Tudo volta ao planejado, sem perder conteúdo. Se o app fechar no meio de uma tomada, o progresso volta como estava.

**Ajustar a aparência**
1. O painel Aparência troca o tema, a cor de destaque (com aviso de contraste) e o fundo. A mudança vale para todas as pautas e sobrevive ao reinício.

**Primeira abertura depois da atualização**
1. As pautas do Clave antigo aparecem na lista com o selo "veio da versão anterior". Bancada, Palco, Acervo e relatório não existem mais.

## Business Rules

| Rule | Statement | Kind | Applies to | Source |
|---|---|---|---|---|
| RULE-pauta-revelavel-01 | Com o preparo desligado, nenhuma parte de um bloco oculto é renderizada: nem conteúdo, nem espaço, nem marca de corretor, nem foco | invariant | CAP-pauta-revelavel-revelar | Risco R3; F3 |
| RULE-pauta-revelavel-02 | Cada bloco guarda o estado planejado (começa oculto ou visível) separado do progresso da tomada; nova tomada volta ao planejado; o progresso persiste | invariant | CAP-pauta-revelavel-revelar | F6 |
| RULE-pauta-revelavel-03 | Um bloco só aparece se todos os ancestrais aparecem | invariant | CAP-pauta-revelavel-revelar, CAP-pauta-revelavel-subitens | F19 |
| RULE-pauta-revelavel-04 | Árvore válida: o primeiro bloco fica no nível 0, nenhum bloco fica mais de um nível abaixo do anterior, o nível máximo é 2; toda mudança normaliza, e o servidor recusa árvore inválida | invariant | CAP-pauta-revelavel-subitens, CAP-pauta-revelavel-organizar | R11; pontos aninhados do Clave antigo |
| RULE-pauta-revelavel-05 | O tamanho do texto fica dentro da faixa do tamanho escolhido (P 18–26, M 26–34, G 34–42, Título 44–72 px), em passos de 4px | rule | CAP-pauta-revelavel-formatacao | F17, F21 |
| RULE-pauta-revelavel-06 | Só negrito e as 6 cores do tema são guardados no texto; qualquer outra marcação é descartada | invariant | CAP-pauta-revelavel-formatacao, CAP-pauta-revelavel-entrada | F15, F16, R8 |
| RULE-pauta-revelavel-07 | Mídia aceita só os formatos com assinatura conferida e até 512 MB | rule | CAP-pauta-revelavel-entrada, CAP-pauta-revelavel-midia | `mediaService.ts` |
| RULE-pauta-revelavel-08 | Toda mudança é salva sem botão; nenhum dado do produto vai para `localStorage` | invariant | CAP-pauta-revelavel-coluna | G2; plano original |
| RULE-pauta-revelavel-09 | A migração é aditiva e idempotente, com backup consistente antes de escrever; tabelas antigas ficam no disco | invariant | CAP-pauta-revelavel-migracao | F10; `.aioson/learnings/gotchas/backup-de-migracao-em-wal-copia-um-banco-vazio.md` |
| RULE-pauta-revelavel-10 | Aparência vale para o app inteiro | rule | CAP-pauta-revelavel-aparencia | F9 |
| RULE-pauta-revelavel-11 | Revelar e ocultar nunca esperam o salvamento: a tela responde primeiro e o salvamento segue em segundo plano | invariant | CAP-pauta-revelavel-revelar | Gravação ao vivo (PROM-006); salvamento automático (G2) |

## Decision Branches

| Branch | Condition | Expected behavior | AC |
|---|---|---|---|
| BR-pauta-revelavel-01 | Bloco criado com o preparo desligado | Aparece na hora e fica planejado "começa oculto" | AC-pauta-revelavel-10 |
| BR-pauta-revelavel-02 | Bloco criado com o preparo ligado | Nasce esmaecido, planejado "começa oculto" | AC-pauta-revelavel-28 |
| BR-pauta-revelavel-03 | Colagem traz arquivos | Cria blocos de mídia | AC-pauta-revelavel-16 |
| BR-pauta-revelavel-04 | Colagem traz texto com marcadores ou recuo | Cria a hierarquia de blocos | AC-pauta-revelavel-15 |
| BR-pauta-revelavel-05 | Colagem traz texto comum, fora da edição | Um bloco por parágrafo separado por linha em branco | AC-pauta-revelavel-13 |
| BR-pauta-revelavel-06 | Colagem de texto com o cursor dentro de um bloco | Insere no cursor; parágrafos seguintes viram blocos | AC-pauta-revelavel-14 |
| BR-pauta-revelavel-07 | Enter duas vezes no fim de um bloco que tem sub-itens | O novo bloco vira o primeiro sub-item | AC-pauta-revelavel-11 |
| BR-pauta-revelavel-08 | Tab sem tópico logo acima, ou passando do nível 2 | Recusa com toast e não muda | AC-pauta-revelavel-40 |
| BR-pauta-revelavel-09 | Ctrl+Enter | Toca o bloco de mídia selecionado; se não houver, o último revelado | AC-pauta-revelavel-33 |
| BR-pauta-revelavel-10 | Apagar um bloco de falha de mídia | Sai sem confirmação; os demais confirmam | AC-pauta-revelavel-45 |
| BR-pauta-revelavel-11 | Ocultar pelo olho um tópico com sub-itens | Os sub-itens somem junto | AC-pauta-revelavel-25 |
| BR-pauta-revelavel-12 | Tab com o cursor num texto, ou com um bloco selecionado e o foco na folha | Recua o bloco; com o foco num botão ou campo, o Tab navega normalmente | AC-pauta-revelavel-40, AC-pauta-revelavel-53 |
| BR-pauta-revelavel-13 | Endereço de pauta inexistente (apagada ou id inválido) | Leva à lista de pautas | AC-pauta-revelavel-57 |
| BR-pauta-revelavel-14 | Salvamento falha durante a gravação | A tela não volta atrás; o aviso aparece e o app tenta de novo | AC-pauta-revelavel-55, AC-pauta-revelavel-09 |

## Métricas de sucesso

Alvos propostos, sem medição prévia e sem instrumentação nova:

- O dono grava pelo menos um vídeo completo usando só a pauta revelável, sem trocar de janela. Medido em uso próprio nas primeiras duas semanas.
- Zero vazamento de bloco oculto na captura: QA grava a tela com OBS ou compartilhamento e confere quadro a quadro um roteiro de 10 blocos.
- Colar um roteiro de 10 parágrafos produz 10 blocos com um Ctrl+V, e uma lista de 3 níveis produz a hierarquia certa.
- Uma nova tomada leva um comando e uma confirmação.

## Prototype contract

- status: current
- feature: pauta-revelavel
- prototype: .aioson/briefings/pauta-revelavel/prototype.html
- manifest: .aioson/briefings/pauta-revelavel/prototype-manifest.md
- manifest status: approved em 2026-11-11
- identity: .aioson/briefings/pauta-revelavel/identity.md
- Interações vinculantes: as de `## Core interactions` do manifesto (digitar, colar, soltar, revelar, ocultar, olho, preparo, nova tomada, mover, apagar, tocar mídia, formatar, tamanhos, sub-itens, recolher, aparência, lista de pautas, tour).
- Passeio do protótipo: `.aioson/briefings/pauta-revelavel/walkthrough.json`, 123 de 123 passos, as 17 promessas provadas. É evidência de desenho, não de entrega.

### Interações do protótipo → AC

| Interação (manifesto) | AC |
|---|---|
| digitar no bloco | AC-pauta-revelavel-10, AC-pauta-revelavel-11 |
| colar texto | AC-pauta-revelavel-13, AC-pauta-revelavel-14 |
| dividir por linha em branco | AC-pauta-revelavel-13 |
| colar imagem | AC-pauta-revelavel-16 |
| colar vídeo | AC-pauta-revelavel-16 |
| colar áudio | AC-pauta-revelavel-16 |
| soltar arquivo | AC-pauta-revelavel-17 |
| escolher tamanho do bloco | AC-pauta-revelavel-35 |
| aumentar tamanho do bloco | AC-pauta-revelavel-36 |
| diminuir tamanho do bloco | AC-pauta-revelavel-36 |
| aplicar cor no trecho | AC-pauta-revelavel-37 |
| aplicar negrito no trecho | AC-pauta-revelavel-37 |
| voltar o trecho ao normal | AC-pauta-revelavel-37 |
| enter duas vezes abre bloco | AC-pauta-revelavel-11 |
| tab cria sub-item | AC-pauta-revelavel-40 |
| shift+tab volta um nível | AC-pauta-revelavel-40 |
| revelar tópico com sub-itens | AC-pauta-revelavel-24 |
| ocultar tópico com sub-itens | AC-pauta-revelavel-25 |
| mover tópico com sub-itens | AC-pauta-revelavel-42 |
| colar lista vira sub-itens | AC-pauta-revelavel-15 |
| recolher tópico no preparo | AC-pauta-revelavel-43 |
| apagar tópico sobe os sub-itens | AC-pauta-revelavel-42 |
| revelar próximo | AC-pauta-revelavel-22 |
| ocultar último | AC-pauta-revelavel-23 |
| ocultar bloco pelo olho | AC-pauta-revelavel-25 |
| mostrar bloco pelo olho | AC-pauta-revelavel-25 |
| ligar preparo | AC-pauta-revelavel-28 |
| desligar preparo | AC-pauta-revelavel-28 |
| começa oculto | AC-pauta-revelavel-21, AC-pauta-revelavel-28 |
| começa visível | AC-pauta-revelavel-28 |
| nova tomada | AC-pauta-revelavel-29 |
| mover bloco | AC-pauta-revelavel-44 |
| apagar bloco | AC-pauta-revelavel-45 |
| tocar mídia | AC-pauta-revelavel-33 |
| rolagem automática | AC-pauta-revelavel-22 |
| procurar arquivo ausente | AC-pauta-revelavel-34 |
| tentar de novo | AC-pauta-revelavel-18 |
| criar pauta | AC-pauta-revelavel-02 |
| abrir pauta | AC-pauta-revelavel-01 |
| renomear pauta | AC-pauta-revelavel-03 |
| duplicar pauta | AC-pauta-revelavel-04 |
| apagar pauta | AC-pauta-revelavel-05 |
| escolher tema | AC-pauta-revelavel-46 |
| escolher cor de destaque | AC-pauta-revelavel-46 |
| escolher plano de fundo | AC-pauta-revelavel-46 |
| reabrir o tour | AC-pauta-revelavel-50 |

### Estados materiais

- loading: abertura do app e de uma pauta (esqueleto de carregamento, AC-pauta-revelavel-57), mídia sendo gravada na pasta ("Gravando {nome} na pasta de mídia", AC-pauta-revelavel-16) e salvamento em andamento ("Salvando", AC-pauta-revelavel-09).
- empty: lista sem pautas (AC-pauta-revelavel-01) e pauta sem blocos, "Folha em branco." (AC-pauta-revelavel-02).
- error: falhas de mídia (AC-pauta-revelavel-18, AC-pauta-revelavel-34), falha ao salvar (AC-pauta-revelavel-09, AC-pauta-revelavel-55) e servidor local fora do ar (AC-pauta-revelavel-57).
- success: "Fim da pauta · tudo na tela" (AC-pauta-revelavel-32) e "Salvo às HH:MM" (AC-pauta-revelavel-08).
- permission-denied: não se aplica. O uso é local, single-user, sem login nem papéis.

Desvios aprovados neste PRD:

| Desvio | Protótipo | Produto | Razão |
|---|---|---|---|
| D1 | O toast de "Bloco movido" não tem "Desfazer" | Reordenar mostra toast com "Desfazer" que volta à ordem anterior | Regra `status-flow-drag-and-drop` (vinculante sobre o PRD) |
| D2 | Mensagem "O limite é 2 GB por arquivo" | Limite de 512 MB, o que o app já valida | Fronteira existente e testada em `mediaService.ts` |
| D3 | A lista não mostra fixar pauta | Fixar continua, com as fixadas primeiro | Comportamento existente do app; não conflita com nenhuma decisão |
| D4 | O tour abre em toda carga (estado em memória) | O tour abre só na primeira abertura e reabre por "Como usar" | Preferência `tourSeen` existente; o protótipo não persiste |
| D5 | Vídeo de exemplo em canvas, áudio de tom gerado, gravação simulada, formatação por `execCommand`, estado em memória | Mídia real, gravação real, editor com marcas fechadas, persistência real | Simplificações declaradas do mock; não são contrato |

## Identidade visual

`identity: .aioson/briefings/pauta-revelavel/identity.md` (current, `scope: briefing`, adaptada de "Tinta & Ouro").

Ela vincula a paleta dos 5 temas e as 6 cores de texto por tema, as três vozes tipográficas e as fontes servidas localmente, a escala de conteúdo com as faixas de tamanho, a pauta com passo de 44px, o recuo e o marcador de sub-item, a profundidade só por bordas e o movimento "tinta assentando" com variante de movimento reduzido. A composição fica com o protótipo e o design engine (`interface-design`).

## Acceptance Criteria

| AC | CAP | Observable behavior | Evidence |
|---|---|---|---|
| AC-pauta-revelavel-01 | CAP-pauta-revelavel-pautas | Ao abrir o app, a última pauta aberta aparece direto; sem nenhuma pauta, a lista mostra "Nenhuma pauta ainda." e "Criar a primeira pauta". A pauta aberta é a de abertura mais recente, mesmo que outra esteja fixada | e2e test |
| AC-pauta-revelavel-02 | CAP-pauta-revelavel-pautas | "Nova pauta" abre um modal com o campo "Nome da pauta"; nome vazio mostra "Dê um nome à pauta, por exemplo "Episódio 12: filas"." inline com `aria-invalid` e não cria; o servidor também recusa nome vazio; a pauta criada abre em "Folha em branco." | e2e test drives the form + api test |
| AC-pauta-revelavel-03 | CAP-pauta-revelavel-pautas | Renomear pela lista (modal "Renomear pauta") e pelo título na régua grava o novo nome, que aparece igual na lista e sobrevive ao reinício | e2e test |
| AC-pauta-revelavel-04 | CAP-pauta-revelavel-pautas | "Duplicar" cria "{nome} (cópia)" logo abaixo, com todos os blocos (conteúdo, nível, tamanho, ajuste, formatação, planejado, mídia) e com o progresso da tomada zerado | api test + e2e test |
| AC-pauta-revelavel-05 | CAP-pauta-revelavel-pautas | Apagar pauta abre o modal "Apagar pauta?" com a consequência e "Não dá para desfazer."; Cancelar e Esc mantêm a pauta; "Apagar pauta" a remove da lista e da pasta de mídia; arquivos de mídia que outra pauta também usa (por exemplo, uma cópia) continuam na pasta | e2e test (confirm and cancel) |
| AC-pauta-revelavel-06 | CAP-pauta-revelavel-pautas | Cada linha da lista mostra a contagem de blocos, quantos "na tela no início", "editada há…", o selo "veio da versão anterior" nas migradas e o controle de fixar; fixadas aparecem primeiro; as linhas são identificadas pelo id persistido | e2e test |
| AC-pauta-revelavel-07 | CAP-pauta-revelavel-coluna | A pauta abre numa única coluna vertical; editar um texto e revelar com PageDown acontecem na mesma rota, sem modal de edição nem tela de apresentação | e2e test |
| AC-pauta-revelavel-08 | CAP-pauta-revelavel-coluna | A régua mostra o nome editável, "N de M na tela", o estado de salvamento ("Salvando" e "Salvo às HH:MM"), "Ocultar último", "Revelar próximo", "Preparo", "Nova tomada", "Aparência" e "Como usar" | e2e test |
| AC-pauta-revelavel-09 | CAP-pauta-revelavel-coluna | Toda mudança é salva sem botão; ao reiniciar o app voltam conteúdo, ordem, níveis, tamanhos, ajustes, formatação, planejado e progresso; se a gravação falhar, aparece "Falha ao salvar · nova tentativa em 5 s" e o app tenta de novo; nada do produto é guardado em `localStorage` (prova RULE-pauta-revelavel-08) | api test + e2e test |
| AC-pauta-revelavel-10 | CAP-pauta-revelavel-coluna | Com o preparo desligado, clicar em "Clique para escrever, cole (Ctrl+V) ou solte um arquivo" cria um bloco de texto focado que aparece na hora; ele fica planejado "começa oculto" e some na próxima tomada | e2e test |
| AC-pauta-revelavel-11 | CAP-pauta-revelavel-coluna | Enter quebra linha dentro do bloco; Enter duas vezes no fim cria o próximo bloco no mesmo nível (ou o primeiro sub-item, se o atual tem sub-itens); Backspace num bloco vazio apaga o bloco e sobe os sub-itens dele | e2e test |
| AC-pauta-revelavel-12 | CAP-pauta-revelavel-migracao | Nenhuma tela mostra cronômetro, "Entrar no ar", trajeto ou relatório; as rotas antigas de Bancada, Palco, Acervo e relatório levam à lista de pautas | e2e test |
| AC-pauta-revelavel-13 | CAP-pauta-revelavel-entrada | Ctrl+V de texto fora da edição cria um bloco por parágrafo separado por linha em branco, depois do bloco selecionado e dos sub-itens dele e no mesmo nível; quebras do Windows (CRLF) se comportam igual; a formatação de origem é descartada | e2e test |
| AC-pauta-revelavel-14 | CAP-pauta-revelavel-entrada | Ctrl+V de texto com o cursor dentro de um bloco insere no cursor, sem formatação de origem; o que vem depois de uma linha em branco vira blocos seguintes | e2e test |
| AC-pauta-revelavel-15 | CAP-pauta-revelavel-entrada | Colar uma lista com "-", "*", "•", "1." ou recuo por tab ou espaços cria um bloco por item, com o nível dado pela ordem dos recuos (até 3 níveis) e os sub-itens no tamanho P | unit test + e2e test |
| AC-pauta-revelavel-16 | CAP-pauta-revelavel-entrada | Ctrl+V de um print ou de um arquivo de imagem, vídeo ou áudio cria um bloco de mídia; enquanto grava mostra "Gravando {nome} na pasta de mídia" com progresso; depois de gravado, o arquivo está na pasta de mídia e sobrevive ao reinício | api test + e2e test |
| AC-pauta-revelavel-17 | CAP-pauta-revelavel-entrada | Arrastar arquivos sobre a janela mostra "Solte para criar blocos aqui"; soltar cria os blocos na posição do soltar | e2e test |
| AC-pauta-revelavel-18 | CAP-pauta-revelavel-entrada | Formato não aceito cria um bloco "Formato não suportado" com o nome e "Remover bloco"; acima de 512 MB, "Arquivo grande demais" com o tamanho e o limite; falha ao gravar, "Não deu para gravar a mídia" com "Tentar de novo"; em todos os casos a coluna e os atalhos continuam funcionando. "Tentar de novo" grava outra vez e, dando certo, o bloco vira a mídia (prova RULE-pauta-revelavel-07) | api test + e2e test |
| AC-pauta-revelavel-19 | CAP-pauta-revelavel-entrada | Uma URL colada vira um bloco de texto com a URL | e2e test |
| AC-pauta-revelavel-20 | CAP-pauta-revelavel-entrada | São aceitos png, jpg, gif, webp, mp4, m4v, mov, webm, mkv, mp3 e wav; um arquivo cuja assinatura não bate com a extensão é recusado (prova RULE-pauta-revelavel-07) | api test |
| AC-pauta-revelavel-21 | CAP-pauta-revelavel-revelar | Cada bloco guarda "começa oculto" ou "começa visível" separado do progresso da tomada; um bloco novo nasce "começa oculto" (prova RULE-pauta-revelavel-02) | unit test |
| AC-pauta-revelavel-22 | CAP-pauta-revelavel-revelar | PageDown e o botão "Revelar próximo" mostram o primeiro bloco ainda não visível na ordem vertical, um por vez, atravessando níveis, e a folha rola até ele; com tudo visível aparece "Tudo já está na tela."; numa pauta vazia, "A pauta está vazia. Cole ou escreva o primeiro bloco." | e2e test |
| AC-pauta-revelavel-23 | CAP-pauta-revelavel-revelar | PageUp e "Ocultar último" escondem o último bloco revelado; sem nada revelado na tomada, aparece "Nada foi revelado nesta tomada ainda." | e2e test |
| AC-pauta-revelavel-24 | CAP-pauta-revelavel-revelar | Shift+PageDown revela o próximo tópico com todos os sub-itens; um PageUp esconde o grupo inteiro | e2e test |
| AC-pauta-revelavel-25 | CAP-pauta-revelavel-revelar | O olho de um bloco o esconde ou mostra sozinho; esconder um tópico esconde os sub-itens; um toast confirma (prova RULE-pauta-revelavel-03) | e2e test |
| AC-pauta-revelavel-26 | CAP-pauta-revelavel-revelar | PageDown, PageUp, Shift+PageDown e F2 funcionam com o cursor dentro de um texto, sem inserir nada nele | e2e test |
| AC-pauta-revelavel-27 | CAP-pauta-revelavel-revelar | Com o preparo desligado, um bloco oculto não existe na página renderizada e não aparece numa captura de tela da janela. Nenhum bloco visível mostra sublinhado de corretor ortográfico (prova RULE-pauta-revelavel-01) | e2e test + manual capture check |
| AC-pauta-revelavel-28 | CAP-pauta-revelavel-revelar | F2 e o botão "Preparo" ligam a visão de preparo: os ocultos aparecem esmaecidos com hachura, cada bloco mostra "começa oculto" ou "começa visível" (clicável para trocar) e a faixa "Preparo ligado" avisa para não gravar; desligar remove tudo isso | e2e test |
| AC-pauta-revelavel-29 | CAP-pauta-revelavel-revelar | "Nova tomada" abre o modal "Começar uma nova tomada?" com a contagem de visíveis e ocultos no singular ou plural correto; confirmar volta tudo ao planejado e rola ao topo; cancelar mantém o progresso. Esc também cancela (prova RULE-pauta-revelavel-02) | e2e test (confirm and cancel) |
| AC-pauta-revelavel-30 | CAP-pauta-revelavel-revelar | O progresso da tomada sobrevive se o app fechar no meio de uma gravação (prova RULE-pauta-revelavel-02) | e2e test |
| AC-pauta-revelavel-31 | CAP-pauta-revelavel-revelar | "N de M na tela" conta só o que está de fato visível, sem contar o sub-item cujo tópico está oculto (prova RULE-pauta-revelavel-03) | unit test |
| AC-pauta-revelavel-32 | CAP-pauta-revelavel-revelar | Ao revelar o último bloco aparece "Fim da pauta · tudo na tela" | e2e test |
| AC-pauta-revelavel-33 | CAP-pauta-revelavel-midia | Vídeo e áudio aparecem parados; o botão do bloco ou Ctrl+Enter toca dentro do bloco (Ctrl+Enter vale para o bloco de mídia selecionado ou, sem seleção, para o último revelado); repetir pausa; sem mídia na tela aparece "Nenhum vídeo ou áudio na tela."; ocultar o bloco para a mídia | e2e test |
| AC-pauta-revelavel-34 | CAP-pauta-revelavel-midia | Mídia ausente na pasta aparece como "Arquivo não encontrado" com "Procurar o arquivo" e "Remover bloco", inclusive com o preparo desligado; nunca como bloco vazio. Escolher um arquivo em "Procurar o arquivo" recria o bloco no mesmo lugar | api test + e2e test |
| AC-pauta-revelavel-35 | CAP-pauta-revelavel-formatacao | Ao focar ou apontar um bloco de texto, a barra acima dele mostra P, M, G e Título; Ctrl+Alt+1 a 4 fazem o mesmo; os padrões são 22, 30, 38 e 52px; trocar de tamanho zera o ajuste; o Título usa entrelinha justa e o bloco seguinte volta às linhas da pauta | e2e test |
| AC-pauta-revelavel-36 | CAP-pauta-revelavel-formatacao | A− e A+ mudam o bloco em 4px dentro da faixa do tamanho (P 18–26, M 26–34, G 34–42, Título 44–72), mostram o valor em px, ficam desativados no limite e respondem a Ctrl+Alt+− e Ctrl+Alt+=; o ajuste persiste (prova RULE-pauta-revelavel-05) | e2e test |
| AC-pauta-revelavel-37 | CAP-pauta-revelavel-formatacao | Selecionar um trecho mostra a barra com Negrito, Texto, Destaque, Vermelho, Verde, Cobre, Lilás e Normal; Ctrl+B aplica negrito; cor e negrito valem só para o trecho; Normal remove os dois; a formatação persiste | e2e test |
| AC-pauta-revelavel-38 | CAP-pauta-revelavel-formatacao | As 6 cores de texto mudam com o tema e, em cada um dos 5 temas, têm contraste de pelo menos 4,5:1 sobre a folha | unit test + manual visual check |
| AC-pauta-revelavel-39 | CAP-pauta-revelavel-formatacao | Ao salvar, o texto guarda só negrito, as 6 cores e quebras de linha; qualquer outra marcação, inclusive HTML vindo de colagem, é descartada (prova RULE-pauta-revelavel-06) | unit test |
| AC-pauta-revelavel-40 | CAP-pauta-revelavel-subitens | Tab (ou Alt+→) recua o bloco selecionado de qualquer tipo para sub-item, levando os sub-itens dele; Shift+Tab (ou Alt+←) volta um nível; sem tópico logo acima, ou passando do nível 2, um toast recusa e nada muda; ao recuar, um texto desce um tamanho e ao voltar sobe | e2e test |
| AC-pauta-revelavel-41 | CAP-pauta-revelavel-subitens | Sub-itens de nível 1 mostram "•" e de nível 2 "◦", na cor de destaque, com recuo e linha-guia ligando ao tópico; o tópico não tem marcador | e2e test + manual visual check |
| AC-pauta-revelavel-42 | CAP-pauta-revelavel-subitens | Mover um tópico (arraste ou Alt+↑/↓) leva a subárvore inteira; apagar um tópico sobe os sub-itens um nível, e o modal avisa "Os sub-itens dele sobem um nível."; depois de mover, apagar ou colar, os níveis continuam válidos, e o servidor recusa uma árvore inválida (prova RULE-pauta-revelavel-04) | unit test + api test + e2e test |
| AC-pauta-revelavel-43 | CAP-pauta-revelavel-subitens | No preparo, "recolher" num tópico esconde os sub-itens da edição e mostra "N sub-itens recolhidos"; "expandir" traz de volta; com o preparo desligado, recolher não muda nada do que aparece | e2e test |
| AC-pauta-revelavel-44 | CAP-pauta-revelavel-organizar | Reordenar por arraste (alça visível, bloco levantado, marca de destino) ou por Alt+↑/↓ muda a ordem de revelar; a nova ordem sobrevive ao recarregar; o toast tem "Desfazer", que volta à ordem anterior. Mover por teclado é anunciado numa região ao vivo para leitor de tela; no celular, o arraste funciona tocando na alça | e2e test |
| AC-pauta-revelavel-45 | CAP-pauta-revelavel-organizar | Apagar um bloco (lixeira ou Delete) abre o modal "Apagar bloco?" com "Não dá para desfazer." e "Apagar bloco"; Cancelar mantém; um bloco de falha de mídia sai sem confirmação. Esc também cancela | e2e test (confirm and cancel) |
| AC-pauta-revelavel-46 | CAP-pauta-revelavel-aparencia | O painel Aparência aplica na hora os temas Tinta & Ouro (padrão), Porcelana, Caderno, Lousa e Alto contraste; a cor de destaque livre avisa abaixo de 4,5:1 e tem "Usar a do tema"; o fundo pode ser do tema, cor, um de 3 gradientes ou uma imagem gravada na pasta de mídia; a folha mantém o véu; a escolha vale para todas as pautas e sobrevive ao reinício (prova RULE-pauta-revelavel-10) | api test + e2e test |
| AC-pauta-revelavel-47 | CAP-pauta-revelavel-migracao | Na primeira abertura depois da atualização, cada pauta antiga vira uma pauta revelável: o título de cada bloco vira texto no nível 0, cada ponto vira texto no nível 1 (sub-ponto no nível 2), a imagem de um ponto vira bloco de imagem logo depois dele, anexos de imagem e vídeo viram blocos de mídia no nível 1, link vira texto com a URL, código e texto de chat viram texto com o conteúdo, outro arquivo vira texto com o nome; blocos de resgate vão para o fim, depois do trilho; tudo nasce "começa oculto"; a pauta recebe o selo "veio da versão anterior" | api test (migration fixture) |
| AC-pauta-revelavel-48 | CAP-pauta-revelavel-migracao | Antes de migrar, o app grava um backup consistente do banco (incluindo o conteúdo pendente do WAL); rodar a migração duas vezes não duplica nada; as tabelas antigas (execuções, trajeto, cortes, acervo, notas, energia) continuam no disco (prova RULE-pauta-revelavel-09) | api test |
| AC-pauta-revelavel-49 | CAP-pauta-revelavel-migracao | Não existem mais na interface Bancada, Palco, deck de resgate, Acervo, relatório, tipo de bloco nem duração; os textos usam Pauta, bloco, revelar e ocultar | e2e test |
| AC-pauta-revelavel-50 | CAP-pauta-revelavel-tour | Na primeira abertura, um tour de 5 passos com holofote explica a folha, revelar, colar e formatar, preparo e aparência, com Pular, Próximo e Começar, e Esc fecha; ele não volta sozinho depois; "Como usar" reabre | e2e test |
| AC-pauta-revelavel-51 | CAP-pauta-revelavel-play | O app sobe na porta de `PORT` (frontend) e `BACKEND_PORT` (backend); `GET /api/aioson-play` lista só rotas que existem, sem as rotas de execução, relatório e acervo | api test |
| AC-pauta-revelavel-52 | CAP-pauta-revelavel-revelar | Com `prefers-reduced-motion`, revelar e ocultar acontecem sem animação e a rolagem até o bloco não é suave | e2e test |
| AC-pauta-revelavel-53 | CAP-pauta-revelavel-coluna | Esc sai do texto e o Tab volta a navegar pelos controles com foco visível; os controles do bloco (alça, olho, lixeira, tamanhos) são alcançáveis por teclado; modais e tour prendem o foco | e2e test |
| AC-pauta-revelavel-54 | CAP-pauta-revelavel-coluna | Em 360px de largura não há rolagem horizontal, os alvos de toque têm pelo menos 44px, e as barras de tamanho e de formatação quebram linha em vez de sair da tela | e2e test |
| AC-pauta-revelavel-55 | CAP-pauta-revelavel-revelar | Revelar e ocultar mudam a tela sem esperar o salvamento terminar; se salvar falhar, o que já apareceu continua na tela e o aviso "Falha ao salvar · nova tentativa em 5 s" aparece (prova RULE-pauta-revelavel-11) | e2e test |
| AC-pauta-revelavel-56 | CAP-pauta-revelavel-play | A interface não faz nenhuma requisição a domínio externo: as fontes Inter e JetBrains Mono são servidas pelo próprio app, e a mídia vem da pasta local | e2e test (network log) |
| AC-pauta-revelavel-57 | CAP-pauta-revelavel-pautas | Enquanto a lista ou uma pauta carrega, aparece o esqueleto de carregamento; se o servidor local não responder, aparece um aviso de erro com "Tentar de novo" em vez de tela em branco; abrir o endereço de uma pauta que não existe leva à lista de pautas | e2e test |

## Open questions

1. **[testable] Colagem de vídeo e áudio copiados do Explorer no webview real do Play** (risco R2). Não bloqueia: arrastar e soltar (AC-pauta-revelavel-17) cobre a promessa. Dono: @planner coloca um spike no início do plano.
2. **[testable] Legibilidade de cada tema em vídeo comprimido a 720p** (risco R6). Dono: @qa, com uma gravação real.
3. **[research-able] Referência do Canal Subido.** Um link de vídeo ajudaria a calibrar o ritmo de revelação. Não bloqueia.
4. **[decision-required, não bloqueia este PRD] A feature `clave` segue aberta** em `.aioson/context/features.md`, aguardando QA, com `prd-clave.md`. Este PRD substitui aquela superfície. Recomendação: encerrar `clave` como superada (`aioson feature:triage . --abandon=clave`) antes de @dev começar a remover a Bancada e o Palco. Decisão do dono.
5. **[deferred] Notas privadas do Clave antigo.** Não existe camada privada na pauta revelável; as notas ficam no disco, sem uso. Trazê-las de volta de alguma forma é decisão futura.

## Regras do projeto aplicadas

- `status-change-confirmation`: apagar pauta, apagar bloco e nova tomada confirmam por modal do design system (AC-pauta-revelavel-05, -29, -45).
- `status-flow-drag-and-drop`: reordenar por arraste com alternativa de teclado e "Desfazer" (AC-pauta-revelavel-44; desvio D1).
- `crud-surface-integrity`: a lista de pautas usa o id persistido como identidade, o nome é o único campo e é editável depois de criado, a obrigatoriedade vale no servidor e um teste dirige o formulário (AC-pauta-revelavel-02, -03, -06).
- `form-fields-masks-and-validation`: o único campo é o nome da pauta, texto livre sem formato estruturado; não há máscara aplicável, e a validação é inline.
- `management-home-widgets`: não se aplica. A pauta revelável é uma ferramenta de apresentação, não uma superfície de gestão de trabalho quantificável; a entrada leva direto à última pauta.
- `source-code-language-convention`: identificadores em inglês; os textos de interface citados nos AC são cópia em pt-BR.
