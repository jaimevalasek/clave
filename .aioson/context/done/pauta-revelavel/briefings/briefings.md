---
slug: pauta-revelavel
created_at: 2026-11-11
updated_at: 2026-11-11
source_plans: ["plans/pauta-revelavel/pedido-original.md"]
---

# Briefing — Pauta revelável

## Context

O Clave foi pedido como pauta para gravar vídeos de YouTube e apresentar por vídeo. Na época, o pedido foi registrado como um sistema de pauta para lives no estilo das ferramentas de TV (`plans/CLAVE.md`). Foi isso que se construiu e entregou, com o briefing `clave` aprovado, o PRD `.aioson/context/prd-clave.md` gerado e o commit `72a229f`. O dono do produto usou o resultado e concluiu que ele "não é viável e funcional para este tipo de apresentação" (SRC-001, mensagem 1).

O que existe hoje, observado no código:

- **Duas telas separadas.** A Bancada (`src/features/board/`) compõe a pauta e edita o bloco num modal (`BlockDrawer.tsx`). O Palco (`src/features/stage/`) apresenta em tela cheia. Escrever e apresentar nunca acontecem no mesmo lugar.
- **Modelo de transmissão com relógio.** Existem "Entrar no ar" (`src/features/runs/GoLiveButton.tsx`), cronômetro global e do bloco (`StageTimers.tsx`), gravação do trajeto (`server/src/services/runService.ts`) e relatório de previsto × tocado (`src/features/report/`).
- **Estrutura de live.** Blocos têm etiqueta de tipo (tema, mídia, interação, convidado) e duração prevista. Há cartas de resgate fora da sequência (`RescueDeck.tsx`) e um Acervo com contagem de uso e recência (`src/features/library/`).
- **Entrada por formulário.** Bloco, depois pontos (`Beat`), depois anexos com caminho relativo ou URL (`AttachmentFields.tsx`). Não há tratamento de colagem em `src/`: busca por `onPaste`/`clipboardData` sem ocorrência.
- **Tipos de mídia.** `ATTACHMENT_TYPES` em `shared/types.ts` aceita `video`, `image`, `link`, `code`, `chat` e `file`. Não existe áudio.
- **Aparência fixa.** A identidade "Tinta & Ouro" (`.aioson/briefings/clave/identity.md`) está fixa em `src/ui/tokens.css`. O usuário não escolhe cor nem fundo.
- **O que já se aproxima do pedido.** No Palco, os pontos do bloco entram na tela um a um conforme o apresentador avança (`StageBeats.tsx`, `beats.ts`), com atalhos `espaço`/`→` e `←` (`useStageShortcuts.ts`). Mas a revelação só existe dentro do Palco, depois de editar em outra tela, e o estado `done` do ponto significa "já falado", não "visível na tela".
- **Fundação reaproveitável.** Lista de pautas com criar, renomear, duplicar e apagar (`src/features/rundowns/`). Persistência em SQLite com migrações (`server/src/db/`). Pasta local de mídia (`server/src/services/mediaService.ts`). Contrato com o AIOSON Play (`manifest.json` split-stack, `GET /api/aioson-play`). Suítes de teste vitest e playwright.

Por que agora: o produto entregue resolve um problema que o dono não tem (conduzir uma live cronometrada com desvios) e não resolve o que ele tem (mostrar conteúdo aos poucos enquanto grava).

Relação com o `clave`: este briefing propõe substituir a superfície do produto descrito em `.aioson/context/prd-clave.md`, mas não altera aquele briefing nem aquele PRD. Como aposentar ou substituir o `prd-clave.md` é decisão de @product, ao gerar o PRD desta slug.

## Problem

Quando grava um vídeo para o YouTube ou apresenta compartilhando a tela, o apresentador quer que o conteúdo preparado (texto, imagem, vídeo, áudio) apareça **na mesma tela em que foi escrito, só no momento em que ele chega naquele assunto**. Assim quem assiste acompanha o raciocínio passo a passo, e ele não perde o fio nem troca de janela.

Hoje há duas saídas, e as duas falham:

- **Bloco de notas na tela**, como fazem canais citados pelo dono (Canal Subido e outros). O texto aparece na ordem certa, mas não dá para esconder o que já foi escrito e revelar depois. Imagem, vídeo e áudio não ficam na mesma folha. A aparência é a do editor do sistema, sem escolha.
- **O Clave atual.** Ele obriga a compor numa tela e apresentar em outra, preencher formulários em vez de colar, e conviver com relógio, "Entrar no ar" e relatório que não fazem parte desse tipo de vídeo. Também não aceita áudio.

Em formato de trabalho: *quando estou gravando ou transmitindo e mostrando minha tela, quero colar meu roteiro e minhas mídias numa folha vertical e revelar cada parte com um atalho ou um clique, para que o público veja o conteúdo surgir no ritmo da minha fala sem eu sair daquela tela.*

**Quem vê a tela (decisão F2, rodada 1):** o app fica na tela capturada pelo OBS ou pelo compartilhamento, e o público vê cada bloco aparecer quando o apresentador o revela. Por isso, nada oculto pode aparecer na captura.

## Proposed solution

Decidido na rodada 1 de refinamento (o dono aceitou as recomendações em 2026-11-11): **o Clave atual é substituído por uma pauta que é uma única coluna vertical, ao mesmo tempo onde se escreve e o que a captura de tela mostra ao público** (F1, F2). Cada coisa colada ou digitada é um bloco, e o apresentador revela ou oculta blocos por atalho ou clique, de cima para baixo, como uma linha do tempo.

Forma decidida, por partes:

1. **Coluna única.** A pauta é uma folha vertical de blocos. Não há modo edição, modo apresentação ou tela de palco separada (PROM-005, PROM-009).
2. **Entrada por colagem.** Ctrl+V dentro da coluna cria o bloco no ponto de inserção. Texto vira bloco de texto. Imagem da área de transferência (captura de tela) e arquivos de imagem, vídeo ou áudio viram blocos de mídia gravados na pasta local. Digitar direto também cria texto (PROM-003, PROM-004).
   - Arrastar e soltar arquivos na coluna é caminho equivalente obrigatório, para cobrir o risco R2 (S3).
   - Texto longo colado é dividido em blocos a cada linha em branco, na ordem (S2).
   - URL colada vira texto, como qualquer outra colagem (F12).
   - Formatação de texto (rodada 2, revê F11): cada bloco de texto tem um de 4 tamanhos prontos, P, M, G e Título, calibrados para pousar nas linhas da pauta (F17). Na rodada 4, o Título passou a nascer em 52px, e os botões A− e A+ ajustam o bloco em passos de 4px dentro da faixa do tamanho: P de 18 a 26, M de 26 a 34, G de 34 a 42 e Título de 44 a 72px (F21; PROM-017). Cor e negrito valem para o trecho selecionado, por uma barrinha que aparece ao selecionar e por Ctrl+B (F15). As cores são 6 da paleta do tema: texto, destaque, vermelho, verde, cobre e lilás, com valores próprios em cada tema (F16). Texto colado de fora entra sem a formatação de origem (PROM-013, PROM-014, PROM-015).
