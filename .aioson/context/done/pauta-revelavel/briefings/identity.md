---
kind: identity
scope: briefing
slug: pauta-revelavel
source: references
generated_by: reference-identity-extract
generated_at: 2026-11-11
confidence: high
theme: dark
register: editorial
base_unit: 4px
---

## Design pillars

1. **Papel pautado em tinta quente.** A pauta é literalmente uma folha pautada: linhas finas de 1px correm atrás da coluna como no caderno, e cada bloco revelado é escrito sobre elas. O tema padrão herda a tinta quente `#0B0A08` e o marfim da identidade "Tinta & Ouro" do Clave; nenhum fundo é preto absoluto, porque `#000` estoura banding na compressão do YouTube.
2. **O conteúdo é o palco; a ferramenta recua.** O que o público vê é a coluna. Controles vivem numa régua fina no topo e numa calha à esquerda de cada bloco que só aparece com foco ou ponteiro. Ouro é reservado à marca, à ação primária ("Revelar próximo") e aos gates; o aviso de preparo fala em perigo, nunca em ouro.
3. **Três vozes, com papel fixo.** Estrutura e conteúdo falam em sans. A máquina (contadores "3 de 12", atalhos, estado de salvamento) fala em mono. A intenção do apresentador (dicas da visão de preparo, rótulos "começa oculto") fala em serif itálico curto. A máquina nunca fala em serif; o conteúdo do apresentador nunca fala em mono.

## Palette

Tema padrão "Tinta & Ouro" (escuro). Os outros temas trocam só os papéis abaixo; escala, voz e movimento são fixos.

- Fundo: tinta `#0B0A08`; folha (área da coluna) `#100E0B`.
- Superfícies: superficie `#161310`; superficie-2 `#1D1914`; solido (modal e painel opaco) `#242019`.
- Texto: marfim `#F5F1E8`; secundário marfim-2 `#CDC5B4`; metadados fumaca `#8F8674`.
- Pauta e bordas: linha da pauta `rgba(224,203,163,.07)`; linha `rgba(224,203,163,.14)`; seleção linha-2 `rgba(233,214,177,.28)`.
- Marca / ação primária / gate: ouro `#E8BA52`.
- Semântica: salvo e sucesso = patina `#6EC6A2`; erro, falha de mídia e aviso de preparo ligado = perigo `#E25D5D`; nota leve = cobre `#D8895B`.
- Temas prontos validados para vídeo (mesmos papéis):
  - **Porcelana** (claro): fundo `#F1EDE3`, folha `#F9F6EE`, texto `#1C1710`, secundário `#4C4436`, destaque `#8A6512`.
  - **Caderno** (claro, papel pautado): fundo `#ECE6D6`, folha `#FBF8EF`, texto `#22201B`, linha da pauta `rgba(60,90,140,.16)`, margem vermelha `rgba(178,58,58,.5)`, destaque ocre de marca-texto `#9C6400`.
  - **Lousa** (escuro verde): fundo `#14201B`, folha `#182821`, texto `#EEF2E8`, destaque `#E8D27A`.
  - **Alto contraste** (escuro): fundo `#0B0A08`, folha `#0B0A08`, texto `#FFFFFF`, destaque `#FFD34D`.
- Cor de destaque livre substitui só o papel "destaque/ouro"; abaixo de 4.5:1 sobre a folha, a interface avisa.
- **Cores de texto (rodada 2, F16):** seis papéis que o apresentador aplica a um trecho, com valor próprio em cada tema para continuar legível sobre a folha:

  | Papel | Tinta & Ouro | Porcelana | Caderno | Lousa | Alto contraste |
  |---|---|---|---|---|---|
  | texto | `#F5F1E8` | `#1C1710` | `#22201B` | `#EEF2E8` | `#FFFFFF` |
  | destaque | `#E8BA52` | `#8A6512` | `#9C6400` | `#E8D27A` | `#FFD34D` |
  | vermelho | `#EF6F6F` | `#BF3D47` | `#B23A3A` | `#F2938A` | `#FF7A7A` |
  | verde | `#6EC6A2` | `#177A58` | `#1F7A4F` | `#9ED9A0` | `#7CF0B8` |
  | cobre | `#D8895B` | `#A55A30` | `#A55A30` | `#E8A86B` | `#FFB27A` |
  | lilás | `#B49BD8` | `#6C4E9B` | `#6C4E9B` | `#C9B3F0` | `#D2B8FF` |
- Plano de fundo livre (cor, gradiente ou imagem) pinta só o fundo; a folha mantém um véu opaco de 88% para o texto não perder contraste.

## Typography

