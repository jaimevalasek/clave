/**
 * Cópia da camada didática. A base é o protótipo aprovado
 * (`.aioson/briefings/clave/prototype.html`, build 5: `PASSOS_TOUR`,
 * `MOVIMENTOS_GUIA` e `TECLAS_GUIA`), reescrita para o produto que ficou de pé
 * depois da simplificação pedida pelo criador:
 *
 * 1. As quatro pistas por tipo viraram uma pauta linear. O tipo continua
 *    existindo como etiqueta de cor, mas não organiza mais a tela.
 * 2. A curva de energia saiu, e com ela o campo `energia` do bloco. O que ela
 *    ocupava é agora o assunto dos pontos.
 * 3. Capítulos do YouTube e trechos para corte saíram: eles dependiam de o
 *    relógio da pauta bater com o da gravação, o que nunca acontece. A tecla
 *    `C` foi junto.
 * 4. Entraram os pontos do bloco, revelados um a um pelo mesmo avanço.
 *
 * As âncoras do holofote reusam os `data-testid` que já existem nas telas, em
 * vez de criar um segundo conjunto de atributos só para o tour.
 */

export interface TourStep {
  /** `data-testid` da região destacada; `null` abre a caixa centrada, sem holofote. */
  anchor: string | null;
  title: string;
  emphasis: string;
  paragraphs: string[];
}

export const TOUR_STEPS: TourStep[] = [
  {
    anchor: null,
    title: 'O Clave em',
    emphasis: 'uma tela',
    paragraphs: [
      'Você faz live e não quer se perder no meio. O Clave é a pauta: você escreve o roteiro antes e conduz por ele durante, sem tirar a mão do teclado.',
      'São três telas: <span class="termo">Pautas</span> é a lista das suas lives, <span class="termo">Bancada</span> é onde você monta o roteiro e <span class="termo">Palco</span> é a tela que o público vê enquanto você conduz.'
    ]
  },
  {
    anchor: 'bancada-canvas',
    title: 'A pauta é uma',
    emphasis: 'lista só',
    paragraphs: [
      'Cada linha é um <span class="termo">bloco</span>: um assunto da live, com título e duração prevista. De cima para baixo é a ordem em que você vai falar.',
      'Arraste um bloco para mudar a ordem e clique nele para abrir a ficha. A cor da borda é só uma etiqueta — ela ajuda a bater o olho, não muda o comportamento de nada.'
    ]
  },
  {
    anchor: 'pauta-lista',
    title: 'Dentro do bloco ficam os',
    emphasis: 'pontos',
    paragraphs: [
      'Na ficha do bloco você escreve os <span class="termo">pontos</span>: as linhas do que você vai falar naquele assunto, cada uma com uma imagem opcional.',
      'No Palco eles não aparecem todos de uma vez. Cada avanço revela o próximo e marca o anterior como falado, como o build de uma apresentação. Bloco sem pontos avança direto para o próximo.'
    ]
  },
  {
    anchor: 'reserva',
    title: 'Resgates são o seu',
    emphasis: 'plano B',
    paragraphs: [
      'A reserva fica embaixo, fora da ordem. São blocos curtos guardados para quando o chat esfria ou o assunto trava: uma história, uma enquete, uma demo rápida.',
      'Você saca um durante a live e, ao terminar, o Clave devolve você à pauta exatamente onde parou.'
    ]
  },
  {
    anchor: 'acao-entrar-no-ar',
    title: 'O Palco é o que o',
    emphasis: 'público vê',
    paragraphs: [
      'Este botão abre o Palco, a tela que você compartilha no OBS. Antes de abrir, o Clave confere as imagens e os anexos e avisa se algum arquivo estiver faltando.',
      'Lá você conduz pelo teclado: <span class="tecla">espaço</span> avança (ponto a ponto, depois de bloco), <span class="tecla">N</span> (segurando) mostra a sua nota só no seu monitor e <span class="tecla">R</span> saca um resgate.',
      'O tempo responde só duas perguntas: há quanto tempo você está neste assunto e quanto falta para fechar a pauta. O guia completo fica sempre no botão <span class="termo">Como usar</span>, no canto inferior direito.'
    ]
  }
];

export interface GuideMovement {
  /** Metal do movimento: a cor não é enfeite, ela ordena a leitura. */
  metal: string;
  measure: string;
  title: string;
  steps: string[];
}

