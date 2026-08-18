---
feature: clave
status: approved
identity: .aioson/briefings/clave/identity.md
design_skill: interface-design
approved_at: 2026-08-18T03:29:20.770Z
---

# Prototype manifest — Clave

## Visual direction

- **Registro estético (um só): Constructed** — a tipografia é a composição; profundidade apenas por linhas (a única sombra é o lift efêmero do drag); movimento mecânico curto; assimetria sobre grade visível.
- **Assinatura reconhecível sem o logo:** *os blocos moram SOBRE as linhas da pauta* — cada pista da Bancada é uma linha contínua de pauta com os blocos pousados nela como notas, com régua de compassos numerada; a lista de pautas é editorial (linhas, não caixas) com número de compasso; o rodapé do Palco carrega o dispositivo D-02 no metal do bloco atual.
- **Peso é sinal, não textura (build 5):** quatro pesos com papel fixo — 400 corpo · 500 estrutura e voz da máquina (mono, rótulos, títulos de item) · 600 hierarquia (headings, ação primária, estados ao vivo) · **800 exclusivo do título gigante do Palco**, a única voz gritada e a única que precisa sobreviver à compressão do YouTube. A voz da máquina passa a ser carregada por *tracking* e caixa alta, não por negrito. Ênfase inline é `.termo` (cor + meio passo), e `b,strong` estão normalizados em 500 para impedir regressão.
- **Tese:** cenografia de estúdio de forja — tinta quente, metais com dono, ouro só nos momentos de decisão ("Entrar no ar", modais de gate com fio ouro à esquerda).
- **Anti-goals desta superfície:** composição de SaaS genérico (grade uniforme de cards, chrome de pílulas), emoji como ícone, azul estrutural, preto absoluto + neon, serif na máquina / mono na intenção, cards dentro de cards.

## Proveniência visual

- Autoridade visual: **AIOSON Design-DNA v1 "Tinta & Ouro"**, consumido via `.aioson/briefings/clave/identity.md` (extraído dos arquivos textuais `runs/variant-d/design-dna/` da exploração `aioson-ecosystem-identity` do projeto aioson-com — variante **selecionada**, rodadas 9–11 de 2026-08-11/12).
- Esta rota **substitui a decisão F4 do round 1** (originação direta do §5 da fonte) por **direção explícita do usuário no chat de 2026-08-15** ("usar a skill interface-design + o design system novo… ouro e black, pode usar cores à vontade"). O `identity.md` da raiz da exploração (2026-08-09, identidade azul antiga) foi verificado como **desatualizado** e não foi usado.
- O que sobrevive da fonte §5 dentro do DNA: *cor codifica tipo de bloco* (agora via mapa tipo→metal: tema→cobre, mídia→nióbio, interação→granada, convidado→prata, resgate→patina; ouro reservado a marca/ação primária/gate), a coreografia única de entrada palavra-a-palavra (35 ms) — agora fundida ao dispositivo **D-03 Palavra viva** (última palavra em serif itálico no metal do bloco) —, timecode em mono, e `prefers-reduced-motion`.
- Dispositivos do DNA implementados: **D-01 Batuta** (eyebrows), **D-02 Pauta** (cinco linhas + compasso no metal do bloco, no rodapé do Palco; na Bancada as 5 pistas são o dispositivo em escala de aplicação), **D-03 Palavra viva**, **D-04 Poeira de ouro** (nebulosa no metal do bloco atual atrás do Palco; estática em reduced-motion; nunca campo de estrelas). Vale de energia sinaliza em `perigo` (o vale é o perigo da live morrer); "AO AR" e resgates falam em patina (o metal do que está vivo).
- Fontes não são embutidas (protótipo autossuficiente, sem rede): Inter/JetBrains Mono renderizam se instaladas; caso contrário caem em Segoe UI/Cascadia/system — as três vozes (estrutura sans, intenção serif itálico, máquina mono) sobrevivem no fallback. A implementação real deve servir as fontes localmente.
- Registro pendente: recomenda-se que `@product`/`@ux-ui` registrem `design_skill: interface-design` como definitivo no contexto do projeto (achado não-bloqueante).

## Superfície operacional modelada