3. **Visibilidade por bloco.** O bloco inteiro é a unidade que aparece de uma vez (F4). Todo bloco recém-criado nasce oculto; o apresentador marca como visível o que deve abrir a pauta, como um título (F5). Cada bloco tem um controle de clique que alterna oculto e visível. PageDown revela o próximo oculto na ordem vertical e PageUp oculta o último revelado; as duas teclas funcionam com o cursor dentro de um texto e com passador de slides (F13; PROM-006, PROM-007, PROM-008).
4. **Bloco oculto some de vez da tela.** Ele não ocupa espaço nem é pintado. Uma visão de preparo mostra os ocultos esmaecidos para escrever e editar, com aviso visível enquanto estiver ligada, e o apresentador a desliga antes de gravar (F3).
5. **Planejado separado do progresso.** Cada bloco guarda como deve começar (oculto ou visível). Revelar só avança o progresso da tomada, que sobrevive se o app fechar no meio. Um comando de nova tomada volta tudo ao planejado (F6).
6. **Mídia na coluna.** Vídeo e áudio aparecem parados ao serem revelados e tocam dentro do bloco quando o apresentador manda, por clique ou atalho (F7; PROM-003).
7. **Rolagem automática.** Revelar rola a coluna até o bloco novo ficar inteiro na vista, sem animação quando o sistema pede movimento reduzido (S1).
8. **Reordenar.** Blocos se movem por arraste e por Alt+↑/↓, reaproveitando o `@dnd-kit` que o app já usa (S4).
9. **Aparência escolhida.** Temas prontos do design system validados para vídeo, cor de destaque livre e plano de fundo em cor, gradiente ou imagem (F8; PROM-011). As 6 cores de texto acompanham o tema (F16). A escolha vale para o app inteiro (F9). O tema padrão parte da identidade "Tinta & Ouro" (F14).
10. **Sem relógio nem estrutura de live.** Saem cronômetros, "Entrar no ar", trajeto, relatório, tipos de bloco, cartas de resgate e Acervo (F1; PROM-002).
12. **Sub-itens com Tab (rodada 3).** Tab recua o bloco inteiro, de qualquer tipo, para virar sub-item do bloco de cima; Shift+Tab volta um nível. São no máximo 2 níveis abaixo do tópico, numa lista plana em que o pai é o bloco anterior mais próximo com nível menor, como no Clave antigo (F18; PROM-016).
   - Revelar: PageDown mostra um bloco por vez, atravessando os níveis. Shift+PageDown revela o próximo tópico já com todos os sub-itens, e PageUp desfaz esse grupo de uma vez. Ocultar o pai oculta os filhos (F19).
   - Marcador: o nível 1 mostra •, o nível 2 mostra ◦, na cor de destaque do tema; o tópico fica sem marcador. Uma linha-guia fina liga o tópico aos sub-itens (F20, S8).
   - Edição: mover ou arrastar o tópico leva os sub-itens junto. Apagar um tópico sobe os sub-itens um nível. Enter duas vezes no fim cria o próximo bloco no mesmo nível. Ao recuar, um bloco de texto desce um tamanho, e ao voltar sobe (S8).
   - Colar uma lista com marcadores ("- item", "1.") ou recuo (tab, espaços) cria a hierarquia sozinha (S8; PROM-004).
   - No preparo, uma seta recolhe os sub-itens de um tópico para organizar pautas longas, sem mudar o que a gravação mostra (S8).
11. **Fundação mantida.** Lista de pautas, SQLite, pasta de mídia e contrato com o Play continuam. As pautas já gravadas migram para a nova coluna (F10).

Adiados nesta rodada (sem recomendação; o dono pode trazê-los de volta ao @product): desfazer com Ctrl+Z (S5), modo limpo para captura (S6), destaque do bloco atual (S7), ajuste global de tamanho da pauta inteira (alternativa de F17), cor de texto livre (alternativa de F16), revelação linha a linha e efeito de digitação (alternativas de F4). Detalhes em `expansion-scout.md`.

**Alternatives considered** (o dono fixou a direção, então isto é registro, não leque):

- **Manter Bancada e Palco e só acrescentar colagem.** Não atende "sem ter opção de tela de edição e tela de visualização".
- **Deck de slides.** Troca a folha contínua por páginas, e o pedido é explicitamente vertical e de linha do tempo.
- **Teleprompter só para o apresentador.** Descartado em F2: o público vê a tela.
- **Bloco de notas sem ocultar.** É o problema atual, não a solução.

## Themes

