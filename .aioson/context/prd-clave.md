---
feature: clave
classification: MEDIUM
feature_completeness: required
product_scope: approved
prd_ready: approved
sheldon_review: pending
prototype: .aioson/briefings/clave/prototype.html
prototype_status: current
prototype_feature: clave
identity: .aioson/briefings/clave/identity.md
identity_status: current
---

# PRD — Clave

## Visão e problema

O Clave é a pauta viva de uma live: um formato com **um caminho sugerido e desvios possíveis**, não uma lista cronometrada. Ele existe para que o criador veja o tédio antes de entrar no ar, tenha um plano B à mão quando o chat morre, e saia da live com os capítulos do YouTube prontos sem retrabalho.

O problema concreto que nenhuma ferramenta de rundown resolve hoje (levantamento do autor em `plans/CLAVE.md`, claim sustentado por pesquisa em `researchs/clave-rundown-concorrentes/summary.md`):

- o **vale de energia** só aparece quando já está acontecendo ao vivo;
- quando o assunto desvia, o improviso vira deriva porque não existe desvio estruturado;
- a mídia da live vive espalhada fora da pauta;
- capítulos e cortes viram trabalho manual depois de cada live.

Duas decisões da fonte definem o produto e não são negociáveis: a **pauta musical de 5 linhas é a interface** (as pistas da Bancada são o mesmo desenho da barra de progressão do Palco), e o **Palco fica na tela capturada pelo OBS**. O público vê a pauta acontecendo, então o Palco é cenografia, não UI de ferramenta, e carrega duas camadas de informação: pública e privada.

## Usuários

| Usuário | Contexto | O que precisa fazer |
|---|---|---|
| **Criador solo de live** (primário; o próprio autor, em dogfooding) | Sozinho na máquina que transmite; OBS capturando a tela do Palco; chat rolando fora do app | Compor a live antes, conduzir sem perder o fio quando o assunto desvia, e sair com os marcadores prontos |
| **Público da live** (indireto, nunca opera o app) | Assiste ao vídeo comprimido do YouTube/Twitch, muitas vezes em 720p, entrando no meio | Bater o olho e entender onde a live está e o que ainda vem; nunca ver a camada privada |

Uso local, single-user, sem login e deliberadamente desconectado no v1 (decisões 5 e 12 do round 1).

## Feature Capability Map

| CAP | Promised outcome | Actor / trigger | Scope decision | Rationale |
|---|---|---|---|---|
| CAP-clave-pautas | O criador abre o app e cai direto na última pauta usada; cria, renomeia, duplica, apaga e abre pautas numa lista mínima | Criador / abrir o app, botões da lista | required | Sem gestão de pautas não existe segunda live; decisão vinculante F3 do round 1 (lista mínima, não home com widgets) |
| CAP-clave-bancada | O criador compõe a live numa pauta linear: uma lista numerada de blocos, de cima para baixo, onde a ordem visual é a ordem da live | Criador / Bancada | required | PROM-001 + PROM-012 sob a revisão de escopo R4: a composição continua sendo a interface, sem obrigar a classificar o assunto antes de escrevê-lo |
| CAP-clave-curva | ~~O criador vê a onda de energia da live inteira e é avisado do vale antes de entrar no ar~~ (critérios 13 e 14 aposentados) | Sistema / nenhum: não existe mais gatilho, tela ou campo que produza esta capacidade | not_applicable | Aposentada a pedido do criador na revisão de escopo R4: a curva derivava do campo `energia` de 1 a 5 que ele não preenchia com critério, então o gráfico não informava nada sobre a live dele. Não sobra comportamento observável — o resultado que ela prometia passou a ser servido por CAP-clave-pontos, e é lá que PROM-003 é cobrada |
| CAP-clave-pontos | Dentro de cada bloco o criador escreve os pontos que vai falar, com imagem opcional, e no Palco eles aparecem um a um conforme ele avança, marcados ao passar | Criador / ficha do bloco e avanço no Palco | required | R4: é o que o criador pediu no lugar da curva — a pauta conduz a fala, não só o relógio |
| CAP-clave-palco | O criador conduz a live numa cenografia capturável, com camada pública e camada privada que nunca vaza | Criador / entrar no ar, atalhos e controles | required | PROM-002 + PROM-013: a tese §1.2 inteira depende disso |
| CAP-clave-resgate | Quando o assunto desvia, o criador saca um resgate do deck e volta sozinho ao ponto exato do trilho | Criador / `R` ou carta do deck | required | PROM-004: diferencial nº 2; é o que de fato acontece numa live e nenhuma pauta modela |
| CAP-clave-anexos | Cada bloco carrega sua mídia e o criador abre ou copia direto do Palco, sem sair para o explorador de arquivos | Criador / ação do anexo no Palco | required | PROM-005: diferencial nº 3; é aqui que mora "guardar e organizar mídia" |
| CAP-clave-trajeto | Ao encerrar, o criador tem planejado × tocado por bloco, em tempo relativo à execução | Criador / encerrar execução | required | PROM-006 sob a revisão de escopo R4: o comparativo fica; capítulos e cortes saem, porque o relógio da pauta não é o da gravação |
| CAP-clave-acervo | O criador recicla blocos que funcionaram, sabendo há quantos dias cada um não vai ao ar | Criador / Acervo | required | PROM-007: fecha o ciclo entre lives e evita repetir demais |
| CAP-clave-vocabulario | Toda a interface fala o mesmo vocabulário do produto (Pauta, Bloco, Ponto, Resgate, Deck, Entrar no ar, Trajeto, Acervo) | Sistema / qualquer tela | required | PROM-011 sob a revisão de escopo R4: "Pista" e "Marcadores" saem junto com as capacidades que nomeavam; a fonte continua proibindo "slide/apresentação/item/task" |
| CAP-clave-cenografia | O Palco e as demais telas sobrevivem à compressão do vídeo, e a cor sempre diz qual é o tipo do bloco | Sistema / qualquer superfície | required | PROM-009 sob a identidade Tinta & Ouro (decisão F13): legibilidade sob compressão é requisito de produto, não estética |
| CAP-clave-persistencia | Nada do que o criador compôs ou executou se perde ao fechar o app | Sistema / qualquer escrita | required | PROM-010: a fonte proíbe `localStorage` justamente para não criar um caminho descartável |
| CAP-clave-play | O app sobe dentro do AIOSON Play, na porta que o Play alocar, sem tela de configuração | Play / spawn do processo | required | PROM-010 + decisão de contrato Play do round 1: o app não é servidor standalone |
| CAP-clave-copiloto | O copiloto sugere resgate pelo ritmo, gera variações de bloco e monta o esqueleto da próxima live | Criador / sugestão do copiloto | deferred | PROM-008 já nasce diferido na fonte (fase 7) e depende de trajetos reais acumulados que ainda não existem |

## Source Coverage