export const GUIDE_MOVEMENTS: GuideMovement[] = [
  {
    metal: 'var(--tema)',
    measure: 'Movimento 1 · antes da live',
    title: 'Montar a pauta',
    steps: [
      'Na tela <span class="termo">Pautas</span> fica a lista das suas lives, uma por linha. Você pode criar uma nova, duplicar a da semana passada para reaproveitar a estrutura, renomear ou apagar.',
      'Ao abrir uma pauta você cai na <span class="termo">Bancada</span>. Ela é uma lista só, numerada, de cima para baixo: a ordem visual é a ordem da live.',
      'O botão <span class="termo">+ novo bloco</span> no fim da lista cria o próximo assunto. Clique em um bloco para abrir a ficha: título, duração prevista, etiqueta de cor, os pontos, a nota que só você vê no Palco e os anexos.',
      'Arraste um bloco para mudar de lugar. Se errar, o aviso que aparece no canto desfaz a última mudança.',
      'O cabeçalho soma a duração prevista de todos os blocos — é o tamanho que a live tem no papel.'
    ]
  },
  {
    metal: 'var(--midia)',
    measure: 'Movimento 2 · dentro de cada bloco',
    title: 'Escrever os pontos',
    steps: [
      'Um bloco é o assunto; os <span class="termo">pontos</span> são o que você fala dentro dele. Escreva um por linha, na ordem, com as setas ↑ ↓ para mudar de lugar.',
      'Cada ponto aceita uma imagem: escolha um arquivo do seu computador e o Clave copia para a pasta de mídia do app. Ela entra na tela junto com o ponto.',
      'No Palco, os pontos aparecem um a um conforme você avança e ficam marcados ao passar — você sempre vê onde está e o que ainda falta dizer sobre aquele assunto.',
      'O quadradinho de cada ponto também é clicável, na Bancada e no Palco: dá para marcar ou desmarcar na mão quando a live sai do roteiro.',
      'Entrar no ar desmarca todos os pontos da pauta. A live começa com o checklist limpo, mesmo que você tenha ensaiado antes.'
    ]
  },
  {
    metal: 'var(--resgate)',
    measure: 'Movimento 3 · durante a live',
    title: 'Conduzir no Palco',
    steps: [
      'O botão dourado <span class="termo">Entrar no ar</span> abre o Palco. Antes de abrir, o Clave confere a mídia de todos os blocos e avisa se algum arquivo estiver faltando, para você não descobrir isso ao vivo.',
      'O Palco é a tela que você compartilha no OBS: o público vê o assunto atual e os pontos já revelados. As suas anotações nunca aparecem sozinhas.',
      'Você conduz sem tirar a mão do teclado. As teclas estão listadas logo abaixo desta seção e também no rodapé do próprio Palco.',
      'O tempo no Palco é relativo à execução: <span class="termo">há quanto tempo você está neste assunto</span> e <span class="termo">quanto falta para fechar a pauta</span>. Ele não tenta se casar com o relógio da sua gravação, porque você não começa os dois no mesmo instante.',
      'Os resgates ficam num deck no rodapé. Ao sacar um, o Palco troca para ele; ao terminar, você volta à pauta exatamente onde tinha parado.',
      'O botão <span class="termo">← Bancada</span>, no topo, sai do Palco sem encerrar a live: a execução fica em aberto e o Clave pergunta o que fazer com ela quando você voltar.'
    ]
  },
  {
    metal: 'var(--convidado)',
    measure: 'Movimento 4 · depois da live',
    title: 'Relatório e acervo',
    steps: [
      'Ao encerrar, o Clave abre o relatório: o trajeto que você realmente tocou, lado a lado com o que estava planejado, mostrando o que estourou o tempo e o que encolheu.',
      'Ele serve para a próxima pauta ficar mais honesta: se um assunto sempre leva o dobro do previsto, é o previsto que está errado.',
      'Os tempos do relatório contam a partir de quando você entrou no ar, não da sua gravação — por isso eles não viram marcação de vídeo.',
      'Um bloco que funcionou bem pode ser guardado no <span class="termo">Acervo</span>, com os pontos e os anexos dele, e trazido de volta em qualquer pauta futura sem remontar nada.'
    ]
  }
];

/** As cinco teclas do Palco, na ordem em que aparecem numa live real. */
export const STAGE_KEYS: [string, string][] = [
  ['espaço', 'revela o próximo ponto; sem pontos por revelar, avança de bloco (a seta → faz o mesmo)'],
  ['←', 'desfaz o último ponto revelado; no começo do bloco, volta ao bloco anterior'],
  ['N', 'segure para ver a sua nota privada. Ela não vai para a tela capturada'],
  ['R', 'saca um resgate do deck'],
  ['Esc', 'encerra a live e abre o relatório']
];

export const GUIDE_COPY = {
  openLabel: 'Como usar',
  openTitle: 'Guia completo: como usar o Clave',
  dialogLabel: 'Como usar o Clave',
  eyebrow: 'Guia do Clave',
  heading: 'Como usar, do começo ao fim',
  opening:
    'O Clave é a sua pauta de live: uma lista de assuntos na ordem em que você vai falar, com os pontos de cada assunto aparecendo um a um enquanto você conduz. Leia na ordem abaixo: é a mesma ordem de uma live real.',
  keysMeasure: 'Teclado do Palco',
  keysTitle: 'As cinco teclas que você usa ao vivo',
  storageTitle: 'Onde o Clave guarda tudo',
  storageBody:
    'Pautas, blocos, pontos, anexos e trajetos ficam gravados no seu computador, na pasta de dados do app. Nada sobe para a nuvem e nada se perde ao fechar o Clave. A mídia que você anexa é copiada para a pasta do app, então mover o arquivo original depois não quebra a imagem.',
  close: 'Fechar',
  understood: 'Entendi, quero usar',
  seeTour: 'Ver o tour de 5 passos',
  skipTour: 'Pular',
  fullGuide: 'Guia completo',
  next: 'Próximo',
  start: 'Começar a usar',
  stepCounter: (current: number, total: number) => `COMO USAR · ${current} / ${total}`
} as const;