1. **Superfície única vertical.** A mesma folha serve para escrever e para ser capturada, sem modal de edição nem tela de palco (PROM-005, PROM-009).
2. **Entrada por colagem e formatação.** Tamanho por bloco, cor e negrito por trecho (PROM-013, PROM-014, PROM-015). Ctrl+V de texto, imagem, vídeo e áudio. Gravação da mídia na pasta local. Formatos aceitos e falhas (PROM-003, PROM-004).
3. **Revelar e ocultar.** Estado por bloco, clique, atalhos, ordem da linha do tempo, visão de preparo e tomada nova (PROM-006, PROM-007, PROM-008).
4. **Aparência.** Temas do design system, cor de destaque, plano de fundo e legibilidade sob compressão de vídeo (PROM-011).
5. **Destino do app atual.** O que sai (relógio, execução, relatório, tipos de bloco, resgate, Acervo), o que fica (lista de pautas, persistência, mídia, Play) e o que acontece com as pautas já gravadas (PROM-002, PROM-012).
6. **Reprodução de mídia na coluna.** Vídeo e áudio tocando dentro do bloco revelado, sob o comando do apresentador (PROM-003).
7. **Sub-itens.** Tab e Shift+Tab, revelação um por vez ou por tópico, marcador por nível, linha-guia, colar lista e recolher no preparo (PROM-016).

## Risks

- **R1 — Atalho de revelar colide com digitação.** Na mesma superfície onde se digita, `espaço` ou as setas não podem revelar enquanto o cursor está num texto. Decidido em F13: PageDown revela e PageUp oculta. Resta verificar que essas teclas funcionam dentro de um texto focado e que não rolam a página no webview do Play. [testable]
- **R2 — Colagem de arquivos no webview do Play.** Imagem da área de transferência (captura de tela) chega à página com segurança em navegadores Chromium. Arquivo de vídeo ou áudio copiado do Explorer depende do motor do webview que o Play usa. Se não chegar, a promessa "Ctrl+V cola vídeo e áudio" falha no dia a dia. Mitigação decidida em S3: arrastar e soltar arquivos é caminho equivalente obrigatório. [testable]
- **R3 — Conteúdo oculto aparecendo na captura.** É a pior falha possível do produto, porque estraga a tomada gravada. Precisa ser invariante: com o preparo desligado, nenhuma parte de um bloco oculto é pintada, nem em transição, dica de ferramenta, miniatura, sublinhado de corretor ortográfico ou foco de teclado. [testable]
- **R4 — Mídia grande.** Um vídeo colado pode ter centenas de megabytes. A gravação na pasta local precisa de limite, progresso e falha explícita no bloco, sem travar a coluna. [testable]
- **R5 — Perda do que já foi construído.** Substituir o app (F1) descarta superfícies cobertas por 159 testes vitest e 69 playwright (commit `72a229f`). As pautas já gravadas no banco local migram para a nova coluna (F10): título do bloco e cada ponto viram blocos de texto, imagens e vídeos anexados viram blocos de mídia. A migração precisa de backup seguro antes de escrever, seguindo o aprendizado `gotchas/backup-de-migracao-em-wal-copia-um-banco-vazio.md`.
- **R6 — Tema livre ilegível no vídeo.** Cor de destaque livre e imagem de fundo (F8) podem dar contraste baixo e virar borrão na compressão do YouTube. O briefing `clave` já tratava legibilidade sob compressão como requisito. Mitigação: temas predefinidos validados e aviso de contraste. [testable]
- **R7 — Reprodução de mídia no webview.** Com F7, a mídia só toca por comando do apresentador, que conta como gesto do usuário. Ainda é preciso verificar som e vídeo no webview do Play. [testable]
- **R8 — Editor rico demais.** Um editor de blocos no estilo Notion multiplica o custo. A rodada 2 (F15) trouxe formatação inline, mas limitada a negrito e 6 cores por trecho e 4 tamanhos por bloco; listas, títulos internos, links e fontes livres continuam fora. Texto colado de fora perde a formatação de origem, para o editor não herdar HTML de terceiros. [testable]
- **R9 — Referência não verificada.** O comportamento do Canal Subido foi descrito pelo dono e não foi observado. A busca de 2026-11-11 não encontrou o canal. [research-able]
- **R10 — Tab dentro do editor.** Tab recuando o bloco tira do teclado o jeito padrão de navegar entre controles. Esc sai do texto e devolve o Tab à navegação; sem esse caminho, a tela fica inacessível por teclado. [testable]
- **R11 — Árvore inválida.** Mover, apagar ou colar pode deixar um bloco dois níveis abaixo do anterior. Toda mudança precisa normalizar os níveis (primeiro bloco no nível 0, nenhum salto de mais de um nível), como o servidor do Clave antigo já recusava. [testable]