| Promise | Product decision | CAP / AC | Evidence / rationale |
|---|---|---|---|
| PROM-001 | required | CAP-clave-bancada; AC-clave-07, AC-clave-08, AC-clave-10 | Canvas de 5 pistas, gaveta de edição e arraste preservados de SRC-001 §2.1 |
| PROM-002 | required | CAP-clave-palco; AC-clave-16, AC-clave-17 | Layout de cenografia e camada privada preservados de SRC-001 §1.2/§2.2 |
| PROM-003 | required | CAP-clave-pontos; AC-clave-49, AC-clave-50, AC-clave-51, AC-clave-52 | **A promessa não foi aposentada; a forma dela foi.** SRC-001 §3.1 promete que o criador enxergue o ritmo da live em vez de descobrir o vale no ar. O gráfico de energia era o veículo e caiu em R4 (derivava de um campo que o criador não preenchia com critério, logo não informava). O mesmo resultado passa a ser entregue pelos pontos do bloco — durante a live o criador vê o que já disse e o que falta (AC-clave-50, AC-clave-51) — e pelo "quanto falta para fechar a pauta" (AC-clave-52), que é a leitura de ritmo que a curva nunca deu de forma confiável. `CAP-clave-curva` fica `not_applicable` porque é o veículo, não a promessa |
| PROM-004 | required | CAP-clave-resgate; AC-clave-21, AC-clave-22 | Deck, `R` e retorno automático ao trilho preservados de SRC-001 §3.2 |
| PROM-005 | required | CAP-clave-anexos; AC-clave-23, AC-clave-24, AC-clave-25 | Seis tipos de anexo e ação direta no Palco preservados de SRC-001 §3.3 |
| PROM-006 | required | CAP-clave-trajeto; AC-clave-27, AC-clave-28, AC-clave-29, AC-clave-47 | Reduzida em R4, não rebaixada: o trajeto gravado e o comparativo continuam obrigatórios e entregues. Gravação e comparativo preservados de SRC-001 §3.4/§7 fase 5; AC-clave-47 protege o trajeto contra edição e exclusão de bloco com a live rodando. Os marcadores de capítulo e os trechos para corte saíram: dependiam de o relógio da execução coincidir com o da gravação, e ele nunca coincide |
| PROM-007 | required | CAP-clave-acervo; AC-clave-31, AC-clave-32, AC-clave-34 | Grade com contador e recência e "clicar traz cópia" preservados de SRC-001 §2.3 |
| PROM-008 | deferred | CAP-clave-copiloto | Diferido pela própria fonte (fase 7) e sem insumo: o copiloto lê histórico de execuções que só existe depois das primeiras lives reais |
| PROM-009 | required | CAP-clave-cenografia; AC-clave-36, AC-clave-37, AC-clave-38, AC-clave-39, AC-clave-46 | Sobrevivem íntegras: cor codifica tipo de bloco, coreografia única de entrada (35 ms), timecode em mono e `prefers-reduced-motion`. A paleta tinta/giz azul e as fontes Archivo/Sora foram substituídas pela identidade Tinta & Ouro por decisão do usuário (F13, round 3) |
| PROM-010 | required | CAP-clave-persistencia, CAP-clave-play; AC-clave-26, AC-clave-40, AC-clave-42, AC-clave-45, AC-clave-48 | Consequências observáveis preservadas: dados sobrevivem ao restart, mídia em pasta local com caminho relativo, nenhum dado do produto em `localStorage`, e o app é módulo do Play em vez de empacotamento próprio |
| PROM-011 | required | CAP-clave-vocabulario; AC-clave-35 | Vocabulário canônico de SRC-001 §9 aplicado a toda string de interface |
| PROM-012 | required | CAP-clave-bancada; AC-clave-09 | Invariante `resgate ⇒ ordem null` validada no domínio, com recálculo da sequência na troca de tipo |
| PROM-013 | required | CAP-clave-palco; AC-clave-18 | Atalhos de SRC-001 §2.2 preservados, com alternativa clicável acrescentada para fechar a lacuna de acessibilidade apontada no briefing |
| PROM-014 | not_applicable | — | **Rebaixamento aprovado pelo usuário** em 2026-08-18, por decisão do usuário registrada no chat depois que a linhagem voltou a ser legível e o achado `source_required_promise_downgraded_without_user_approval` apareceu. Razão: ordem de entrega 1→7 é roadmap, não comportamento observável de produto — a alternativa seria criar uma AC artificial para uma promessa sem comportamento verificável. Nada se perde: a sequência segue vinculante em `## Escopo do MVP` e já está executada nas fases 1 a 8 de `.aioson/context/implementation-plan-clave.md` (Bancada → Curva → Palco → Anexos → Trajeto → Acervo, com a fundação do Play na fase 1 e o Copiloto diferido em PROM-008) |

### Trace de decisões de review aprovadas

`refinement-report.md` do round 3 traz `Status: applied` e `Approved review authority: binding`; o `source_hash` do relatório confere com o do arquivo `refinement-feedback.applied-round3.json` (`briefing_slug: clave`, `round: 3`), e o `applied_hash` confere com o `briefings.md` atual (verificado por `sha256sum`). SRC-001 confere com `plans/CLAVE.md` pelo mesmo método.

| Decisão | Estado | Onde entra neste PRD |
|---|---|---|
| F13 — autoridade visual passa a ser o AIOSON Design-DNA v1 "Tinta & Ouro" por referência (`identity.md` do briefing) | accepted | CAP-clave-cenografia, `## Identidade visual`, frontmatter `identity` |
| F14 — claim competitivo sustentado; risco de legibilidade sob compressão reduzido, teste real no OBS ainda necessário | accepted | `## Métricas de sucesso` e questão 11 em `## Open questions` |
| F15 — "marcadores inteligentes" registrado como ideia para o Product decidir, **nunca como escopo aprovado** | accepted | Decidido aqui como **diferido**: ver `## Fora de escopo` e questão 13 em `## Open questions` |

Referências de origem aprovadas no round 3: `.aioson/briefings/clave/identity.md`, `.aioson/briefings/clave/prototype-manifest.md`, `researchs/clave-rundown-concorrentes/summary.md`, `researchs/clave-cenografia-e-marcadores/summary.md`. As decisões dos rounds 1 e 2 já estão incorporadas no texto do `briefings.md` aprovado e são tratadas aqui como conteúdo canônico do briefing.

Esta tabela cobre **apenas feedback de refinamento arquivado**: F13, F14 e F15 vêm de `refinement-feedback.applied-round3.json`, e o `applied_hash` do `refinement-report.md` confere com o `briefings.md` atual. Não existe `refinement-feedback.applied-round4.json` — o round 4 não foi rodada de refinamento, e nenhum id `F*` foi emitido para ele.

### Revisão de escopo direta — R4

| Decisão | Origem e autoridade | Onde entra neste PRD |
|---|---|---|
| **R4** — o criador usa o Clave só como pauta de live: as pistas por tipo, a curva de energia e os marcadores de vídeo saem; entram os pontos do bloco e o "quanto falta para fechar a pauta" | Decisão direta do criador no chat em 19/08/2026, depois de usar o produto entregue. **Não é feedback de refinamento**: não passou por `@briefing-refiner`, não tem arquivo arquivado em `.aioson/briefings/clave/` e por isso **não carrega id `F*`** — reusar `F14` tornava o trilho irresolvível, porque esse id pertence ao claim competitivo do round 3. A autoridade é o próprio criador sobre o escopo do produto dele, registrada aqui e detalhada em `## Revisão de escopo — round 4 (R4)` | CAP-clave-bancada, CAP-clave-curva (`not_applicable`), CAP-clave-pontos, CAP-clave-trajeto, CAP-clave-vocabulario, AC-clave-07, AC-clave-08, AC-clave-18, AC-clave-29, AC-clave-35, AC-clave-49 a AC-clave-55, `## Escopo do MVP`, `## Current System Fit` |

## Current System Fit

Inspeção da raiz do repositório em 2026-08-18: não existe `src/`, `servidor/`, `package.json` (`find . -maxdepth 2 -name package.json` sem resultado) nem `app-config.yaml`; `project.context.md` declara `framework_installed: false`. O único artefato executável do repositório é `.aioson/briefings/clave/prototype.html`, que é contrato visual e de interação com estado em memória, nunca comportamento de produção. A fronteira mais próxima de cada capacidade foi inspecionada e não existe, com uma exceção: o contrato Play.

