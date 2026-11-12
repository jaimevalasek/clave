# Expansion Scout - Pauta revelável

> Exploratório. Nada aqui é escopo aprovado; @refiner testa o valor de cada candidato e @product decide.

## Why Scout
- Trigger: superfície experiencial rica (editor e palco ao mesmo tempo, mídia colada, revelação progressiva sob captura de vídeo) descrita num pedido curto; preferência registrada do dono de que Briefing e Refiner pensem horizontalmente além do prompt (memória `briefing-e-refiner-devem-descobrir`).
- Prior expansion artifacts found: nenhum para `pauta-revelavel`. O briefing `clave` (aprovado, com PRD) não tem `expansion-scout.md`; seu PRD serve só como evidência do sistema atual.

## Possibility Map

| Candidate | User moment and mechanism | Before → after value | Evidence or hypothesis | Cost / downside | Bucket / disposition | Observable check |
|---|---|---|---|---|---|---|
| Visão de preparo | Antes de gravar, o apresentador liga um modo que mostra os blocos ocultos esmaecidos para escrever, colar e reordenar; desliga antes de capturar | Antes: ou vê tudo, ou não consegue editar o que está oculto. Depois: uma tela só, com um interruptor | Inferência direta de PROM-006 + PROM-009: sem isso não há como preparar conteúdo oculto | Baixo; risco de esquecer ligado durante a gravação (ver "indicador de preparo") | Core se a pergunta 3 fechar em "invisível"; aguarda decisão | Com o preparo desligado, nenhum pixel de bloco oculto aparece numa captura de tela |
| Indicador de preparo fora da área capturável | Enquanto o preparo está ligado, uma marca visível avisa que a tela não está pronta para gravar | Evita gravar uma tomada inteira com o roteiro à mostra | Hipótese | Baixo | Recommended MVP | Ligar o preparo mostra o aviso; desligar some com ele |
| Rolagem automática até o bloco revelado | Ao revelar, a coluna rola suavemente até o novo bloco ficar na vista | Antes: o apresentador rola com o mouse no meio da fala. Depois: as mãos ficam no atalho | Inferência de PROM-005 + PROM-008: pauta longa passa da altura da tela | Baixo; respeitar `prefers-reduced-motion` | Recommended MVP | Revelar o 15º bloco de uma pauta longa o deixa inteiro na vista |
| Ocultar tudo de novo (nova tomada) | Depois de errar, um comando devolve a pauta ao estado inicial de ocultos para regravar | Antes: re-ocultar bloco a bloco. Depois: um comando | Hipótese; regravar é rotina em vídeo para YouTube | Baixo; precisa de confirmação ou desfazer | Recommended MVP | Após "ocultar tudo", revelar próximo volta ao primeiro bloco |
| Colar texto longo e dividir em blocos | Colar o roteiro inteiro de outro lugar e ele virar uma sequência de blocos, separados por linha em branco | Antes: colar parágrafo por parágrafo. Depois: um Ctrl+V monta a linha do tempo | Hipótese ligada a PROM-004 | Médio: regra de divisão precisa ser previsível e reversível | Recommended MVP, regra exata a decidir | Colar 3 parágrafos separados por linha em branco gera 3 blocos na ordem |
| Arrastar e soltar arquivos como alternativa ao colar | Arrastar vídeo ou áudio do Explorer para a coluna | Cobre o caso em que o webview não entrega arquivo colado (ver risco de colagem) | Inferência; mitigação do risco R2 do briefing | Baixo | Recommended MVP | Soltar um `.mp3` cria um bloco de áudio tocável |
| Reordenar por arraste e por teclado | Mover um bloco para cima ou para baixo, porque a ordem vertical é a ordem de revelação | Sem isso, errar a ordem obriga a apagar e colar de novo | Inferência de PROM-005 + PROM-008; o app atual já usa `@dnd-kit` | Baixo, com reaproveitamento | Recommended MVP | Mover o bloco 4 para a posição 2 muda a ordem em que "revelar próximo" anda |
| Desfazer | Ctrl+Z para colagem, exclusão, reordenação e ocultação | Confiança para editar ao vivo sem medo | Hipótese | Médio | Recommended MVP | Apagar um bloco e desfazer o restaura com a mídia |
| Destaque do bloco atual | O último bloco revelado ganha ênfase e os anteriores esmaecem um pouco | Guia o olho de quem assiste para o que está sendo dito agora | Hipótese; o app atual já tem a ideia de ponto atual no Palco | Baixo; pode cansar visualmente, então deveria ser opcional | Optional V1 | Em captura, o bloco mais recente é o de maior contraste |
| Passador de slides e controle remoto | Mapear PageDown e PageUp (o que os passadores enviam) para revelar e ocultar | Apresentar em pé, longe do teclado | Hipótese; passadores comuns emitem PageDown e PageUp | Muito baixo | Optional V1 | Um passador USB revela e oculta blocos |
| Escala de fonte rápida | Aumentar ou diminuir o tamanho do texto da pauta inteira com um atalho | Ajustar a legibilidade para a resolução do vídeo sem abrir configurações | Inferência ligada à legibilidade sob compressão (aprendizado do `clave`) | Baixo | Optional V1 | Ctrl+= aumenta todo o texto de forma proporcional |
| Modo limpo para captura | Esconder barras e controles do app, deixando só a coluna e o fundo | O que o OBS captura é só conteúdo | Hipótese; não é segunda tela, é o mesmo documento sem moldura | Baixo | Recommended MVP, a confirmar contra PROM-009 | Em modo limpo, nenhum controle do app aparece na captura |
| Revelar texto linha a linha ou com efeito de digitação | Um bloco de texto aparece aos poucos, imitando quem digita no bloco de notas ao vivo | Reproduz a estética que inspirou o pedido | Hipótese; a referência (Canal Subido) não foi verificada | Médio; pode virar firula | Delight, depende da pergunta 4 | Revelar um texto de 3 linhas pode exigir 3 acionamentos |
| Bloco de código com destaque de sintaxe | Colar código e ele aparecer formatado | Útil para canais de programação | Hipótese; o app atual já tem anexo `code` | Médio | Optional V1 | Código colado mantém indentação e fonte mono |
| URL colada vira bloco de link ou embed | Colar link do YouTube e virar vídeo incorporado | Menos passos para mostrar referência | Hipótese | Médio; embed depende de rede e de política do YouTube | V2 / Later, pergunta aberta | — |