## Identified gaps

| # | Estado atual (evidência) | Estado desejado | Delta |
|---|---|---|---|
| G1 | Conteúdo entra por formulário em modal; nenhuma colagem em `src/` | Ctrl+V, arrastar e soltar, e digitação direta na coluna | Novo tratamento de colagem e de soltura de arquivo, e criação de bloco no lugar |
| G2 | Sem tipo áudio em `ATTACHMENT_TYPES` | Áudio tocável dentro do bloco | Novo tipo de mídia, gravação e reprodução |
| G3 | Bancada e Palco em rotas e telas separadas | Uma coluna única (F1) | A superfície principal é substituída |
| G4 | Revelação existe só no Palco, por ponto, com `done` = "já falado" | Visibilidade planejada por bloco e progresso da tomada separados (F5, F6), alternáveis por clique e PageDown/PageUp (F13) | Dois estados novos no modelo e na tela |
| G5 | Identidade "Tinta & Ouro" fixa em `src/ui/tokens.css` | Tema, cor de destaque e fundo escolhidos pelo apresentador, valendo para o app inteiro (F8, F9) | Tokens parametrizados e preferência persistida |
| G6 | Cronômetros, execução, trajeto e relatório | Nenhum relógio | Remoção de superfícies e rotas |
| G7 | Tipos de bloco, resgate e Acervo | Sem equivalentes (F1) | Remoção |
| G8 | Pautas existentes com blocos, pontos e anexos em SQLite | Migradas para a nova coluna (F10) | Migração com backup seguro antes de escrever |
| G9 | Nenhum protótipo da nova superfície; `identity.md` do `clave` define paleta, mas sua regra "cor codifica tipo de bloco" deixa de ter objeto | Autoridade visual da coluna revelável resolvida | @refiner conduz um protótipo próprio de `pauta-revelavel` e consolida a identidade a partir de "Tinta & Ouro" (F14) |
| G10 | Falhas de mídia aparecem só como riscos (R2, R4) | Cada falha aparece no bloco afetado, com mensagem específica e ação de tentar de novo ou remover, sem travar a coluna nem os atalhos. Mídia ausente no disco aparece como "arquivo não encontrado" também durante a apresentação (G1 da revisão) | Estados de erro por bloco |
| G11 | Nenhum momento de salvar definido para uma superfície sem tela de edição | Salvamento automático a cada mudança, sem botão salvar, com aviso discreto de falha e nova tentativa automática; nenhum dado do produto em `localStorage` (G2 da revisão) | Persistência contínua |
| G12 | O texto do bloco é um campo simples, sem tamanho, cor nem negrito | Tamanho por bloco (4 prontos), cor (6 do tema) e negrito por trecho (F15, F16, F17) | Editor com formatação inline restrita e persistência dessa formatação |
| G13 | A coluna é uma lista sem níveis | Sub-itens em até 3 níveis com Tab e Shift+Tab, marcador, linha-guia e regras de revelar e mover por subárvore (F18, F19, F20, S8) | Campo de nível no bloco, normalização da árvore e revelação por grupo |

## Sources

Fontes consultadas nesta sessão:

- SRC-001, o pedido literal do dono (abaixo).
- Evidência do sistema atual (não são fontes de promessa): `plans/CLAVE.md`, `.aioson/context/prd-clave.md`, `.aioson/briefings/clave/identity.md`, `shared/types.ts`, a árvore `src/` e `server/src/`, e o commit `72a229f`.
- Aprendizado do projeto: `.aioson/learnings/gotchas/backup-de-migracao-em-wal-copia-um-banco-vazio.md`.
- Pesquisa web: uma busca em 2026-11-11 por "Canal Subido" YouTube bloco de notas apresentação. Nenhum resultado sobre o canal, e nada persistido em `researchs/`.

### Source Inventory