| Tela (rota hash) | Ações que mutam estado mock | Estados demonstráveis |
|---|---|---|
| `#/pautas` — lista mínima (decisão F3) | criar, renomear, duplicar, apagar (modal destrutivo), abrir | populado, vazio (apagando todas), "última usada", "execução em aberto" |
| `#/bancada/:id` — canvas 5 pistas | criar/editar/excluir bloco (gaveta com validação de domínio — decisão F9), drag & drop no trilho com undo + fallback por botões, guardar no acervo, invariante resgate⇒ordem null na troca de tipo | populado (Live #42), vazio (Live #43), badge de anexo quebrado, curva de energia com vale de 20 min detectado |
| `#/palco/:id` — cenografia | entrar no ar (checagem pré-live de anexos — decisão round 1), avançar/voltar, sacar resgate (deck + `R`), retorno automático ao trilho, `N` **hold-to-show** (decisão F2), `C` marca trecho, encerrar (modal) | camada privada oculta por padrão, anexo `telaCheia` local **e** URL web/YouTube (decisão F1 provisória — os dois demonstrados), anexo "só você vê", anexo quebrado (erro), deck vazio, cronômetro estourado |
| `#/acervo` | trazer cópia para a pauta atual | populado, vazio; gestão completa **adiada por decisão** (PRD fase 6 — chip visível) |
| `#/relatorio/:execId` | copiar capítulos, baixar .txt, copiar cortes | trajeto planejado × tocado (Live #41 seed), marcadores YouTube (primeira linha 00:00 — decisão round 1), cortes vazio/populado |
| Camada didática (overlay, sem rota) — tour de 5 passos + guia completo | reabrir pelo controle `? Como usar`; do tour para o guia e do guia para o tour | primeira abertura automática, reabertura manual, holofote sobre a região do passo, Esc fecha |
| Ciclo de vida | execução em aberto ao reabrir → modal retomar / encerrar retroativamente (decisão F5) | demonstrável saindo do Palco por "voltar à bancada" |

Permission-denied: **não aplicável** — decisão 12 do round 1 (sem login/aioson-auth, uso local single-user).

## Core interactions

Índice legível por máquina das interações já descritas na tabela acima. Acrescentado pelo agente Product em 2026-08-18 para que a checagem estrita do protótipo leia as interações reais em vez de cair no fallback que varre o arquivo inteiro (o fallback tratava trechos de log de build como interação). Nenhuma decisão, estado ou conteúdo aprovado foi alterado.

- `criar pauta`
- `renomear pauta`
- `duplicar pauta`
- `apagar pauta`
- `abrir pauta`
- `reabrir a última pauta usada`
- `retomar execução em aberto`
- `encerrar retroativamente`
- `criar bloco`
- `editar bloco`
- `excluir bloco`
- `arrastar para reordenar o trilho`
- `desfazer`
- `mover para`
- `guardar no acervo`
- `trocar o tipo do bloco`
- `entrar no ar`
- `checagem pré-live`
- `avançar`
- `voltar`
- `sacar resgate`
- `retorno automático ao trilho`
- `hold-to-show`
- `marcar trecho para corte`
- `encerrar execução`
- `abrir anexo`
- `copiar anexo`
- `tela cheia`
- `trazer cópia`
- `copiar capítulos`
- `baixar .txt`
- `copiar cortes`
- `voltar à bancada`

## Quality evidence

- **Build 5 — passe de suavização, guia de leigo e telemetria de runtime (2026-08-18, a partir de 6 screenshots do usuário):**
  (a) **Tipografia**: 60 declarações de peso reescritas para o sistema de quatro pesos descrito em `## Visual direction`; sobrou um único `800` no arquivo (`.titulo-gigante` do Palco). *Tracking* subiu onde o peso caiu, para a voz mono não perder registro. Corpo passou a 1.62 de entrelinha; o balão do tour, a 1.65.
  (b) **Camada didática em dois níveis**: tour de 5 passos (novo passo de abertura "o que é o Clave", cópia reescrita em linguagem de leigo, ênfase por cor em vez de `<b>`) e **guia completo** no controle `? Como usar`, com quatro movimentos na ordem de uma live real, a tabela das seis teclas do Palco e um bloco honesto de limites do protótipo. O gate voltou a enxergar o explicador porque as regiões ancoradas passaram a usar `data-aioson-tour` (antes só `data-aioson-id`).
  (c) **Navegação de volta** (pedido explícito do usuário): a marca do topo virou botão para a lista de pautas, Bancada e Relatório ganharam "← Todas as pautas", e a saída do Palco deixou de ser texto quase invisível no canto para ocupar a primeira coluna do topo (`← Bancada`, com título explicando que a execução fica em aberto).
  (d) **Bug de camada corrigido** (screenshot do usuário: "as linhas todas empilhadas ali embaixo"): a faixa solta de cinco linhas acima do deck virou o dispositivo D-02 aplicado como na Bancada — as cartas do deck agora **pousam sobre** as linhas da pauta, com o compasso no metal do bloco atual. No mesmo rodapé, o botão de notas privadas atravessava o deck porque `.palco > :not(.poeira){position:relative}` anulava seu `position:absolute` (ver `.aioson/learnings/gotchas/palco-grid-anula-position-absolute.md`); ele passou a morar na linha do rodapé.
  (e) **Marcador ausente**: `data-aioson-primary` não existia no arquivo — o diferencial nº 1 (curva de energia) não estava marcado. Marcado e verificado.
  (f) **Findings de runtime reparados**: contraste 1:1 no CTA (o gradiente deixava `background-color` transparente; agora há cor sólida sob a imagem), rolagem horizontal de 127px a 360px (chrome recompõe: marca sem wordmark, nav compacta, CTA menor, topbar rolável), 2 alvos de toque abaixo de 44px, 1 emoji na UI e 29 travessões espaçados no corpus (reescritos com pontos, dois-pontos e parênteses; contador zerado no relatório).
  Revalidado: `node --check` OK, sem erros de página em execução real; `verify:artifact --kind=visual --runtime` **OK, sem findings bloqueantes**; 360px sem rolagem horizontal (`scrollWidth == innerWidth == 360`).
- **Build 5.1 — Palco em janela baixa e mídia de verdade (2026-08-18, a partir de mais dois screenshots do usuário):**
  (a) **Encavalamento corrigido**: em janela baixa a faixa central da grade do Palco encolhia mas não recortava, e o conteúdo pintava por cima do rodapé. Agora `overflow:hidden` na faixa, rolagem própria nos dois blocos internos, título respondendo à altura (`clamp(30px, min(5.6vw,11.5vh), 78px)`) e um `@media (max-height:660px)` que comprime relógios, paddings e cartas. Verificado por comparação de caixas (título × rodapé) em 1878x550, 1280x600, 1261x765 e 1280x800: sem sobreposição em nenhum. Detalhes em `.aioson/learnings/gotchas/palco-transborda-em-janela-baixa.md`.
  (b) **Mesma causa do bug do build 5**, agora corrigida na raiz: `.palco > :not(.poeira){position:relative}` também derrubava o `position:fixed` da **tomada de tela** (que por isso não cobria o topo) e do **painel "só você vê"**. A regra passou a nomear as três faixas. `.selo-resgate` deixou de esticar na largura toda (`align-self:flex-start`).
  (c) **Mídia real embutida** (pedido do usuário): dois screenshots do próprio ecossistema reduzidos para 900px/JPEG (98KB e 93KB) e um **screencast da curva de energia gerado por canvas + MediaRecorder** (VP9/webm, 6s, 242KB). Tudo em data URI: a tomada agora **exibe a imagem e toca o vídeo de verdade**, o painel privado mostra a prévia e a gaveta ganhou miniatura. O anexo quebrado continua quebrado (o estado de erro é evidência exigida) e o `midia` sobrevive à edição do anexo, sendo descartado quando o caminho muda. Arquivo final: **536KB**, dentro do teto de 2MB.
  (d) **Vídeos da pasta do usuário não foram usados**: os dois candidatos continham conteúdo pessoal identificável (rosto e abas de navegador num; Explorer com nomes de arquivos pessoais no outro). Embutir isso num artefato compartilhável seria vazamento; o screencast sintético cobre o mesmo requisito sem esse risco.
  Revalidado: `node --check` OK; sem erros de página; `verify:artifact --kind=visual --runtime` **OK**; vídeo confirmado tocando na tomada (`duration 6.14s`, `videoWidth 800`).
- **Runtime medido a partir do build 5.** O Playwright passou a estar disponível no ambiente (1.62.1), então o gate deixou de ser static-only: a rodada mediu contraste computado, overflow a 360px, alvos de toque e a dobra. Os quatro findings bloqueantes que só o browser via foram reparados no próprio protótipo. Decisão registrada: **telemetria de runtime fica ligada** para este feature.
- **Build 4.1 — correção do empilhamento do tour (2026-08-15, a partir de screenshot do usuário):** o destaque do tour elevava o alvo com `z-index:86`; no passo 1 o alvo é o canvas inteiro, então **o canvas subia acima do balão do tour e da gaveta de edição** (cards atropelando o texto e o formulário) e continuava clicável no meio do tour. Técnica substituída por **holofote**: o fundo escuro é um recorte (`box-shadow` gigante em `.tour-foco` medido via `getBoundingClientRect`) e o balão vive numa camada própria acima (`z-index:87`), posicionado no topo/base conforme a região iluminada; re-mede em `resize`. Nenhum elemento do app muda de camada; o fundo agora bloqueia interação durante o tour. Revalidado: `node --check` OK; `verify --kind=visual` OK.
- **Build 4 — correção crítica + camada didática + passe premium (2026-08-15):** (a) **bug corrigido**: a curva de energia renderizava abaixo da dobra (`min-height:0` ausente no flex do canvas) — o diferencial nº 1 do produto estava invisível; agora a curva fica sempre visível, fixada abaixo do canvas rolável. (b) **Tour de primeira abertura**: 4 passos que explicam Bancada, curva/vale, resgates e Palco em linguagem de leigo, com destaque ouro na região correspondente e botão `?` fixo para reabrir — o protótipo passa a se explicar sozinho ao dono do produto. (c) **Efeitos com propósito**: curva se desenha animada com brilho (feGaussianBlur) e área preenchida em gradiente ouro, selo "VALE · N MIN" dentro do gráfico, entrada em cascata dos blocos (22 ms), glow do metal do tipo no hover dos cards e das cartas do deck, varredura de ouro no CTA "Entrar no ar", grão de textura estático a 4,5% sobre a interface. Tudo morre sob `prefers-reduced-motion`. Revalidado: JS `node --check` OK; `verify --kind=visual` OK sem findings bloqueantes.
- **Build 3 — passe anti-slop de composição (2026-08-15):** após o usuário apontar composição genérica ("cara de IA slop"), a composição foi re-originada sob o registro Constructed (ver `## Visual direction`): pistas viraram linhas contínuas de pauta com blocos pousados sobre elas + régua de compassos; lista de pautas editorial sem caixas; nav do chrome em mono com sublinhado ouro; cartas do deck com canto usinado (clip-path); medidor de energia em barras; emojis removidos da UI (substituídos por SVG inline/texto mono); modais de gate com fio ouro. Revalidado: JS `node --check` OK; `verify:artifact --kind=visual` OK sem findings bloqueantes ("depth borders+shadows" = a única sombra é o lift efêmero de drag, feedback de estado). A falha de processo que deixou a composição genérica passar está documentada em `researchs/aioson-anti-slop-gap/relatorio.md`.
- Após a migração para o DNA: `verify:artifact --kind=visual --slug=clave --advisory --runtime`: **OK, sem findings bloqueantes**; reduced-motion presente; depth por bordas (1 estratégia); 0 fontes embutidas; JS validado com `node --check`. `verify:artifact --kind=identity` sobre o `identity.md` consumido: **OK, sem issues**.
- **Runtime não medido até o build 4.1** (histórico) — motivo do relatório: "playwright is not installed, runtime telemetry skipped". O gate ficou static-only, registrado aqui conforme o contrato (nunca skip silencioso). Superado pelo build 5.
- Reparos aplicados no próprio protótipo (build anterior): normalização de espaçamentos para a grade de 4px (94 → 60 valores fora, restantes são ajustes ópticos finos de chips/badges) e correção de desalinhamento da curva de energia com as pistas (offset duplicado de 110px).
- Evidência de pesquisa a favor da cenografia: cores saturadas sobre fundo escuro sobrevivem melhor à compressão do YouTube que tons pastéis (`researchs/clave-cenografia-e-marcadores/summary.md`) — o DNA Tinta & Ouro é favorável ao Palco capturado; a validação real no OBS segue como questão 11 [testable].
- Avisos de threshold justificados:
  - *"management surface with no widget/KPI/chart markers"* — a home é a **lista mínima de pautas por decisão vinculante F3 do round 1** (a opção "home com widgets" foi apresentada e não selecionada pelo usuário).
  - *token adherence 39%* (era 43% antes do build 5, com mais literais por causa do guia) — toda cor e tipo vêm de tokens; os literais são dimensões estruturais de layout (larguras de coluna do canvas, alturas de pista, recuos do guia) inerentes à cenografia.
  - *79 valores fora da grade de 4px* (chegaram a 100 no meio do build 5, normalizados em duas passadas) — o que resta são ajustes ópticos de 1–2px em chips, badges e teclas, além de meias-linhas de 0,5px do dispositivo Pauta.

## Limites (mock ≠ implementação)

- Estado vive em memória: **recarregar a página reinicia os dados seed** (persistência SQLite é da implementação; a fonte §6 proíbe `localStorage`).
- A tomada de tela **toca mídia de verdade** para os anexos que trazem `midia` (duas imagens e um screencast embutidos em data URI): serve para julgar enquadramento, legibilidade sob captura e o gesto de abrir/fechar. O que continua mock é a **origem**: o produto real lê arquivo do disco ou URL, e nada aqui prova leitura de disco, codec do usuário nem player de URL da web.
- A gravação do trajeto usa o relógio real; o relatório seed (Live #41) demonstra o resultado sem esperar uma live inteira.
- Nada aqui prova integração de backend, portas do Play ou manifest — o protótipo é contrato **visual e de interação**, não prova de implementação.
