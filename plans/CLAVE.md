# CLAVE

**Pauta viva para lives.** Roda como app dentro do AIOSON Play (IDE + runtime Node).

---

## 1. A tese

Todo sistema de pauta que existe (Cuez, Rundown Studio, Sofie, vMix) é a mesma
planilha com coluna de tempo, herdada da TV. Funciona para jornal das 8, onde tudo
é cronometrado e linear. Live não é isso — live é improviso reativo ao chat.

**Pauta de live não é uma lista. É um formato com um caminho sugerido e desvios possíveis.**

Duas decisões derivam disso e definem o produto inteiro:

### 1.1 A pauta musical é a interface

"Pauta" em português significa a agenda *e* as cinco linhas onde se escreve música.
O trocadilho não é o nome — é a arquitetura. Cinco linhas horizontais que na Bancada
são as pistas de composição e no Palco viram a barra de progressão. O logo e a
interface são o mesmo desenho.

### 1.2 O Palco fica na tela capturada pelo OBS

Isto muda tudo. O Palco não é teleprompter, é **cenário**. O público vê a pauta
acontecendo. Consequências obrigatórias:

- Duas camadas de informação: **pública** (título, mídia, progressão) e **privada**
  (notas, lembretes, alertas de tempo). A privada nunca aparece por padrão.
- Estética é cenografia, não UI de ferramenta. Tipografia grande, contraste alto,
  nada de cinza fino — tem que sobreviver à compressão do YouTube.
- Progressão visível vira retenção: quem chega no minuto 40 bate o olho e entende
  onde está a live e o que ainda vem.
- O bloco pode tomar a tela. Abrir um bloco de mídia toca o vídeo em tela cheia.
  A pauta é o próprio switcher visual.

---

## 2. Os três modos

| Modo | Job | Referência visual |
|---|---|---|
| **Bancada** | Compor a live antes | DAW / Ableton Live |
| **Palco** | Conduzir ao vivo, na tela do OBS | Now Playing / mission control |
| **Acervo** | Reciclar blocos que funcionaram | biblioteca de samples |

### 2.1 Bancada

Canvas horizontal com 5 pistas. Ordem da esquerda para a direita = ordem da live.
Cada bloco vive na pista do seu tipo. A pista **Resgate** é tracejada e fica fora
do trilho — seus blocos não têm posição na sequência.

Interações: arrastar para reordenar, clicar para editar em gaveta lateral,
`+` no fim de cada pista para criar.

### 2.2 Palco

Layout: barra superior (mini-pauta + relógio global), centro (bloco atual em
tipografia gigante + anexos), lateral (cronômetro do bloco + a seguir),
rodapé (deck de resgate).

Atalhos: `espaço`/`→` avança · `←` volta · `R` saca resgate aleatório ·
`N` alterna notas privadas.

Sair de um resgate volta automaticamente ao trilho onde parou.

### 2.3 Acervo

Grade de blocos já usados, com contador de uso e "há quantos dias não vai ao ar".
Clicar traz uma cópia para a pauta de hoje. O objetivo é reciclar sem repetir demais.

---

## 3. Os diferenciais

Estes são os quatro pontos que fazem o Clave não ser mais uma planilha bonita.
Se algum for cortado, o produto vira commodity.

### 3.1 Curva de energia

Cada bloco tem intensidade de 1 a 5. O app desenha a onda da live inteira embaixo
da pauta. Dois blocos fracos seguidos = **vale**, sinalizado em coral com a soma
dos minutos: *"vale de 20 min no meio — considere um resgate aqui"*.

É a coisa mais útil para quem faz live e nenhum concorrente faz. Você *vê* o tédio
antes de entrar no ar.

### 3.2 Cartas de resgate

Blocos fora do caminho principal, sempre à mão no deck: história curta, enquete,
demo rápida, leitura de código do chat. Quando o chat morre ou alguém desvia o
assunto, você saca uma e volta ao trilho.

É o que de fato acontece numa live e nenhuma pauta modela.

### 3.3 Blocos são objetos vivos