| CAP | Existing behavior / evidence | Fit decision | Required product delta |
|---|---|---|---|
| CAP-clave-pautas | `src/` e `package.json` inexistentes na raiz; a única superfície é `.aioson/briefings/clave/prototype.html`, que demonstra `#/pautas` em memória (mock que reinicia no reload) | new | Criar a lista mínima de pautas com criar, renomear, duplicar, apagar, abrir, reabertura da última usada e empty state |
| CAP-clave-bancada | **Revisto em R4 contra o código entregue:** `src/features/board/` e `server/src/services/blockService.ts` já entregam a Bancada com CRUD, arraste e a invariante de resgate; o que existia era o canvas de 5 pistas por tipo | extend | Trocar as pistas por tipo por uma pauta linear numerada, preservando CRUD, arraste e a invariante `resgate ⇒ ordem null`; o tipo do bloco continua existindo como etiqueta de cor |
| CAP-clave-curva | **Revisto em R4 contra o código entregue:** a curva vivia em módulos `energy` sob `shared/` e `src/features/`, alimentada pelo campo `blocks.energy`. Nenhum dos dois existe mais. O que sobrou da capacidade está em `server/src/db/schema.sql` (coluna `blocks.energy`) que a mantém `NOT NULL` com `CHECK (energy BETWEEN 1 AND 5)`, de modo que `server/src/repositories/blockRepository.ts` ainda **escreve** um valor no INSERT sem que nada no produto o leia — o dado gravado antes de R4 fica intacto e sem consumidor | not_applicable (capacidade aposentada) | Remover a superfície inteira — cálculo, gráfico e o campo `energia 1–5` da ficha do bloco. A coluna `blocks.energy` permanece em disco sem leitor: migração que apaga dado do criador não é aditiva |
| CAP-clave-palco | `src/` inexistente; `.aioson/briefings/clave/prototype.html` demonstra `#/palco/:id` com hold-to-show e tomada de tela | new | Criar a cenografia capturável com duas camadas, cronômetro duplo, mini-pauta e controles |
| CAP-clave-resgate | `src/` inexistente e nenhum comportamento de resgate no repositório; `.aioson/briefings/clave/prototype.html` demonstra deck, `R` e retorno ao trilho | new | Criar deck, saque aleatório e retorno automático ao ponto do trilho |
| CAP-clave-anexos | Nenhuma pasta de mídia e nenhuma leitura de disco no repositório (`src/` e `package.json` inexistentes); `.aioson/briefings/clave/prototype.html` embute mídia em data URI e `.aioson/briefings/clave/prototype-manifest.md` declara a origem como mock | new | Criar anexo com arquivo local ou URL, pasta local de mídia, checagem pré-live e estado de erro explícito |
| CAP-clave-trajeto | **Revisto em R4 contra o código entregue:** `server/src/services/runService.ts` grava o trajeto e o relatório já mostra planejado × tocado; junto vinham capítulos do YouTube e trechos para corte | extend | Preservar a gravação e o comparativo, dizer na tela que o tempo é relativo ao "Entrar no ar" e retirar capítulos e trechos para corte. A tabela `run_cuts` permanece em disco sem leitor, pela mesma razão da coluna `energy` |
| CAP-clave-acervo | `src/` inexistente; `.aioson/briefings/clave/prototype.html` demonstra `#/acervo` com a gestão completa marcada como adiada | new | Criar promoção, grade com contadores, trazer cópia e a gestão mínima decidida neste PRD |
| CAP-clave-pontos | **Inspeção de R4 contra o código entregue:** o bloco existe como registro único em `server/src/services/blockService.ts` e na tabela `blocks`, com título, tipo, duração e anexos; não há nenhuma estrutura filha do bloco — `grep -rn "beat" server/ shared/ src/` sem resultado antes desta revisão. O que mais se aproximava era o campo `blocks.energy`, que a mesma revisão aposenta. No Palco, `src/features/stage/` avançava de bloco em bloco, sem granularidade interna | extend | Acrescentar ao bloco uma lista ordenada de pontos com texto obrigatório e imagem opcional, persistida na mesma transação do bloco; fazer o avanço do Palco percorrer os pontos antes de trocar de bloco; propagar os pontos por duplicação de pauta e por ida e volta ao Acervo, sempre desmarcados; acrescentar ao Palco o "quanto falta para fechar a pauta" |
| CAP-clave-vocabulario | `plans/CLAVE.md` §9 define o vocabulário; `src/` inexistente, nenhuma UI existe para aplicá-lo | new | Aplicar o vocabulário canônico em toda string de interface |
| CAP-clave-cenografia | `.aioson/briefings/clave/identity.md` (aprovado) define paleta, vozes, movimento e o mapa tipo→metal; `src/` e `package.json` inexistentes, nenhuma implementação consome esses tokens | new | Servir a identidade como tokens da aplicação, com fontes locais e piso de legibilidade respeitado |
| CAP-clave-persistencia | `package.json` inexistente, nenhum banco e nenhuma pasta de dados no repositório (`find . -maxdepth 2 -name package.json` sem resultado); `.aioson/context/project.context.md` declara `framework_installed: false` | new | Criar persistência local e pasta de mídia, sem `localStorage` |
| CAP-clave-play | `manifest.json` na raiz existe, mas é um esboço de scaffold: `{"name":"Clave Prototipe","origin":"created","packages":[],"slug":"aioson-crave-2","systems":[],"version":"0.1.0"}`, sem `runtime`, sem `has_api`, sem `processes` e sem `webview_target`; não descreve o app. O contrato exigido está em `.aioson/docs/integrations/ai-app-integration.md` e `.aioson/docs/integrations/port-management.md`, e `app-config.yaml` não existe na raiz | replace | Substituir pelo manifesto real do app split-stack, com `processes`/`port_env`, `webview_target`, `has_api: true` e sem `requires_services`; expor `GET /api/aioson-play` |

## Escopo do MVP

O MVP é a live inteira funcionando de ponta a ponta para um criador solo: compor, ver o vale, entrar no ar, desviar e voltar, e sair com os marcadores. As fases da fonte (SRC-001 §7) são a sequência vinculante de entrega para `@planner`:

1. **Bancada** — modelo de dados, 5 pistas, CRUD de bloco, arraste, persistência (CAP-clave-bancada, CAP-clave-pautas, CAP-clave-persistencia, CAP-clave-play).
2. ~~**Curva de energia** — cálculo, desenho, detecção de vale (CAP-clave-curva)~~ — **aposentada em R4.** No lugar dela, e fechando a Bancada, entram os **pontos do bloco**: lista ordenada dentro do bloco, revelada um a um no Palco, mais o "quanto falta para fechar a pauta" (CAP-clave-pontos).
3. **Palco** — cenografia, mini-pauta, cronômetro duplo, atalhos e controles, camada privada, deck com retorno ao trilho (CAP-clave-palco, CAP-clave-resgate).
4. **Anexos** — pasta local de mídia, seis tipos, abertura no Palco, checagem pré-live (CAP-clave-anexos).
5. **Trajeto e relatório** — gravação, planejado × tocado, capítulos e cortes (CAP-clave-trajeto).
6. **Acervo** — promover, contadores, trazer cópia, gestão mínima (CAP-clave-acervo).

CAP-clave-vocabulario e CAP-clave-cenografia são transversais: valem em toda tela entregue, desde a fase 1.

O primeiro item da fase 1 é o spike de persistência local no runtime real do Play via dev-link (instalar, abrir e gravar um banco). O contrato de produto é AC-clave-40; a escolha do motor e o fallback documentado no briefing pertencem a `@planner`.

## Fora de escopo