| Source | Path | Type | Role | Fingerprint | Usage | Purpose |
|---|---|---|---|---|---|---|
| SRC-004 | plans/pauta-revelavel/pedido-ajuste-titulo.md | documentation | intent | sha256:2631670de89f1853b4a6285405cbc1ee3c854b0e1e7017baf78be37c3a266ad1 | consulted | Pedido de ajuste do tamanho do Título feito antes da aprovação, com a resposta do dono |
| SRC-003 | plans/pauta-revelavel/pedido-subitens.md | documentation | intent | sha256:4695c6e28cdc556ae9156775975dbcd7d4091d03f25d84caf23def78425ac412 | consulted | Pedido de sub-itens com Tab feito depois do protótipo da rodada 2, com as quatro respostas do dono |
| SRC-002 | plans/pauta-revelavel/pedido-formatacao.md | documentation | intent | sha256:caa7815775c6ca7c3ac8b31fe77836dfc5e6b86255b937672bfbaeb1ba10bcb9 | consulted | Pedido de formatação de texto feito depois do protótipo, com as três respostas do dono |
| SRC-001 | plans/pauta-revelavel/pedido-original.md | documentation | intent | sha256:d9e40479f1d0c5717d4b881f10b597d0d9440de5e307f70aa3ba7680fe454d55 | consulted | Transcrição literal do pedido do dono e da confirmação do nome |

### Source Promise Map

| PROM | Source | Locator | Approved intent | State |
|---|---|---|---|---|
| PROM-001 | SRC-001 | Mensagem 1, "uma especie de pauta para criar videos para o youtube ou qualquer tipo de apresentação por video" | O app é uma pauta para gravar vídeos e apresentações por vídeo, não um sistema de live | required |
| PROM-002 | SRC-001 | Mensagem 1, "criou com se o app iria transmitir e tem até tempo e tudo mais só que a ideia é até mais simples" | Sem modelo de transmissão e sem tempo: o app não cronometra nem "entra no ar" | required |
| PROM-003 | SRC-001 | Mensagem 1, "cadastrar os conteúdos tanto texto audio, video ou imagem" | O conteúdo pode ser texto, áudio, vídeo ou imagem | required |
| PROM-004 | SRC-001 | Mensagem 1, "dando ctrl + v colar dentro da área" | O conteúdo entra colando com Ctrl+V dentro da área | required |
| PROM-005 | SRC-001 | Mensagem 1, "organizado verticalmente" | A pauta é organizada verticalmente | required |
| PROM-006 | SRC-001 | Mensagem 1, "os textos podem ficar em modo hide [...] apertando alguma tecla de atalho e ir aparecendo" | Conteúdo pode ficar oculto e ir aparecendo por tecla de atalho | required |
| PROM-007 | SRC-001 | Mensagem 1, "opção clique ou atalho do teclado para esconder" | Ocultar e revelar também por clique, além do atalho | required |
| PROM-008 | SRC-001 | Mensagem 1, "com se fosse uma timeline mesmo" | A revelação segue a ordem vertical como uma linha do tempo | required |
| PROM-009 | SRC-001 | Mensagem 1, "sem ter opção de tela de edição e tela de visualização" | Uma superfície só, sem telas separadas de edição e de visualização | required |
| PROM-010 | SRC-001 | Mensagem 1, "canal do youtube chamado Canal Subido e muito outros canais que fazem apresentação e usam bloco de notas" | O app substitui o bloco de notas usado na tela por esses apresentadores | required |
| PROM-011 | SRC-001 | Mensagem 1, "escolher cores do app e plano de fundo de seu design system" | O apresentador escolhe cores e plano de fundo a partir do design system | required |
| PROM-013 | SRC-002 | Mensagem 3, "opções de tamanhos de fontes" | O texto tem opções de tamanho | required |
| PROM-014 | SRC-002 | Mensagem 3, "colocar cores nelas" | O texto pode receber cores | required |
| PROM-015 | SRC-002 | Mensagem 3, "deixar em negrito ou normal" | O texto pode ficar em negrito ou normal | required |
| PROM-016 | SRC-003 | Mensagem 4, "clicar na tecla tab e poder criar sub-item" | Tab cria sub-item | required |
| PROM-017 | SRC-004 | Mensagem 5, "opção de aumentar ou mininuir o tamanho para não ficar tão exagerado" | O tamanho do texto pode ser aumentado ou diminuído para o Título não ficar exagerado | required |
| PROM-012 | SRC-001 | Mensagem 1, "o que foi criado hoje não é viavel e funcional para este tipo de apresentação" | O app atual precisa mudar para servir a este tipo de apresentação; quanto dele permanece é a pergunta 1 | required |

