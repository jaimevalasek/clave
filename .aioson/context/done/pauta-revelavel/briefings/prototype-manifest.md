---
feature: pauta-revelavel
status: approved
identity: .aioson/briefings/pauta-revelavel/identity.md
references: extracted
design_skill: interface-design (default)
surface_mode: operate
approved_at: 2026-11-11T06:24:29.660Z
---

# Prototype manifest — Pauta revelável

Mock only — refresh resets, no backend. Colagens e arquivos soltos viram blocos de verdade dentro do navegador (URLs locais de objeto), mas nada é gravado em disco.

## Visual direction

- register: Editorial. A coluna de texto é a composição; a hierarquia vem de tipo grande, ritmo de linha e margem, não de cartões.
- thesis: uma folha de papel pautado em tinta quente, onde o roteiro se escreve na frente do público, um bloco de cada vez.
- signature move: tinta assentando. Revelar um bloco passa uma máscara da esquerda para a direita e o bloco pousa na linha da pauta; a coluna rola junto. Em movimento reduzido, aparece de uma vez.
- composition signature: uma única coluna de até 900px sobre linhas de pauta a cada 44px, com a ferramenta reduzida a uma régua fina no topo e a uma calha que só aparece no foco.
- anti-goals: deck de slides com páginas e miniaturas; SaaS genérico com grade de cartões, pílulas, gradiente decorativo ou emoji como ícone; preto absoluto com neon ou azul estrutural.
- composition family: coluna editorial única sobre papel pautado
- material family: superfícies chapadas com linhas de 1px (sem sombra além do lift de arraste)
- motion family: revelação por máscara de tinta + rolagem acompanhada

## Design system decision

- Escolha: `references` (reuso adaptado). Palavras do dono: decisão F14 da rodada 1, opção `identity-references`, aceita em 2026-11-11 com "Pode aplicar as recomendações e prosseguir".
- Escopo: este briefing (`scope: briefing`).
- Consolidação: `.aioson/briefings/pauta-revelavel/identity.md`, adaptada de "Tinta & Ouro" (`.aioson/briefings/clave/identity.md` + `src/ui/tokens.css`). `verify:artifact --kind=identity` OK.
- `design:seed` foi executado com a identidade (polo escuro, registro editorial aplicados). As paletas sorteadas eram azuis e ficam descartadas, porque a identidade aprovada proíbe azul estrutural; a identidade supera o sorteio.

## Superfície modelada

Origem do mapa: `expansion-scout.md` (Experience Map e Operational Surface Map) com as decisões aceitas na rodada 1 (`refinement-feedback.applied-round1.json`).

| Tela (rota hash) | Ações que mudam o estado mock | Estados demonstráveis | Decisões e promessas |
|---|---|---|---|
| `#/pauta/:id`: a coluna única | Tab e Shift+Tab (ou Alt+→/←) para sub-item até 3 níveis, revelar o tópico inteiro com Shift+PgDn, ocultar o tópico junto com os sub-itens, recolher tópico no preparo, colar lista como hierarquia, digitar (Enter duas vezes no fim abre o próximo no mesmo nível), tamanho do bloco P, M, G ou Título (barra acima do bloco ou Ctrl+Alt+1 a 4) com ajuste fino A−/A+ de 4px na faixa do tamanho (Ctrl+Alt+− e Ctrl+Alt+=), cor (6 do tema) e negrito no trecho selecionado pela barrinha ou Ctrl+B, voltar ao normal, colar texto (linha em branco divide em blocos), colar ou soltar imagem, vídeo e áudio, revelar próximo (PgDn ou botão), ocultar último (PgUp ou botão), olho por bloco, preparo (F2 ou botão), começa oculto/visível, nova tomada (modal), mover por arraste e Alt+↑/↓, apagar bloco (modal), tocar mídia (clique ou Ctrl+Enter), renomear a pauta no próprio título | populada; vazia; mídia gravando; falha de mídia (ausente, formato, grande demais, falha ao gravar); falha ao salvar; preparo ligado; fim da pauta com tudo na tela | PROM-001 a PROM-010, PROM-013 a PROM-017; F1 a F7, F10, F12, F13, F15 a F21; S1 a S4, S8; G1, G2 |
| `#/pautas`: lista de pautas | criar (modal com validação), abrir, renomear (modal), duplicar, apagar (modal destrutivo) | populada; vazia; pauta migrada do Clave antigo | PROM-012; F1, F10 |
| Painel Aparência (sobre qualquer tela) | escolher tema (5 prontos), cor de destaque livre com aviso de contraste, fundo do tema, cor, gradiente ou imagem; as 6 cores de texto acompanham o tema | contraste suficiente; contraste baixo (aviso) | PROM-011, PROM-014; F8, F9, F14, F16 |
| Tour de primeira abertura (sem rota) | 5 passos com holofote; reabre pelo `?` | primeira abertura automática; reabertura manual | PROM-004, PROM-005, PROM-006, PROM-007, PROM-009, PROM-011 |

