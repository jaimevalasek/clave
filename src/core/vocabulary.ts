/**
 * Vocabulário canônico do Clave (fonte §9). Toda string de interface sai daqui:
 * Pauta, Bloco, Ponto, Resgate, Deck, Entrar no ar, Trajeto, Acervo. Nenhuma
 * tela chama Bloco de "slide", "apresentação", "item" ou "task".
 *
 * O vocabulário vincula texto de interface e substantivos do domínio na conversa;
 * identificadores, rotas e caminhos seguem `source-code-language-convention.md`
 * e por isso continuam em inglês.
 */

/** Termos proibidos para os conceitos do produto — o teste de vocabulário varre por eles. */
export const FORBIDDEN_TERMS = ['slide', 'item', 'task'] as const;

export const VOCABULARY = {
  appName: 'Clave',
  rundown: 'Pauta',
  rundownPlural: 'Pautas',
  block: 'Bloco',
  blockPlural: 'Blocos',
  beat: 'Ponto',
  beatPlural: 'Pontos',
  rescue: 'Resgate',
  deck: 'Deck',
  goLive: 'Entrar no ar',
  onAir: 'AO AR',
  run: 'Execução',
  trajectory: 'Trajeto',
  library: 'Acervo',
  board: 'Bancada',
  stage: 'Palco',
  attachment: 'Anexo',
  attachmentPlural: 'Anexos'
} as const;

export const COPY = {
  nav: {
    rundowns: 'Pautas',
    board: 'Bancada',
    library: 'Acervo',
    backToRundowns: '← Todas as pautas',
    backToBoard: '← Bancada'
  },
  rundowns: {
    eyebrow: 'Suas lives',
    heading: 'Pautas',
    subheading: 'Cada pauta é uma live. O Clave reabre a última usada.',
    create: 'Criar pauta',
    createFirst: 'Criar a primeira pauta',
    open: 'Abrir',
    rename: 'Renomear',
    duplicate: 'Duplicar',
    remove: 'Apagar',
    pin: 'Fixar',
    unpin: 'Desafixar',
    pinned: 'FIXADO',
    fieldPinned: 'Fixar no topo',
    fieldKind: 'Tipo',
    kinds: {
      rundown: 'Pauta',
      presentation: 'Apresentação',
      event: 'Evento'
    },
    lastUsed: 'ÚLTIMA USADA',
    openRun: 'EXECUÇÃO EM ABERTO',
    seeReport: 'ver relatório do trajeto',
    emptyTitle: 'Nenhuma pauta ainda',
    emptyBody:
      'A pauta é o roteiro inteiro de uma live: os blocos na ordem em que você vai falar, os pontos dentro de cada bloco e os resgates guardados na reserva. Crie a primeira para começar a compor.',
    formTitleCreate: 'Criar pauta',
    formTitleRename: 'Renomear pauta',
    fieldTitle: 'Título da live',
    fieldTitlePlaceholder: 'Ex.: Live #44: perguntas e código',
    fieldDate: 'Data',
    deleteTitle: (title: string) => `Apagar a pauta "${title}"?`,
    deleteConsequence:
      'Os blocos desta pauta são apagados junto. Os relatórios de trajeto já gravados são preservados. Esta ação não pode ser desfeita.',
    deleteConfirm: 'Apagar pauta',
    created: 'Pauta criada. Comece a compor pelo primeiro bloco',
    renamed: 'Pauta renomeada',
    duplicated: (title: string) => `Pauta duplicada: ${title}`,
    deleted: 'Pauta apagada'
  },
  board: {
    eyebrow: (date: string, planned: string, kindLabel = 'Pauta') =>
      `${kindLabel} · ${date} · ${planned} previstos`,
    emptyTitle: 'Pauta em branco',
    emptyBody:
      'A pauta é uma lista só, de cima para baixo: cada bloco é um assunto, e a ordem visual é a ordem da live. Dentro do bloco você escreve os pontos — as linhas que vão aparecendo no Palco conforme você fala.',
    emptyCta: 'Criar o primeiro bloco',
    addBlock: 'novo bloco',
    addRescue: 'novo resgate',
    rescueHeading: 'Reserva · resgates',
    rescueLaneHint:
      'Resgates ficam fora da ordem. Você saca um durante a live quando o assunto trava, e volta exatamente onde parou.'
  },
  common: {
    cancel: 'Cancelar',
    save: 'Salvar',
    close: 'Fechar',
    undo: 'Desfazer',
    copy: 'Copiar',
    loading: 'Carregando'
  },
  errors: {
    writeFailed: (action: string) => `Não foi possível ${action}.`,
    keepTyped: 'O que você digitou continua no formulário: corrija e envie de novo.',
    backendDown:
      'O Clave não conseguiu falar com o próprio servidor. Verifique se o app continua rodando no Play e tente de novo.'
  }
} as const;