## Open questions

Perguntas resolvidas na rodada 1 de refinamento (o dono aceitou as recomendações em 2026-11-11). A numeração original foi mantida para rastreio.

1. **[decision-required] Destino do app atual.** Resolvida (F1): substituir pela coluna revelável. Ficam lista de pautas, persistência, mídia e contrato Play.
2. **[decision-required] Quem vê a tela.** Resolvida (F2): a tela é capturada e o público vê o que é revelado.
3. **[decision-required] Como um bloco oculto aparece na tela.** Resolvida (F3): some de vez, com visão de preparo esmaecida e aviso enquanto ligada.
4. **[decision-required] Unidade de revelação.** Resolvida (F4): o bloco inteiro.
5. **[decision-required] Estado de um bloco recém-criado.** Resolvida (F5): nasce oculto.
6. **[testable] Teclas de revelar e ocultar.** Decidida (F13): PageDown revela e PageUp oculta. Segue testável no webview do Play (R1).
7. **[decision-required] Vídeo e áudio ao serem revelados.** Resolvida (F7): aparecem parados e tocam no comando.
8. **[decision-required] Alcance da aparência.** Resolvida (F8, F9): temas prontos, cor de destaque livre e fundo em cor, gradiente ou imagem, valendo para o app inteiro. Tamanho de texto ajustável ficou de fora.
9. **[decision-required] Pautas já gravadas.** Resolvida (F10): migrar para a nova coluna, com backup seguro antes.
10. **[testable] Colagem de vídeo e áudio copiados do Explorer** dentro do webview real do Play (R2). Arrastar e soltar é o caminho equivalente obrigatório (S3).
11. **[testable] Legibilidade de cada tema** em vídeo comprimido do YouTube a 720p (R6).
12. **[research-able] Referência do Canal Subido.** Um link de vídeo para fixar o comportamento observado (R9).
13. **[decision-required] Formatação de texto.** Revista na rodada 2 (F15, F16, F17), a pedido do dono depois do protótipo: tamanho por bloco com 4 prontos; cor (6 do tema) e negrito por trecho. Na rodada 4 (F21), Título em 52px e ajuste A−/A+ de 4px por bloco.
14. **[decision-required] URL colada.** Resolvida (F12): vira texto.
15. **[decision-required] Vocabulário.** Resolvida (A1): ficam "Pauta" (palavra do dono) e "bloco" para cada coisa colada, agora sem tipo nem duração. "Revelar" e "ocultar" nomeiam os dois estados, e "apresentação" passa a ser permitida no texto da interface. @product registra o novo vocabulário.
16. **[decision-required] Estado planejado × progresso da apresentação.** Resolvida (F6): os dois estados ficam separados, com comando de nova tomada que volta ao planejado. O progresso persiste se o app fechar no meio.
18. **[decision-required] Sub-itens.** Resolvida na rodada 3 (F18, F19, F20, S8): bloco inteiro recua com Tab até 2 níveis; um por vez com Shift+PgDn para o tópico; marcador por nível; colar lista, recolher no preparo, tamanho menor e linha-guia.
17. **[out-of-scope] Ficam de fora:** gravar ou transmitir pelo próprio app, cronômetros, relatório e segunda tela só do apresentador, por pedido explícito (PROM-002, PROM-009). Também ficam fora desta rodada, adiados sem recomendação: desfazer (S5), modo limpo (S6), destaque do bloco atual (S7).

## Additional files

- `.aioson/briefings/pauta-revelavel/expansion-scout.md` — mapa de possibilidades, mapa de experiência e superfície operacional. É exploratório e nada nele é escopo aprovado.