| Excluído | Estado | Razão |
|---|---|---|
| Copiloto AIOSON (sugestão de resgate, variações, esqueleto da próxima live) | diferido (fase 7) | PROM-008 nasce diferido na fonte e depende de trajetos reais que ainda não existem |
| Segunda tela no celular com as notas privadas | fora do v1 | Decisão 3 do round 1, consequência direta do hold-to-show; pode voltar depois sem dívida |
| Convidado remoto vendo a pauta (modo somente-leitura por URL local) | fora do v1 | Decisão 4 do round 1 |
| Integração de chat do YouTube/Twitch | fora do v1 | Decisão 5 do round 1: o app nasce deliberadamente desconectado |
| Login, `aioson-auth` e `requires_services` | fora do v1 | Decisão 12 do round 1: uso local single-user |
| Múltiplos trilhos ramificados | fora do v1 | Fonte §8.5: trilho único mais resgates é a hipótese a testar nas primeiras lives reais (questão 6) |
| Edição de bloco durante a execução ao vivo, dentro do Palco | fora do v1 | Decisão de produto desta rodada (questão 8); ver `## Fluxos de usuário`, fluxo 6 |
| Arquivar item do acervo, pastas ou coleções e busca no acervo | fora do v1 | A gestão mínima decidida cobre renomear, editar anexos e remover; o resto inflaria a fase 6 sem evidência de necessidade |
| "Marcadores inteligentes": avaliar a qualidade dos futuros capítulos e sugerir fusões na exportação | diferido | Decisão de produto do round 3 sobre F15 e a questão 13, mantida por R4 com a base mudada: a própria exportação de capítulos saiu do produto (AC-clave-29 reescrita), então não há saída para avaliar. Fica diferido junto com os capítulos, e ambos dependem de resolver o descasamento entre o relógio da execução e o da gravação |
| Home com widgets e indicadores | fora do v1 | A decisão vinculante F3 do round 1 escolheu a lista mínima de pautas; ver `## Fluxos de usuário`, fluxo 1 |
| Dashboard de estatísticas históricas entre lives | fora do v1 | Nenhuma promessa da fonte pede, e o Acervo já carrega uso e recência |

## Fluxos de usuário

**1. Abrir o app.** O app abre na última pauta usada. Sem nenhuma pauta, a lista mostra o empty state que guia a criação da primeira. Com uma execução em aberto (`Execucao` sem `fim`), um modal pergunta antes de qualquer outra coisa: retomar no bloco onde parou, ou encerrar retroativamente com `fim` no último passo registrado. Nunca fecha em silêncio e nunca descarta o trajeto.
*A entrada não é um painel de widgets: é a lista editorial de pautas, por decisão vinculante F3 do round 1, tomada pelo usuário depois de a alternativa "home com widgets" ter sido apresentada e não escolhida. `.aioson/rules/management-home-widgets.md` pede que a entrada de um sistema de gestão gere decisão; aqui a entrada serve exatamente as duas decisões que existem no domínio — qual pauta abrir e o que fazer com uma execução deixada em aberto — e cada sinal leva direto ao registro correspondente. O Clave é ferramenta de produção ao vivo para um usuário só, não um back office com trabalho quantificável acumulado, então indicadores agregados não teriam decisão para servir. **Isto não é exceção a uma regra aplicável: a condição de entrada da regra ("se o produto gerencia trabalho quantificável — CRM, ERP, cockpit, admin, back office") não é satisfeita**, e a decisão F3 do usuário confirma a leitura. O aviso advisory de `prototype:check` ("management surface with no widget/KPI/chart markers") é heurístico de marcadores e está justificado no manifesto do protótipo.*

**2. Compor na Bancada.** O criador cria blocos com `+` no fim da pista do tipo, edita na gaveta lateral e arrasta para reordenar o trilho. A curva de energia fica visível junto ao canvas e se redesenha a cada mudança de energia ou duração. Detectado um vale, o aviso aparece em `perigo` com a soma dos minutos e a sugestão de resgate.
*Sucesso:* a nova ordem persiste e sobrevive ao reload; o toast oferece "Desfazer".
*Falha:* campo obrigatório vazio bloqueia o salvamento com erro inline nomeando o que falta; arraste para alvo inválido mostra o estado de recusa e nada muda.

**3. Entrar no ar.** O gate roda a checagem de anexos: bloco com anexo local quebrado ganha badge de erro **antes** de a execução começar. O criador confirma e o Palco assume a tela capturada.
*Sucesso:* a execução começa, o cronômetro global zera e o primeiro bloco entra palavra a palavra.
*Falha:* pauta sem nenhum bloco no trilho não entra no ar e diz por quê.

**4. Conduzir.** `espaço` e `→` avançam, `←` volta, `R` saca resgate, `N` mostra a nota privada só enquanto está pressionada e `C` marca o trecho atual para corte. Os mesmos comandos existem como controles clicáveis. Abrir um anexo com `telaCheia` toma a tela capturada; sem `telaCheia`, o anexo abre no painel privado que o público nunca vê.
*Sucesso:* o timecode do bloco e o global correm juntos, e o estouro do previsto é sinalizado sem esconder o número.
*Falha:* anexo que não abre (arquivo sumiu, URL fora do ar) mostra estado de erro explícito no lugar da mídia; deck sem cartas mostra estado vazio em vez de um rodapé mudo.

**5. Desviar e voltar.** Sacar um resgate leva o Palco para a carta; sair do resgate volta sozinho ao ponto exato do trilho onde a live parou, sem o criador precisar lembrar onde estava.

**6. Editar durante a live.** O Palco é somente condução e não edita bloco. Para mexer na pauta com a live rodando, o criador sai por "← Bancada" (a execução continua em aberto e a tela diz isso), edita, e volta ao Palco. A edição vale do passo seguinte em diante; os passos já gravados guardam o snapshot de título e tipo que estava no ar, inclusive quando o bloco é excluído depois de já ter ido ao ar (AC-clave-47). *Decisão desta rodada para a questão 8: manter o Palco somente-condução preserva a cenografia e a camada privada sob captura, e é o comportamento que o protótipo aprovado modela.*

**7. Encerrar e colher.** Encerrar pede confirmação por modal. O relatório mostra planejado × tocado por bloco e o total, os capítulos do YouTube (primeira linha `00:00`) com copiar e baixar `.txt`, e a lista de cortes com início e fim.
*Falha:* execução sem nenhum passo registrado encerra mostrando o relatório vazio explícito, não uma tela em branco.

**8. Reciclar.** Um bloco que funcionou é guardado no acervo pela Bancada. No Acervo, a grade mostra quantas vezes cada item foi ao ar e há quantos dias não vai; clicar traz uma cópia independente para a pauta atual. Renomear e editar anexos ficam no próprio item, e remover confirma por modal.

## Métricas de sucesso

| Métrica | Como se mede | Alvo do v1 |
|---|---|---|
| A live inteira roda no Clave | O autor conduz lives reais do começo ao fim dentro do app | 3 lives seguidas sem abandonar o app no meio |
| O vale é visto antes, não depois | Vales detectados na Bancada × vales percebidos ao vivo, anotados pelo autor após cada live | Todo vale sentido ao vivo já tinha sido sinalizado antes |
| O resgate é usado de verdade | Passos do trajeto com `foiResgate` por live | Pelo menos 1 resgate sacado por live, com retorno ao trilho sem intervenção manual |
| A pós-produção deixa de ser manual | Capítulos publicados no YouTube que vieram da exportação, sem reescrita | 100% dos capítulos vêm do relatório |
| A cenografia sobrevive à compressão | Assistir à gravação em 720p e ler título, mini-pauta e timecode (questão 11, teste real com OBS) | Legível sem pausar |
| A camada privada nunca vaza | Revisão das gravações em busca de nota privada visível | Zero ocorrências |

## Prototype contract