- Estrutura e conteúdo: `Inter, "Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif`, servida localmente (`public/fonts/inter-variable.woff2`).
- Intenção do apresentador: `Georgia, "Iowan Old Style", "Palatino Linotype", serif`, sempre itálico e curto.
- Máquina: `"JetBrains Mono", "Cascadia Code", monospace`, servida localmente (`public/fonts/jetbrains-mono-variable.woff2`).
- Escala do conteúdo (pensada para 720p comprimido), quatro tamanhos por bloco (rodada 2, F17), sempre com entrelinha múltipla do passo da pauta: **P** 22px/44px, **M** 30px/44px (padrão), **G** 38px/44px, **Título** 52px peso 700 com entrelinha justa de 1,12 (era 64px/88px; reduzido na rodada 4, F21). O Título não pousa linha a linha: como as mídias, o bloco completa a altura até o próximo múltiplo de 44px para o bloco seguinte voltar às linhas da pauta. Ajuste fino por bloco com A− e A+ em passos de 4px, sem sair da faixa do tamanho nem da entrelinha: P 18–26, M 26–34, G 34–42, Título 44–72px. No celular, todo tamanho vale 80% do desktop nas mesmas entrelinhas. Nada de conteúdo abaixo de 18px no desktop. Legenda de mídia 18px. Escala da ferramenta: título de página 30px/700; seção 19px/600; corpo 15px/1.55; metadados mono 11–12px caixa alta com tracking .1em.
- Pesos com papel fixo: 400 corpo da ferramenta; 500 texto normal do bloco e voz da máquina; 600 hierarquia e ação primária; 700 negrito aplicado pelo apresentador, bloco Título e título de página; 800 só para negrito dentro de um bloco Título.

## Spacing & layout

- Unidade base 4px; escala 4, 8, 12, 16, 24, 32, 56.
- A pauta (linhas de fundo) tem passo de 44px, o mesmo da altura de linha do texto do bloco, para o texto pousar nas linhas.
- Coluna centralizada com largura máxima de 820px; calha de controles de 44px à esquerda de cada bloco, fora da área de leitura.
- Sub-itens (rodada 3, F18 a F20): recuo de 56px por nível (32px no celular), no máximo 2 níveis abaixo do tópico. O marcador fica 28px à esquerda do texto, centrado na primeira linha: nível 1 `•`, nível 2 `◦`, na cor de destaque. A linha-guia é um traço vertical de 1px em `linha-2`, a 12px da borda do nível de cima, descendo do espaço acima do sub-item até o fim dele.
- Breakpoints: 900px (régua compacta, calha vira menu do bloco) e mínimo suportado 360px.
- Páginas de gestão (lista de pautas): largura máxima 960px, gutter 24px, linhas editoriais em vez de cartões.

## Radius & depth

- Escada de raio: 8px controles, 10px blocos de mídia, 16px painéis e modais, 99px chips.
- Uma estratégia de profundidade: **bordas e linhas** (1px sobre superfícies chapadas). A única sombra é o lift efêmero do bloco durante o arraste.

## Motion

- Transições funcionais: 150ms ease.
- Revelação de bloco (assinatura): 420ms `cubic-bezier(.2,.9,.3,1)`; o bloco entra subindo 8px enquanto uma máscara de tinta corre da esquerda para a direita, como tinta assentando na linha. A rolagem automática acompanha com `scroll-behavior: smooth`.
- Ocultar: 180ms de opacidade para zero, sem deslocamento.
- `prefers-reduced-motion`: revelação e ocultação instantâneas, rolagem sem animação, nenhuma máscara.
- Nada se move sem explicar uma mudança de estado.

## Signature moves

1. **A pauta é papel pautado.** Linhas horizontais finas a cada 44px correm atrás da coluna e o texto pousa nelas. No tema Caderno ganha a margem vertical em destaque, como no caderno escolar.
2. **Tinta assentando.** Revelar um bloco não é aparecer: uma máscara corre da esquerda para a direita e o bloco assenta na linha, como tinta fresca. É o único movimento com personalidade do produto.
3. **Fantasma de preparo.** Na visão de preparo, o bloco oculto aparece esmaecido sobre hachura diagonal fina, com o rótulo serif itálico "oculto — só você vê", e a régua do topo ganha uma faixa em perigo que diz "Preparo ligado · não grave".

## Anti-goals

1. Nada de deck de slides: sem páginas, miniaturas laterais ou transição de slide. A pauta é uma folha contínua.
2. Nada de SaaS genérico: sem grade de cartões, chrome de pílulas, gradientes decorativos, glassmorphism ou emoji como ícone.
3. Nada de preto absoluto com neon, azul estrutural, nem ouro usado como cor de conteúdo ou de aviso.

## Component structure notes

None — identity-only.

## Provenance

- Derivada de 2 registros textuais de referência (0 imagens de identidade, 0 imagens de estrutura): `.aioson/briefings/clave/identity.md` ("Tinta & Ouro", aprovado em 2026-08-18) e `src/ui/tokens.css` do app entregue.
- Decisão de origem: F14 da rodada 1 de refinamento de `pauta-revelavel` (opção `identity-references`, aceita pelo dono em 2026-11-11: "Pode aplicar as recomendações e prosseguir").
- Adaptações autoradas por @refiner: o mapa tipo→metal saiu (F1 removeu os tipos de bloco); entraram a pauta como papel pautado, os temas prontos de F8 e a regra de contraste para cor e fundo livres. Na rodada 2 (F15, F16, F17, pedido do dono em `plans/pauta-revelavel/pedido-formatacao.md`) entraram os quatro tamanhos de bloco e as seis cores de texto por tema; o destaque do tema Caderno passou a ser ocre para não repetir o vermelho de texto.
