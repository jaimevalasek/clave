# Scope Expansion - pauta-revelavel

## Inputs and decision boundary
- Approved outcome, sources, prototype, and exclusions: briefing `pauta-revelavel` aprovado em 2026-11-11 (4 rodadas, 17 promessas, SRC-001 a SRC-004); protótipo próprio congelado em `.aioson/briefings/pauta-revelavel/prototype.html`; exclusões explícitas em PROM-002 e PROM-009 (sem relógio, sem telas separadas).
- Prior expansion evidence: `.aioson/briefings/pauta-revelavel/expansion-scout.md` (candidatos já julgados nas rodadas 1 e 3).
- Existing authorization: rodada 1 "Pode aplicar as recomendações e prosseguir"; rodadas 2 a 4 com escolhas explícitas do dono por pergunta estruturada.

## Product Options
| Option / changed user moment | Value and evidence or hypothesis | Cost / downside | Bucket | Disposition / authorization | Cheap validation |
|---|---|---|---|---|---|
| Coluna única revelável no lugar de Bancada + Palco | Pedido literal (PROM-009); protótipo aprovado | Aposenta superfícies entregues | Core | Aceita (F1, rodada 1) | Gravar um vídeo real só com a pauta |
| Manter o app atual e somar a coluna ao lado | Nada se perde | Dois modelos de pauta, o dobro de manutenção | Cut | Recusada (F1) | - |
| Rolagem automática, nova tomada, dividir texto colado, arrastar arquivos, reordenar | Fecham lacunas do fluxo de gravação (scout) | Baixo | Recommended MVP | Aceitas (S1 a S4, F6) | Passeio do protótipo |
| Formatação: tamanho por bloco, cor e negrito por trecho, ajuste A−/A+ | Pedido do dono depois de usar o protótipo | Editor com marcas fechadas | Core | Aceita (F15 a F17, F21) | Passeio do protótipo |
| Sub-itens com Tab, revelar tópico, colar lista, recolher, tamanho menor, linha-guia | Pedido do dono; reaproveita os pontos aninhados do Clave antigo | Normalização de árvore | Core + Optional V1 | Aceitas (F18 a F20, S8) | Passeio do protótipo |
| Desfazer geral, modo limpo, destaque do bloco atual | Úteis, sem promessa | Médio | Optional V1 | Adiadas sem recomendação (S5 a S7) | - |
| Revelação linha a linha, efeito de digitação, escala global, cor livre, embed de link | Variantes de baixo sinal | Médio | V2 / Later | Adiadas (alternativas de F4, F16, F17, F12) | - |

## Recommended Product Shape
- Selected shape and why it beats the baseline: uma folha pautada que é editor e cenário ao mesmo tempo, com revelação por bloco e por tópico. Substitui o bloco de notas usado na tela (PROM-010) sem o relógio e as duas telas do Clave atual.
- Approved inclusions and PRD destinations: todas as decisões aceitas das rodadas 1 a 4 entram em `prd-pauta-revelavel.md` como CAP/AC.
- Deferred / cut alternatives and reasons: listadas em `## Fora de escopo` do PRD.
- Material decisions remaining: encerrar a feature `clave` como superada (decisão do dono, não bloqueia este PRD).

## Operational Surface Map
| Object | Parent / owner | Lifecycle | Required actions or not applicable | Management entry or not applicable | Empty / error / permissions | PRD destination |
|---|---|---|---|---|---|---|
| Pauta | apresentador (local, sem login) | ativa | criar, abrir, renomear, duplicar, apagar, fixar | lista de pautas e título na régua | lista vazia; nome vazio; falha ao salvar; permissões não aplicáveis (single-user) | CAP-pauta-revelavel-pautas |
| Bloco | pauta | planejado oculto/visível; progresso da tomada | criar (digitar, colar, soltar), editar no lugar, formatar, recuar, mover, apagar, revelar, ocultar | a própria coluna | pauta vazia; formato não suportado; grande demais; falha ao gravar; arquivo ausente | CAP-pauta-revelavel-coluna, -entrada, -revelar, -formatacao, -subitens, -organizar |
| Mídia do bloco | bloco | gravada, ausente | gravar ao colar ou soltar; remover junto com o bloco; procurar de novo quando ausente | implícita no bloco | ausente no disco; acima de 512 MB | CAP-pauta-revelavel-midia |
| Aparência | aplicativo | padrão, personalizada | escolher tema, destaque, fundo; voltar ao tema | painel Aparência | contraste baixo; imagem de fundo ausente | CAP-pauta-revelavel-aparencia |

## Risks And Classification
- Value uncertainty and validation: a promessa central (revelar sem vazar o oculto na captura) só se prova gravando de verdade; vira AC com captura de tela.
- User effort, scope/prototype impact, and ongoing burden: editor com marcas fechadas e árvore com nível são as partes mais caras; ambas já demonstradas no protótipo.
- Classification impact of selected scope: substituição da superfície inteira + migração de dados + editor; esperado MEDIUM.