Cada bloco carrega seus anexos: vídeo, imagem, link, snippet de código, texto
pronto para colar no chat. No Palco, botão de abrir/copiar direto. É aqui que
mora o "guardar e organizar mídia".

### 3.4 Gravação do trajeto real

O app registra o caminho que você realmente fez e quanto durou cada bloco. Ao
encerrar: planejado × tocado, e — o pulo do gato — **timestamps prontos para
capítulos do YouTube** e marcação de trechos para cortes/Shorts.

A pauta vira insumo de pós-produção sozinha.

---

## 4. Modelo de dados

```ts
type Tipo = 'tema' | 'midia' | 'interacao' | 'convidado' | 'resgate';

interface Anexo {
  id: string;
  tipo: 'video' | 'imagem' | 'link' | 'codigo' | 'chat' | 'arquivo';
  rotulo: string;
  caminho: string;        // path no disco ou URL
  telaCheia?: boolean;    // se abre tomando a tela capturada
}

interface Bloco {
  id: string;
  tipo: Tipo;
  titulo: string;
  nota: string;           // PRIVADA — nunca renderiza sem toggle
  energia: 1|2|3|4|5;
  duracao: number;        // minutos previstos
  ordem: number | null;   // null quando tipo === 'resgate'
  anexos: Anexo[];
  origemAcervoId?: string;
}

interface Pauta {
  id: string;
  titulo: string;
  data: string;
  blocos: Bloco[];
}

interface Execucao {          // uma ida ao ar
  id: string;
  pautaId: string;
  inicio: string;
  fim?: string;
  trajeto: PassoTrajeto[];
}

interface PassoTrajeto {
  blocoId: string;
  titulo: string;             // snapshot: o bloco pode mudar depois
  tipo: Tipo;
  inicioRelativo: number;     // segundos desde o início da live
  duracaoReal: number;        // segundos
  duracaoPrevista: number;
  foiResgate: boolean;
}

interface ItemAcervo {
  id: string;
  tipo: Tipo;
  titulo: string;
  anexos: Anexo[];
  vezesNoAr: number;
  ultimaVezEm: string | null;
}
```

**Regra invariante:** `tipo === 'resgate'` implica `ordem === null`. Trocar o tipo
de um bloco para/de resgate precisa recalcular a sequência.

---

## 5. Design system

### Cores

```css
--tinta:    #0B0E20;   /* fundo azul-tinta, NÃO preto puro */
--tinta-2:  #131735;   /* superfície */
--tinta-3:  #1D2249;   /* superfície elevada */
--giz:      #F0EDFA;   /* texto */
--giz-2:    #8C88BC;   /* texto secundário */
--linha:    rgba(240,237,250,.13);

/* cor codifica TIPO de bloco — nunca decora */
--tema:      #F2B33D;  /* âmbar */
--midia:     #35D6BE;  /* turquesa */
--interacao: #FF6B9D;  /* rosa */
--convidado: #A78BFA;  /* lilás */
--resgate:   #FF7A59;  /* coral */
```

Preto puro (`#000`) estoura na compressão do YouTube e cria banding. Azul-tinta
lê como estúdio, não como terminal.

A cor do tipo reaparece em todos os lugares onde aquele bloco existe: borda
esquerda na Bancada, selo no Palco, barra do cronômetro, nota na mini-pauta,
borda do relatório. Essa consistência é o que ensina o sistema sem legenda.

### Tipografia

- **Display** — Archivo, weight 900, `font-stretch: 125%`. Títulos do Palco em
  `clamp(38px, 5.6vw, 78px)`, `line-height: .94`.
- **Corpo** — Sora, weight 300/400.
- **Dados** — JetBrains Mono. Todo timecode, contador e rótulo estrutural.
  Timecode em mono é semanticamente correto, não estético.

### Movimento

Uma coreografia só: a entrada do bloco no Palco, palavra a palavra, 35ms de
delay entre elas. Todo o resto é transição funcional de 150ms. Respeitar
`prefers-reduced-motion`.

---

## 6. Stack e arquitetura