- status: current
- feature: clave
- prototype: .aioson/briefings/clave/prototype.html
- manifest: .aioson/briefings/clave/prototype-manifest.md
- identity: .aioson/briefings/clave/identity.md
- binding interactions: criar/renomear/duplicar/apagar pauta com modal destrutivo; retomar ou encerrar execução em aberto; criar/editar/excluir bloco na gaveta com validação de domínio; arraste no trilho com desfazer e fallback por botões; guardar no acervo; troca de tipo aplicando a invariante resgate⇒ordem null; curva de energia com vale detectado; entrar no ar com checagem pré-live; avançar/voltar; sacar resgate pelo deck e por `R` com retorno automático ao trilho; `N` hold-to-show; `C` marca trecho; anexo `telaCheia` local e por URL; anexo "só você vê"; anexo quebrado; encerrar por modal; trazer cópia do acervo; copiar capítulos, baixar `.txt` e copiar cortes
- approved deviations: gestão mínima do Acervo definida aqui (AC-clave-33); controles clicáveis equivalentes aos atalhos do Palco (AC-clave-18); origem real da mídia por arquivo local ou URL (AC-clave-25, AC-clave-26); fontes servidas localmente (AC-clave-37); persistência em disco no lugar do estado em memória (AC-clave-40); trecho de corte com início e fim no lugar do timecode único do protótipo (AC-clave-18 e o critério 30, este último aposentado na revisão de escopo R4 junto com os cortes)
- retired prototype interactions (R4): `marcar trecho para corte` — a única interação Core do manifesto aprovado que o produto entregue deliberadamente não tem. Coberta por AC-clave-18 como critério negativo, do mesmo modo que AC-clave-29 cobre `copiar capítulos`, `baixar .txt` e `copiar cortes`. Razão em `## Revisão de escopo — round 4 (R4)`: o `00:00` da execução não coincide com o da gravação, então todo timecode exportado saía deslocado. O protótipo continua desenhando o gesto e permanece vinculante para tudo o mais
- excluded historical references: none
- estados materiais cobertos: carregamento (o protótipo renderiza o esqueleto de boot; AC-clave-45), populado, vazio (lista de pautas, Bancada, deck, cortes, acervo), erro (anexo quebrado, mídia que falha ao abrir, falha de escrita: AC-clave-25, AC-clave-48), cronômetro estourado, execução em aberto, camada privada oculta por padrão, `prefers-reduced-motion`, comportamento responsivo em 900px, 360px e janela baixa (AC-clave-46)
- permission-denied: não aplicável — o app é local e single-user, sem login e sem `aioson-auth` (decisão 12 do round 1); nenhuma superfície tem estado de acesso negado, e AC-clave-44 fixa a ausência de tela de login como comportamento observável

O manifesto aprovado traz `status: approved`, `feature: clave` e `approved_at: 2026-08-18`. O protótipo é evidência vinculante de layout, interação, estados e direção visual para `#/pautas` (lista editorial, modal destrutivo, empty state, execução em aberto), `#/bancada/:id` (5 pistas como linhas de pauta com blocos pousados, régua de compassos, gaveta com validação, arraste com desfazer e fallback por botões, curva com vale de 20 min detectado), `#/palco/:id` (barra superior, centro, lateral, rodapé com o dispositivo D-02 no metal do bloco, hold-to-show em `N`, deck, tomada de tela, estados de anexo quebrado e cronômetro estourado), `#/acervo` e `#/relatorio/:execId` (capítulos com `00:00`, cortes).

**Desvios aprovados em relação ao protótipo:**

1. **Gestão do Acervo** — o protótipo exibe um chip declarando a gestão completa adiada para o PRD da fase 6. Este PRD fecha a lacuna: o v1 inclui renomear, editar anexos e remover item (AC-clave-33). `tipo` é imutável após a promoção, porque define a pista, o metal e o significado dos contadores de uso já acumulados. Arquivar, pastas e busca ficam fora do v1.
2. **Controles clicáveis no Palco** — o protótipo conduz por atalhos. Este PRD exige alternativa clicável equivalente para avançar, voltar, sacar resgate e encerrar (AC-clave-18), fechando a lacuna de acessibilidade registrada no briefing.
3. **Origem da mídia** — o protótipo embute duas imagens e um screencast em data URI e declara que a origem é mock. Na implementação, a mídia vem de arquivo na pasta local ou de URL web/YouTube (AC-clave-25, AC-clave-26).
4. **Fontes** — o protótipo não embute fontes e cai no fallback do sistema. A implementação serve Inter e JetBrains Mono localmente (AC-clave-37), porque o app roda sem rede garantida dentro do Play.
5. **Persistência** — o protótipo reinicia no reload por ser mock. A implementação persiste em disco e nunca em `localStorage` (AC-clave-40).
6. **Acessibilidade do formulário** — o protótipo sinaliza erro de campo só por classe e mensagem inline (`.campo.invalido` + `.erro-campo`). A implementação acrescenta `aria-invalid` e `aria-describedby` no mesmo lugar, por exigência de `.aioson/rules/form-fields-masks-and-validation.md` (AC-clave-08). É acréscimo, não mudança da estrutura visível.
7. **Campo de data** — o protótipo usa `type="date"` nativo. A implementação mantém essa semântica em vez de acrescentar máscara própria de `DD/MM/AAAA`: a mesma regra proíbe uma segunda camada de formatação quando já existe uma (AC-clave-02).
8. **Falha de gravação** — o protótipo não tem backend, então nunca falha ao salvar. A implementação precisa do estado de erro de escrita, que AC-clave-48 fixa; nenhuma tela do protótipo é contrariada por isso.
9. **Trecho de corte com início e fim** — o protótipo grava cada marcação como **um timecode único** (`cortes: [{ t, rotulo }]`, e o próprio guia embutido diz "viram uma lista de cortes com o timecode"). O PRD exige intervalo, porque um corte para Shorts precisa de onde começa e onde termina; o editor não deve inferir o fim. Consequência de interação, fixada em AC-clave-18: `C` deixava de ser marcação instantânea e passava a alternar — primeiro `C` abria o trecho, segundo `C` fechava —, e o critério 30 fechava no fim da execução qualquer trecho deixado aberto. **Superado pela revisão de escopo R4:** os trechos para corte saíram do produto, o critério 30 foi aposentado e a tecla `C` deixou de existir no Palco. O desvio fica registrado porque explica por que o protótipo aprovado mostra um gesto que o produto entregue não tem.

O protótipo não prova backend, portas do Play, manifesto, leitura de disco nem player de URL. Essas capacidades são verificadas por AC-clave-25 a AC-clave-44, não pelo protótipo.

## Identidade visual

- **identity:** `.aioson/briefings/clave/identity.md` — `identity_status: current` (registro do próprio feature, extraído por referência do AIOSON Design-DNA v1 "Tinta & Ouro", `runs/variant-d/design-dna`, variante selecionada).
- **design_skill:** `interface-design`, declarado no manifesto aprovado e registrado no contexto do projeto nesta rodada.

O que a identidade constrange como requisito de produto, não como decoração:

- **Cor codifica tipo de bloco**, nunca decora, e reaparece em toda superfície onde aquele bloco existe. Mapa fixo: tema→cobre, mídia→nióbio, interação→granada, convidado→prata, resgate→patina. **Ouro é reservado** à marca, à ação primária e aos gates de decisão humana ("Entrar no ar", confirmações); nenhum tipo de bloco toma o ouro. Vale de energia e erro falam em `perigo`; "AO AR" fala em patina.
- **Três vozes:** estrutura em sans, intenção humana em serif itálico curto (nota privada, palavra viva do título), máquina em mono (timecodes, contadores, rótulos). A máquina nunca fala em serif e a intenção nunca fala em mono.
- **Piso de legibilidade sob compressão:** nenhuma informação do Palco abaixo de ~20px equivalentes e nenhum peso fino carregando informação, porque o vídeo de 1080p é assistido em 720p (`researchs/clave-cenografia-e-marcadores/summary.md`).
- **Uma estratégia de profundidade: bordas.** A única sombra permitida é o lift efêmero do cartão em arraste.
- **Movimento com função:** a entrada palavra a palavra do bloco no Palco (35 ms) é a única coreografia, o resto é transição funcional de 150 ms, e `prefers-reduced-motion` deixa tudo estático.
- **Anti-goals:** nenhum azul estrutural ou resquício da identidade anterior (cyan, violet, coral, amber, mint), nenhum preto absoluto com neon, nenhum emoji como ícone, nenhum card dentro de card e nenhuma grade uniforme de cards de SaaS genérico.

## Revisão de escopo — round 4 (R4)

O criador voltou depois de usar o produto entregue e trouxe uma correção de rumo,
não um pedido de recurso: ele usa o Clave **só como pauta de live**, e três
capacidades da versão anterior não serviam ao uso real dele.

**O que saiu, e por quê**

1. **As quatro pistas por tipo** (`CAP-clave-bancada`, AC-clave-07). Obrigavam a
   classificar o assunto antes de escrevê-lo, sem contrapartida: a live é uma
   sequência só. A pauta virou uma lista linear numerada; o tipo sobrevive como
   **etiqueta de cor**, que informa sem organizar a tela. Só `rescue` continua
   mudando comportamento, porque tira o bloco da ordem.
2. **A curva de energia** (`CAP-clave-curva`, critérios 13 e 14, aposentados).
   Derivava do campo `energia` de 1 a 5, que o criador não preenchia com
   critério. Sem isso a curva era desenho, não informação. O campo saiu junto
   com o gráfico.
3. **Capítulos do YouTube e trechos para corte** (AC-clave-29 reescrito, o
   critério 30 aposentado e a tecla `C` removida). Dependiam de o `00:00` da
   execução coincidir com o `00:00` da
   gravação. Não coincidem: o criador começa a gravar e só depois abre a pauta,
   então todo timecode exportado saía deslocado. O relatório mantém planejado ×
   tocado, que é tempo relativo e continua verdadeiro, e passou a dizer isso na
   própria tela.

**O que entrou** — `CAP-clave-pontos` (AC-clave-49 a AC-clave-55): os pontos do
bloco, revelados um a um pelo mesmo avanço que já conduzia a live, e o "falta X
min para fechar a pauta" ao lado do cronômetro do assunto.

**O que ficou intacto:** pautas, resgates, anexos, acervo, persistência, contrato
do Play, cenografia e o trajeto gravado. A migração é aditiva (`beats`, schema
v3); `blocks.energy` e a tabela `run_cuts` continuam no disco sem ninguém ler,
porque migração que apaga dado do criador não é migração aditiva.

## Acceptance Criteria