## Experience Map

| User moment / goal | Action or choice | System response / feedback | Success, failure and recovery | Evidence or hypothesis | Bucket / decision | Observable check |
|---|---|---|---|---|---|---|
| Primeira abertura | Abre o app pelo Play | Cai na última pauta ou num estado vazio com "cole ou digite aqui" | Sem pauta: o vazio convida a colar, sem formulário | Inferência; o app atual reabre a última pauta usada | Core | Pauta vazia mostra uma área que aceita Ctrl+V imediatamente |
| Montar o roteiro | Digita, cola texto, imagem, vídeo ou áudio | Cada colagem vira um bloco na coluna, na posição do cursor | Formato não suportado ou falha ao gravar a mídia: aviso no próprio bloco, com tentar de novo | PROM-003, PROM-004 | Core | Colar uma captura de tela cria um bloco de imagem persistido |
| Decidir o que esconder | Clica no controle de visibilidade ou usa o atalho no bloco focado | O bloco passa a oculto e muda de aparência só na visão de preparo | Ocultou o errado: clica de novo ou desfaz | PROM-006, PROM-007 | Core | O mesmo controle alterna oculto e visível |
| Entrar em gravação | Desliga o preparo (e liga o modo limpo, se existir) | Ocultos somem da tela | Esqueceu o preparo ligado: o indicador avisa | Pergunta 3 | Core | Captura sem nenhum oculto visível |
| Apresentar | Aperta o atalho de revelar próximo | O próximo oculto, de cima para baixo, aparece e a coluna rola até ele | Revelou cedo: o atalho de ocultar último volta um passo | PROM-006, PROM-008 | Core | Sequência de 5 acionamentos revela 5 blocos na ordem |
| Tocar mídia | Revela um bloco de vídeo ou áudio e manda tocar | Toca dentro da coluna | Arquivo sumiu da pasta: o bloco mostra que a mídia está ausente | PROM-003; pergunta 7 | Core | Vídeo toca no próprio bloco sem abrir outra janela |
| Regravar | Comando de ocultar tudo | A pauta volta ao início | Fez sem querer: desfazer | Hipótese | Recommended MVP | — |
| Ajustar a cara | Escolhe tema, cor e fundo | A coluna muda na hora, sem recarregar | Contraste ruim: aviso ou tema seguro | PROM-011 | Core (escopo exato a decidir) | Trocar o tema persiste após reiniciar o app |
| Voltar outro dia | Abre a lista de pautas | Duplica uma pauta como modelo | — | Lista atual já duplica | Core (reaproveitado) | Pauta duplicada volta com todos os blocos ocultos |