```
clave/
├── src/
│   ├── modos/
│   │   ├── Bancada/          # canvas, pistas, drag-drop
│   │   ├── Palco/            # live, atalhos, deck
│   │   └── Acervo/
│   ├── nucleo/
│   │   ├── estado.ts         # store (Zustand)
│   │   ├── energia.ts        # cálculo da curva + detecção de vale
│   │   ├── trajeto.ts        # gravação da execução
│   │   └── marcadores.ts     # exportação de timestamps
│   ├── ui/                   # tokens, primitivos
│   └── tipos.ts
├── servidor/
│   ├── db.ts                 # SQLite (better-sqlite3)
│   ├── midia.ts              # pasta local de anexos
│   └── api.ts
└── dados/
    ├── clave.db
    └── midia/
```

- **Front:** React + Vite + TypeScript
- **Estado:** Zustand (o estado é pequeno e muito acessado; Redux é overkill)
- **Drag & drop:** `dnd-kit` (melhor acessibilidade que react-dnd)
- **Persistência:** SQLite via `better-sqlite3`, síncrono, sem servidor externo
- **Mídia:** pasta no disco, referência por caminho relativo no banco

Como o AIOSON Play já é runtime Node com shell web, o Clave entra como módulo —
sem Electron, sem empacotamento próprio.

**Não usar `localStorage`.** A casca HTML mantém estado em memória de propósito,
para não criar um caminho que teria que ser arrancado na migração para SQLite.

---

## 7. Fases

### Fase 1 — Bancada
Modelo de dados, store, 5 pistas, criar/editar/remover bloco, drag para reordenar,
persistência SQLite. Sem anexos ainda.

### Fase 2 — Curva de energia
Cálculo, SVG suavizado, detecção de vale, aviso. Fecha o Bancada.

### Fase 3 — Palco
Layout, mini-pauta, cronômetro duplo (global + bloco), atalhos de teclado,
camada privada, deck de resgate com retorno ao trilho.

### Fase 4 — Anexos
Upload para a pasta de mídia, tipos, abertura no Palco. Decidir aqui: anexo de
vídeo toma a tela capturada ou abre só para o apresentador.

### Fase 5 — Trajeto e relatório
Gravação da execução, comparativo planejado × real, exportação de marcadores
do YouTube, marcação de trechos para cortes.

### Fase 6 — Acervo
Promover bloco para o acervo, contador de uso, "há quantos dias no ar",
trazer cópia para a pauta.

### Fase 7 — Copiloto AIOSON
Agente que lê a pauta e sugere resgate pelo ritmo, gera variações de bloco,
monta o esqueleto da próxima live a partir do acervo e do histórico de execuções.

---

## 8. Decisões em aberto

1. **Anexo de vídeo no Palco** — toma a tela capturada (pauta vira switcher) ou
   abre em janela só para o apresentador? A primeira é mais ousada e coerente com
   a tese; a segunda é mais segura.
2. **Segunda tela** — vale um modo espelho no celular só com as notas privadas,
   já que a tela principal está capturada?
3. **Convidado remoto** — o convidado vê a pauta? Modo somente-leitura por URL local?
4. **Chat** — integrar leitura do chat do YouTube/Twitch para alimentar blocos de
   interação, ou manter o app deliberadamente desconectado?
5. **Múltiplos trilhos** — uma live pode ter caminhos alternativos ramificados, ou
   trilho único + resgates já cobre o caso real?

---

## 9. Vocabulário

Manter consistente em código, UI e conversa. É o que faz o app parecer uma coisa só.

| Termo | Significado |
|---|---|
| **Pauta** | o documento inteiro de uma live |
| **Bloco** | unidade de conteúdo; a "nota" pousada na pauta |
| **Pista** | uma das 5 linhas horizontais (= tipo de bloco) |
| **Trilho** | a sequência ordenada de blocos (exclui resgates) |
| **Resgate** | bloco fora do trilho, sacado sob demanda |
| **Deck** | conjunto de resgates disponíveis no Palco |
| **Entrar no ar** | iniciar a execução |
| **Trajeto** | o caminho realmente percorrido |
| **Marcadores** | os timestamps gerados para o YouTube |
| **Acervo** | biblioteca de blocos reutilizáveis |

Nada de "slide", "apresentação", "item", "task". O produto não é apresentação.