| AC | CAP | Observable behavior | Evidence |
|---|---|---|---|
| AC-clave-01 | CAP-clave-pautas | A lista de pautas mostra cada pauta com título, data e contagem de blocos, ordenada pela última abertura; abrir pauta leva à Bancada daquela pauta | teste automatizado da listagem + smoke real no app |
| AC-clave-02 | CAP-clave-pautas | Criar pauta exige título validado no domínio (até 120 caracteres) e data em campo com semântica nativa de data (`type="date"`, formato apresentado no locale pt-BR), sem segunda camada de formatação por cima; título vazio bloqueia o salvamento com erro inline ("Dê um título à pauta"); a pauta nova abre na Bancada vazia com o empty state da composição | teste que preenche o formulário real com entrada válida e com título vazio |
| AC-clave-03 | CAP-clave-pautas | Renomear pauta altera apenas a pauta escolhida; duplicar pauta cria uma pauta nova com cópia dos blocos e anexos, sem alterar a original | teste automatizado |
| AC-clave-04 | CAP-clave-pautas | Apagar pauta abre modal do design system com título nomeando a pauta, uma linha de consequência, confirmar destrutivo e cancelar; `Esc` cancela; nenhum `alert`, `confirm` ou `prompt` nativo existe no produto | teste que passa por confirmar e por cancelar |
| AC-clave-05 | CAP-clave-pautas | Iniciar o app equivale a reabrir a última pauta usada; sem nenhuma pauta, a lista mostra o empty state que leva à criação da primeira | teste automatizado + smoke real |
| AC-clave-06 | CAP-clave-pautas | A execução em aberto pertence a uma pauta: a lista marca cada pauta que tem execução sem `fim`, e abrir uma delas mostra o modal de ciclo de vida com duas saídas — retomar execução em aberto no bloco onde parou, ou encerrar retroativamente com `fim` no último passo registrado; nenhuma das saídas descarta o trajeto | teste automatizado dos dois caminhos, com duas pautas e apenas uma em aberto |
| AC-clave-07 | CAP-clave-bancada | A Bancada mostra a pauta como uma lista única e numerada, de cima para baixo, onde a ordem visual é a ordem da live; nenhuma pista por tipo existe; a etiqueta de cor viaja na borda do cartão; os resgates ficam numa reserva separada, fora da ordem, e não ocupam posição na pauta | teste do modelo + smoke visual da Bancada |
| AC-clave-08 | CAP-clave-bancada | Criar bloco e editar bloco exigem título (até 140 caracteres) e duração prevista entre 1 e 600 minutos, ambos validados no domínio e não apenas no formulário, com valores iniciais sugeridos na criação, `type="number"` e `inputmode` numérico na duração, e erro inline nomeando o que falta com `aria-invalid` e `aria-describedby`; todo campo aceito na criação é editável depois | teste que dirige o formulário real de criação e de edição, incluindo duração 0 e duração acima do limite |
| AC-clave-09 | CAP-clave-bancada | Trocar o tipo do bloco para `resgate` tira sua posição do trilho e recompacta a sequência dos demais; trocar de `resgate` para outro tipo o coloca no fim do trilho; a invariante `resgate ⇒ ordem null` é rejeitada no domínio quando violada | teste automatizado da invariante nos dois sentidos |
| AC-clave-10 | CAP-clave-bancada | Arrastar para reordenar o trilho mostra alvo válido e inválido, aplica de forma otimista e oferece "Desfazer"; a nova ordem sobrevive ao reload; existe equivalente por teclado ("mover para…") anunciado em live region | teste que arrasta e recarrega + smoke do caminho por teclado |
| AC-clave-11 | CAP-clave-bancada | Excluir bloco confirma pelo modal do design system antes de remover | teste por confirmar e por cancelar |
| AC-clave-12 | CAP-clave-bancada | Blocos e linhas são identificados pelo ID persistido: reordenar ou salvar não vaza gaveta aberta nem valor digitado para o bloco vizinho | teste que edita uma linha, salva e verifica que só o registro certo mudou |
| AC-clave-15 | CAP-clave-palco | "Entrar no ar" roda a checagem pré-live: cada bloco com anexo local inexistente recebe badge de erro antes de a execução começar, e a entrada no ar é um gate explícito de confirmação | teste com anexo válido e com anexo quebrado |
| AC-clave-16 | CAP-clave-palco | O Palco mostra barra superior com mini-pauta e relógio global, centro com título gigante e anexos, lateral com cronômetro do bloco e o próximo, e rodapé com o deck sobre o dispositivo de pauta no metal do bloco atual | smoke visual contra o protótipo aprovado |
| AC-clave-17 | CAP-clave-palco | A nota privada nunca renderiza por padrão, aparece somente enquanto `N` está pressionada e desaparece ao soltar; não existe estado persistente de notas visíveis | teste do comportamento hold-to-show + smoke visual |
| AC-clave-18 | CAP-clave-palco | `espaço` e `→` avançam, `←` volta, `R` saca resgate aleatório e `N` mostra a nota enquanto pressionada; avançar, voltar, sacar resgate e encerrar têm controle clicável equivalente e alcançável por teclado. O Palco não responde a nenhuma outra tecla: a interação **marcar trecho para corte** do protótipo aprovado não existe no produto entregue — `C` não abre trecho, não muda a cena, não deixa estado e não tem controle clicável correspondente | teste que exercita cada atalho e cada controle clicável equivalente + teste de que `C` não produz trecho aberto nem controle de marcação |
| AC-clave-19 | CAP-clave-palco | Cronômetro global da execução e cronômetro do bloco correm juntos, e o estouro do previsto é sinalizado visualmente sem esconder o timecode | teste do cronômetro + smoke visual do estado estourado |
| AC-clave-20 | CAP-clave-palco | O controle de voltar à Bancada mantém a execução em aberto e informa isso na própria tela; encerrar execução exige modal de confirmação | teste dos dois caminhos de saída |
| AC-clave-21 | CAP-clave-resgate | O deck fica sempre visível no rodapé; `R` ou clicar numa carta entra no resgate; sair do resgate volta ao ponto exato do trilho onde a live parou, sem passo manual. A carta já sacada nesta execução fica marcada como usada e sai do sorteio de `R`, e retomar uma execução em aberto reconstrói esse estado a partir dos passos com `foiResgate` já gravados no trajeto | teste que entra em resgate a partir de um bloco do meio e verifica o retorno + teste que saca duas vezes e retoma a execução conferindo as cartas marcadas |
| AC-clave-22 | CAP-clave-resgate | Pauta sem blocos de resgate mostra o deck em estado vazio explícito, nunca um rodapé mudo | teste automatizado + smoke visual |
| AC-clave-23 | CAP-clave-anexos | Um bloco carrega anexos de tipo vídeo, imagem, link, código, chat e arquivo; no Palco cada anexo oferece abrir anexo (vídeo, imagem, link, arquivo) ou copiar anexo (código, chat) com confirmação visível da cópia | teste por tipo de anexo |
| AC-clave-24 | CAP-clave-anexos | Anexo com `telaCheia` marcado toma a tela capturada em tela cheia; sem `telaCheia` abre no painel privado do apresentador, que nunca é renderizado na camada pública | teste dos dois modos + smoke visual da camada pública |
| AC-clave-25 | CAP-clave-anexos | Anexo de vídeo aceita arquivo local e URL web/YouTube; a falha ao abrir mostra estado de erro explícito no lugar da mídia, nomeando o anexo, nunca falha em silêncio | teste do caminho local e do caminho por URL, incluindo a falha |
| AC-clave-26 | CAP-clave-anexos | Anexar arquivo copia o arquivo para a pasta local de mídia do app, e o registro guarda caminho relativo, não caminho absoluto da máquina | teste de escrita e releitura do anexo |
| AC-clave-27 | CAP-clave-trajeto | Cada passo da execução grava id do bloco, snapshot de título e tipo, início relativo em segundos, duração real, duração prevista e se foi resgate | teste automatizado do registro |
| AC-clave-28 | CAP-clave-trajeto | O relatório mostra planejado × tocado por bloco e o total da live, com a cor do tipo em cada linha | teste do comparativo + smoke visual |
| AC-clave-29 | CAP-clave-trajeto | O relatório não oferece capítulos de vídeo nem lista de trechos para corte, e diz na própria tela que os tempos contam do "Entrar no ar", não da gravação; os timecodes exibidos usam `MM:SS` até 59:59 e `H:MM:SS` a partir de uma hora | teste do formato + teste de que o relatório não expõe capítulos nem trechos |
| AC-clave-31 | CAP-clave-acervo | Guardar um bloco no acervo cria um item com título, tipo e anexos, e a grade mostra vezes no ar e há quantos dias não vai ao ar | teste automatizado + smoke visual da grade |
| AC-clave-32 | CAP-clave-acervo | Clicar num item traz uma cópia independente para a pauta atual, guardando `origemAcervoId`; editar a cópia não altera o item do acervo | teste da cópia e da independência |
| AC-clave-33 | CAP-clave-acervo | Item do acervo pode ser renomeado e ter anexos editados; `tipo` é imutável após a promoção, com a razão exibida na própria superfície; remover confirma por modal do design system | teste que dirige o formulário de edição e o modal |
| AC-clave-34 | CAP-clave-acervo | `vezesNoAr` e `ultimaVezEm` do item sobem quando um bloco vindo dele é registrado no trajeto de uma execução | teste automatizado do contador |
| AC-clave-35 | CAP-clave-vocabulario | Toda string de interface usa o vocabulário canônico (Pauta, Bloco, Ponto, Resgate, Deck, Entrar no ar, Trajeto, Acervo), e nenhuma tela fala mais em "Pista" nem em "Marcadores"; nenhuma tela usa "slide", "apresentação", "item" ou "task" para esses conceitos. O vocabulário vincula texto de interface e substantivos do domínio na conversa, nunca identificadores de código, rotas ou caminhos, que seguem `.aioson/rules/source-code-language-convention.md` | verificação das strings da UI + smoke visual das telas |
| AC-clave-36 | CAP-clave-cenografia | A cor do tipo aparece em toda superfície onde o bloco existe (Bancada, selo do Palco, barra do cronômetro, mini-pauta, linha do relatório, carta do deck) seguindo o mapa tema→cobre, mídia→nióbio, interação→granada, convidado→prata, resgate→patina; ouro não é cor de nenhum tipo | smoke visual por superfície + verificação dos tokens |
| AC-clave-37 | CAP-clave-cenografia | Nenhuma informação do Palco fica abaixo de ~20px equivalentes e nenhum peso fino carrega informação; as fontes são servidas localmente pelo app, sem depender de rede | medição das telas do Palco + verificação de que nenhuma fonte é buscada em host externo |
| AC-clave-38 | CAP-clave-cenografia | Com `prefers-reduced-motion` ativo tudo fica estático: sem entrada palavra a palavra, poeira congelada e transições em aproximadamente 0ms | smoke visual com a preferência ligada |
| AC-clave-39 | CAP-clave-cenografia | A entrada do bloco no Palco é a única coreografia (palavra a palavra, 35 ms, última palavra em serif itálico no metal do tipo); as demais transições são funcionais de 150 ms | smoke visual do Palco |
| AC-clave-40 | CAP-clave-persistencia | Pautas, blocos, anexos, execuções, trajetos e itens do acervo sobrevivem a fechar e reabrir o app; nenhum dado do produto é gravado em `localStorage` | teste de escrita e releitura + verificação de que `localStorage` não guarda dado do produto |
| AC-clave-41 | CAP-clave-play | `manifest.json` na raiz descreve o app real: `runtime: node`, `stack: split`, `processes` com `port_env` para os dois processos, `webview_target`, `has_api: true` e nenhum `requires_services` | verificação do manifesto + dev-link real no Play com badge verde |
| AC-clave-42 | CAP-clave-play | Frontend e backend leem a porta de `process.env.PORT` e `process.env.BACKEND_PORT`; nenhuma porta é fixada no código | verificação do código + subida real pelo Play em porta alocada |
| AC-clave-43 | CAP-clave-play | `GET /api/aioson-play` responde com o schema de capabilities listando apenas rotas que existem de fato | teste da rota + conferência contra as rotas registradas |
| AC-clave-44 | CAP-clave-play | O app abre direto no produto, sem tela de login e sem tela de configuração de Auth URL ou binding | smoke real no Play |
| AC-clave-45 | CAP-clave-persistencia | Enquanto os dados da pauta ainda não chegaram, a tela mostra o estado de carregamento em vez de conteúdo vazio ou salto de layout; ao terminar, o conteúdo ocupa o mesmo lugar | teste do estado de carregamento com leitura atrasada + smoke visual do boot |
| AC-clave-46 | CAP-clave-cenografia | A 900px a interface recompõe para coluna única e o Palco empilha a lateral; a 360px nenhuma tela rola horizontalmente; em janela baixa (altura de 660px ou menos) o Palco comprime relógios, cartas e título sem que o conteúdo central invada o rodapé | medição em 1280x800, 1280x600 e 360px de largura, comparando as caixas do título e do rodapé do Palco |
| AC-clave-47 | CAP-clave-trajeto | Editar ou excluir um bloco com a execução em aberto não corrompe o trajeto: os passos já registrados mantêm o snapshot de título e tipo que estava no ar, o relatório continua exibindo esses passos mesmo depois de o bloco ser excluído, e o trilho recompacta apenas os passos ainda não executados | teste que registra passos, edita e exclui o bloco correspondente e abre o relatório |
| AC-clave-48 | CAP-clave-persistencia | Falha de escrita ou backend indisponível aparece na tela com a ação que falhou e o que fazer, preservando o que o criador digitou; nenhuma composição é dada como salva sem confirmação da gravação | teste com a escrita rejeitada e com o backend fora do ar |
| AC-clave-49 | CAP-clave-pontos | A ficha do bloco escreve, reordena e remove os pontos (texto até 200 caracteres, até 30 por bloco, imagem opcional por ponto), gravados na mesma transação do bloco; ponto sem texto é recusado no domínio com erro inline na própria linha; reescrever a lista preserva o id de quem já existia, e com ele a marca de falado; o cartão da Bancada conta quantos pontos o bloco tem | teste de API da reescrita com identidade + teste que dirige a gaveta real |
| AC-clave-50 | CAP-clave-pontos | No Palco, o bloco abre mostrando só o primeiro ponto; cada avanço marca o ponto em foco e revela o seguinte, com a imagem do ponto entrando junto; marcar é escrita persistida, então recarregar o Palco no meio da live devolve o checklist onde estava; um ponto marcado fora de ordem na gaveta não faz o Palco pular os anteriores | teste unitário da revelação + teste que conduz o Palco real e recarrega |
| AC-clave-51 | CAP-clave-pontos | `espaço`/`→` percorrem os pontos do bloco antes de trocar de bloco, e `←` desfaz pelo mesmo caminho: no começo do bloco ele volta ao bloco anterior. Bloco sem pontos avança direto. Avanços em sequência rápida não se perdem esperando a gravação | teste unitário do avanço e do retorno + teste que aperta espaço em sequência no Palco real |
| AC-clave-52 | CAP-clave-pontos | O Palco mostra as duas únicas perguntas de tempo que o criador faz: há quanto tempo ele está neste assunto e quanto falta para fechar a pauta, este último somando o que resta do bloco no ar com o previsto dos blocos que ainda não entraram, arredondado para cima e nunca negativo | teste unitário do cálculo, incluindo estouro e resgate no ar |
| AC-clave-53 | CAP-clave-pontos | Entrar no ar desmarca os pontos da pauta inteira, na mesma transação que abre a execução: a live começa com o checklist limpo mesmo depois de um ensaio | teste de API que marca, encerra, entra no ar de novo e confere |
| AC-clave-54 | CAP-clave-pontos | Guardar um bloco no acervo copia os pontos dele, e trazer a cópia de volta os devolve com ids próprios e desmarcados | teste de API da promoção e da cópia |
| AC-clave-55 | CAP-clave-pontos | Duplicar a pauta copia os pontos de cada bloco com ids próprios e desmarcados: a duplicata é uma live que ainda não aconteceu | teste de API da duplicação |