## Operational Surface Map

| Object | Parent / owner | Lifecycle states | Required actions | Management surface | Empty / error states | Bucket |
|---|---|---|---|---|---|---|
| Pauta | apresentador (uso local, sem login) | ativa | criar, abrir, renomear, duplicar, apagar | lista de pautas existente (`src/features/rundowns/`) | nenhuma pauta; falha ao gravar | Core (reaproveitado) |
| Bloco | pauta | visível, oculto | criar por colar, digitar ou soltar; editar no lugar; reordenar; apagar; alternar visibilidade | a própria coluna, sem modal | pauta vazia; mídia falhou ao gravar; formato não suportado | Core |
| Mídia do bloco | bloco | gravada, ausente | gravar na pasta de mídia ao colar; remover junto com o bloco | implícita no bloco | arquivo ausente no disco; arquivo grande demais | Core |
| Tema | aplicativo ou pauta (a decidir) | padrão, personalizado | escolher predefinido; ajustar cor e fundo; voltar ao padrão | painel de aparência | imagem de fundo ausente; contraste insuficiente | Core (escopo a decidir) |

## Missing Management Surfaces
- Estado oculto ou visível não tem hoje nenhum lugar no modelo: o `Beat` tem `done`, que é "já falado", não "visível na tela".
- Não existe tipo áudio em `ATTACHMENT_TYPES` (`shared/types.ts`).
- Não existe tratamento de colagem em `src/` (`onPaste`/`clipboardData` sem ocorrência).
- Não existe escolha de tema: a identidade `Tinta & Ouro` está fixa em `src/ui/tokens.css`.

## Likely MVP Shape
- Core: lista de pautas reaproveitada; coluna única com blocos de texto, imagem, vídeo e áudio; colar com Ctrl+V; visibilidade por bloco com clique e atalho; revelar próximo e ocultar último; visão de preparo (se confirmada); temas com cor e fundo; persistência local.
- Recommended MVP: rolagem automática, ocultar tudo para nova tomada, arrastar e soltar arquivos, reordenar, desfazer, dividir texto colado em blocos, modo limpo, indicador de preparo.
- Not enough evidence yet: revelar linha a linha, efeito de digitação, embed de links, formatação de texto além do básico.

## Discussion Questions
- [decision-required] Substituir o app atual inteiro ou manter os modos atuais ao lado?
- [decision-required] Como um bloco oculto aparece na tela capturada?
- [decision-required] A unidade de revelação é o bloco inteiro ou a linha?
- [testable] O webview do Play entrega arquivos de vídeo e áudio colados do Explorer?
- [research-able] Um vídeo do Canal Subido para fixar o comportamento de referência.

## Do Not Pull Into MVP Yet
- Cronômetros, "Entrar no ar", trajeto e relatório: excluídos pelo pedido.
- Tipos de bloco por cor, cartas de resgate e Acervo: pertencem ao modelo de live do `clave`.
- Segunda tela ou visão só do apresentador: contradiz "sem tela de edição e tela de visualização", salvo se a pergunta 2 fechar em "só o apresentador vê".
- Gravação ou transmissão pelo próprio app: o OBS ou o compartilhamento de tela continuam fazendo isso.
- Copiloto de IA.

## Recommendation
Proceed to product definition? only after questions. As perguntas 1 (destino do app atual), 2 (quem vê a tela) e 3 (aparência do bloco oculto) mudam o modelo de dados e a superfície inteira. Com elas fechadas, a classificação provável continua MICRO ou SMALL, e o maior risco de entrega deixa de ser escopo e passa a ser a colagem de mídia no webview real do Play.