Fica fora do protótipo por decisão: desfazer (S5), modo limpo (S6), destaque do bloco atual (S7), ajuste global de tamanho da pauta inteira e cor de texto livre (alternativas de F17 e F16), revelação linha a linha (F4). Texto colado de fora entra sem a formatação de origem. Permissão negada não se aplica: uso local, sem login.

Interpretação a confirmar por @product: um bloco criado com o preparo **desligado** entra na tela na hora (é o apresentador escrevendo ao vivo, como no bloco de notas) e, mesmo assim, fica planejado como "começa oculto" para as próximas tomadas (F5). Com o preparo ligado, ele nasce esmaecido.

Simplificações do mock: a formatação usa `document.execCommand` sobre um `contenteditable` (marcas `<b>` e seis cores sentinela mapeadas para tokens do tema); a implementação real deve usar um editor com modelo próprio e a mesma lista fechada de marcas. O vídeo de exemplo é uma animação em canvas (rotulada "exemplo simulado"); o áudio de exemplo é um tom gerado no navegador (rotulado); "gravando na pasta de mídia" é um progresso simulado; vídeo, áudio e imagem colados ou soltos de verdade tocam de verdade, mas somem ao recarregar.

## Core interactions

- `digitar no bloco`
- `colar texto`
- `escolher tamanho do bloco`
- `aumentar tamanho do bloco`
- `diminuir tamanho do bloco`
- `aplicar cor no trecho`
- `aplicar negrito no trecho`
- `voltar o trecho ao normal`
- `enter duas vezes abre bloco`
- `tab cria sub-item`
- `shift+tab volta um nível`
- `revelar tópico com sub-itens`
- `ocultar tópico com sub-itens`
- `mover tópico com sub-itens`
- `colar lista vira sub-itens`
- `recolher tópico no preparo`
- `apagar tópico sobe os sub-itens`
- `dividir por linha em branco`
- `colar imagem`
- `colar vídeo`
- `colar áudio`
- `soltar arquivo`
- `revelar próximo`
- `ocultar último`
- `ocultar bloco pelo olho`
- `mostrar bloco pelo olho`
- `ligar preparo`
- `desligar preparo`
- `começa oculto`
- `começa visível`
- `nova tomada`
- `mover bloco`
- `apagar bloco`
- `tocar mídia`
- `rolagem automática`
- `procurar arquivo ausente`
- `tentar de novo`
- `criar pauta`
- `abrir pauta`
- `renomear pauta`
- `duplicar pauta`
- `apagar pauta`
- `escolher tema`
- `escolher cor de destaque`
- `escolher plano de fundo`
- `reabrir o tour`

## Runtime matrix

- entry: #/pauta/p1
- preparo: #/pauta/p1?preparo=1
- loading: #/pauta/p1?state=loading
- empty: #/pauta/p3?state=empty
- error: #/pauta/p1?state=error
- success: #/pauta/p1?state=success
- lista: #/pautas
- lista-empty: #/pautas?state=empty

## Refinement budget

- Escolha: `default` (o dono pediu "prosseguir" sem limitar o ciclo).
- Ciclo de refinamento: 1 de 1, consumido.
- Rodada 2 (2026-11-11): mudança pedida explicitamente pelo dono depois de usar o protótipo ("ficou faltando opções de tamanhos de fontes, colocar cores nelas e deixar em negrito ou normal"). Autoriza essa mudança e a checagem focada dela, não um novo ciclo de polimento.
- Rodada 3 (2026-11-11): sub-itens com Tab, pedidos pelo dono ("Senti falta de ter opção de clicar na tecla tab e poder criar sub-item, poderia analisar melhorias aqui nesta parte?"). Mesma regra: mudança e checagem focada.
- Rodada 4 (2026-11-11): Título menor e ajuste A−/A+ por bloco, pedidos antes da aprovação ("achei que a opção titulo ficou muito grande, teria alguma opção de aumentar ou mininuir o tamanho"). Mesma regra.

## Quality evidence

- verdict: pass
- evidence: .aioson/context/features/pauta-revelavel/visual-evidence.json
- craft: 3/4 (operate; precision 86/100, barra 60)
- runtime: measured (Playwright Chromium, desktop 1280 e mobile, 16 capturas)
- routes: 8

Verificações feitas de fato:

- **Passeio do protótipo com promessas:** `.aioson/briefings/pauta-revelavel/walkthrough.json`, executado com `aioson browser:run ... --prototype`: **PASS 123/123 passos**. As 17 promessas foram provadas (PROM-001 a PROM-017), inclusive colar texto com quebras do Windows (CRLF), colar um print, colar formato não suportado, preparo ligar e desligar sem deixar fantasma na tela, nova tomada com cancelar e confirmar, Ctrl+Enter tocando mídia, tema e fundo, lista com apagar cancelado e criar com validação. Na rodada 2, também: selecionar um trecho mostra a barrinha; negrito e cor de destaque aplicam só no trecho (peso 700 e cor diferente do resto); tamanho Título dá 64px; Ctrl+Alt+1 volta a P; Normal tira negrito e cor; a formatação fica guardada no bloco. Na rodada 3: Tab vira nível 1 com marcador •; um segundo Tab sem tópico acima é recusado; Shift+Tab volta e o texto sobe um tamanho; Enter duas vezes cria o próximo no mesmo nível; Shift+PgDn revela o tópico b4 com os 3 sub-itens e PgUp desfaz o grupo; ocultar o tópico some com os sub-itens; Alt+↓ move o tópico com a subárvore; colar "- Abertura / - Gancho / - Pergunta ao chat / - Desenvolvimento" com recuo cria os níveis 0, 1, 2, 0; recolher no preparo esconde 3 sub-itens; apagar o tópico b6 sobe o áudio para o nível 0. Na rodada 4: Título nasce em 52px; A+ vai a 56px e mostra o valor; A− desce até 44px e trava; Ctrl+Alt+= sobe para 48px. Relatório: `.aioson/briefings/pauta-revelavel/browser/pauta-revelavel-prototipo.json`.
- **Tour e marcador principal:** tour de 5 passos com `data-aioson-tour` e botão `?` para reabrir; `data-aioson-primary` na coluna, visível na primeira dobra em desktop e mobile (runtime: `primary_below_fold 0`).
- **Microinteração da assinatura:** "tinta assentando" anima só o conteúdo do bloco (máscara + 8px), com rolagem acompanhada; some em `prefers-reduced-motion`.
- **Olhar de primeira viagem (subagente sem contexto):** descreveu o produto como "um roteiro revelável para quem grava vídeos ou faz lives; o público vê a mesma folha em que você escreve", e cada tela pelo que ela é. **Bate com as promessas do briefing.** Os pontos que ele achou foram reparados neste ciclo:
  - colar com linha em branco não dividia por causa do CRLF do Windows;
  - "1 visíveis" no diálogo de nova tomada;
  - PgDn numa pauta vazia dizia "tudo já está na tela";
  - ocultar pelo olho não dava retorno;
  - o selo "migrada do Clave antigo" não se explicava.
- **Rodada 4 conferida em captura** (desktop e 390px): com 52px, a entrelinha de 88px deixava o Título arejado demais, e isso também lia como exagero. O Título passou a usar entrelinha justa (1,12) e o bloco completa a altura até o múltiplo de 44px, como as mídias, para o bloco seguinte voltar às linhas da pauta. No celular, a barra de tamanho quebrava a borda e agora quebra linha para cima.
- **Defeitos da rodada 3 achados pelo passeio e reparados:** com `white-space: pre-wrap`, o Chrome grava quebras de linha como o caractere de nova linha e não como `<br>`; por isso "Enter duas vezes" não reconhecia o fim do bloco. A detecção passou a ignorar espaços e quebras depois do cursor, e o salvamento converte essas quebras em `<br>`. Um passo do passeio usa o clique pelo próprio elemento no olho do tópico, porque a régua fixa cobre o topo depois da rolagem; o clique real no olho já é provado no passo de PROM-007.
- **Defeito achado pelo passeio e reparado:** a animação de revelar aplicava `clip-path` ao bloco inteiro e deixava a calha (arrastar, olho, apagar) recortada e inclicável depois da revelação. Agora só o conteúdo anima.
- **Rodada 2 conferida em capturas** (desktop e 390px, temas Tinta & Ouro e Caderno): título em 64px com trecho na cor de destaque, negrito e vermelho no bloco 2, barrinha acima da seleção. Dois ajustes feitos depois da captura: a barrinha quebrava a borda no celular (agora quebra linha) e a marca de bloco selecionado cruzava o ícone de apagar (removida). A barrinha nasceu com sombra e voltou a usar só borda, como manda a identidade.
- **Telemetria final:** tokens 74%, 2 valores fora da grade de 4px, 1 estratégia de profundidade (bordas), 2 fontes entregues embutidas (Inter e JetBrains Mono do próprio app), `em_dash_prose 0`, `tells 0`, 0 diálogos nativos, 0 overflow horizontal, contraste sem falhas, nenhum alvo de toque abaixo de 44px no mobile.
- **Avisos justificados:**
  - *cross-project palette repetition* (ouro sobre escuro, parecido com "aioson-play"): é continuidade de produto escolhida pelo dono. A identidade "Tinta & Ouro" é o DNA do ecossistema AIOSON, reaproveitada por decisão F14; o tema é trocável pelo usuário (F8).
  - *modern CSS breadth 1/7*: protótipo de arquivo único; `color-mix` cobre os temas e o véu da folha. Container queries ou `:has` não resolvem nenhum problema desta superfície.
  - *materials 0/7*: o registro Editorial argumenta por tipo e linha de pauta, não por material; a superfície é `operate`.
- **Limites:** mock sem backend; recarregar volta ao início (incluindo o tema). Colar arquivos do Explorer foi exercitado com eventos sintéticos no Chromium, não no webview real do Play (questão 10 do briefing, risco R2). Legibilidade dos temas em vídeo comprimido a 720p não foi testada (questão 11). No celular, o painel Aparência cobre a régua enquanto está aberto; os atalhos continuam funcionando.