## Open questions

| # | Questão | Estado | Bloqueia? |
|---|---|---|---|
| 6 | Múltiplos trilhos ramificados são necessários, ou trilho único mais resgates cobre o caso real? | [testable] aberta — o v1 entrega trilho único mais resgates e a resposta vem das primeiras lives reais do autor (fonte §8.5) | não |
| 8 | Edição de bloco durante a execução ao vivo | **decidida nesta rodada:** o Palco é somente condução; a edição acontece na Bancada com a execução em aberto e vale do passo seguinte em diante, com os passos já gravados preservando o snapshot. Base: o Palco é cenografia capturada e o protótipo aprovado não modela edição ao vivo | não |
| 11 | Legibilidade da cenografia sob compressão real do YouTube | [testable] aberta — risco reduzido pela pesquisa do round 3 (cores saturadas sobre fundo escuro comprimem melhor; piso de ~20px em AC-clave-37); a validação com OBS real segue necessária e está em `## Métricas de sucesso` | não |
| 13 | "Marcadores inteligentes": avaliar a qualidade dos futuros capítulos e sugerir fusões na exportação | **diferida no round 3 e superada por R4.** A exportação de capítulos que a ideia melhoraria saiu do produto: AC-clave-29 hoje exige o contrário — que o relatório **não** ofereça capítulos nem trechos para corte —, porque o `00:00` da execução não coincide com o da gravação. A questão só volta a existir se a exportação voltar ao escopo, e isso depende de resolver antes esse descasamento de relógios | não |
| 15 | Slug do app no Play: `manifest.json` traz `aioson-crave-2` (nome da pasta do scaffold) enquanto o produto é Clave | **resolvida pela entrega.** O manifesto reescrito na fase 1 traz `slug: clave`, e AC-clave-41 verifica exatamente isso. A pasta do repositório continua `aioson-crave-2` e não tem efeito sobre o produto: o Play registra o app pelo slug do manifesto, não pelo nome do diretório | não |
| 16 | Motor de persistência local: `better-sqlite3` compila no runtime real do Play? | aberta — resolvida pelo spike que abre a fase 1; o contrato de produto é AC-clave-40, e o fallback documentado no briefing mantém a troca barata | não |
| 17 | A fonte propõe estrutura e identificadores em português (SRC-001 §4 e §6), enquanto `.aioson/rules/source-code-language-convention.md` exige identificadores de código em inglês | **decidida nesta rodada:** a regra do projeto vence, porque `.aioson/rules/` supera o PRD. O vocabulário canônico (PROM-011) vale para texto de interface e para os substantivos do domínio na conversa; a tradução para identificadores, rotas e caminhos é decisão de `@planner`/`@dev` sob a regra. Nenhum comportamento observável muda | não |

| 18 | Cabeçalhos de linhagem do briefing fora da forma canônica, deixando o validador cego para os `PROM-*` | **resolvida em 2026-08-18 por `@briefing-refiner`, com autorização do usuário.** Três rótulos migraram para a forma canônica (`Source Inventory`: `ID`→`Source`; `Source Promise Map`: `ID`→`Promise` e `Promise`→`Approved intent`); nenhuma linha de conteúdo mudou (14 `PROM-*` e 1 `SRC-001` intactos, `diff` de duas linhas contra o backup). O `applied_hash` do `refinement-report.md` foi reemitido no mesmo passo (`aa9c5d37…`→`05da4b6c…`), então F13, F14 e F15 seguem binding. Backup e registro da migração em `.aioson/briefings/clave/lineage-migration/`. Consequência conhecida: os review packets ligados ao hash anterior caíram, e o PASS do `@sheldon` precisa ser reemitido | não |

Nenhuma questão aberta é bloqueante: todas têm caminho decidido para o v1, com resposta prevista por uso real, pelo spike da fase 1 ou por reparo em artefato de outro agente.
