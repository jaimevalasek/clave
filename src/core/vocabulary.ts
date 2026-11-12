/**
 * Canonical vocabulary of the revealable sheet. Every interface string comes
 * from here: Pauta, bloco, revelar, ocultar. The live-show vocabulary of the
 * previous version (board, stage, rescue deck, library, report, block type,
 * duration) is gone from the product.
 *
 * Identifiers, routes and paths stay in English
 * (`source-code-language-convention.md`); only the strings are pt-BR.
 */

/** Words the interface never uses for the product concepts. */
export const FORBIDDEN_TERMS = ['slide', 'task'] as const;

/** Live-show vocabulary retired with the previous version (AC-pauta-revelavel-49). */
export const RETIRED_TERMS = [
  'Bancada',
  'Palco',
  'Acervo',
  'relatório',
  'Entrar no ar',
  'cronômetro',
  'Trajeto',
  'resgate',
  'deck',
  'duração'
] as const;

export const VOCABULARY = {
  appName: 'Pauta revelável',
  rundown: 'Pauta',
  rundownPlural: 'Pautas',
  block: 'bloco',
  blockPlural: 'blocos',
  reveal: 'revelar',
  hide: 'ocultar'
} as const;

export const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** What "Apagar bloco?" names, per kind of block; `intake` is a file still being written. */
const DELETE_TARGET = {
  text: 'este texto',
  image: 'esta imagem',
  video: 'este vídeo',
  audio: 'este áudio',
  intake: 'este arquivo'
} as const;

const MB = 1024 * 1024;
const GB = 1024 * MB;

/** "600 MB", "1,4 GB": the size of a file as the presenter reads it. */
export function fileSize(bytes: number): string {
  if (bytes >= GB) return `${(bytes / GB).toFixed(1).replace('.', ',')} GB`;
  return `${Math.max(1, Math.round(bytes / MB))} MB`;
}

export const COPY = {
  rundowns: {
    eyebrow: VOCABULARY.appName,
    heading: VOCABULARY.rundownPlural,
    subheading: 'Cada pauta é uma folha só: você escreve, cola e revela na mesma tela que o público vê.',
    create: 'Nova pauta',
    createFirst: 'Criar a primeira pauta',
    emptyTitle: 'Nenhuma pauta ainda.',
    emptyBody: 'Crie uma pauta e cole o primeiro conteúdo: um texto, um print, um vídeo ou um áudio.',
    rename: 'Renomear',
    duplicate: 'Duplicar',
    remove: (title: string) => `Apagar ${title}`,
    pin: 'Fixar',
    unpin: 'Desafixar',
    pinned: 'fixada',
    blocks: (count: number) => plural(count, 'bloco', 'blocos'),
    initiallyVisible: (count: number) => `${count} na tela no início`,
    edited: (ago: string) => `editada ${ago}`,
    legacySeal: 'veio da versão anterior',
    legacySealHint:
      'Criada na versão anterior do app. Os pontos viraram blocos de texto e os anexos viraram blocos de mídia.',
    formCreateTitle: 'Nova pauta',
    formCreateText: 'Ela abre em branco, pronta para você colar ou escrever.',
    formCreateConfirm: 'Criar pauta',
    formRenameTitle: 'Renomear pauta',
    formRenameText: 'O nome aparece só na sua lista, nunca na gravação.',
    formRenameConfirm: 'Salvar nome',
    fieldName: 'Nome da pauta',
    renamed: 'Nome salvo.',
    duplicated: 'Cópia criada. Ela começa do zero: tudo como planejado.',
    deleteTitle: 'Apagar pauta?',
    deleteText: (title: string, count: number) =>
      `"${title}" e ${count === 1 ? 'o 1 bloco dela some' : `os ${count} blocos dela somem`} da lista e da pasta de mídia. Não dá para desfazer.`,
    deleteConfirm: 'Apagar pauta',
    deleted: 'Pauta apagada.',
    pinnedToast: 'Pauta fixada no topo.',
    unpinnedToast: 'Pauta desafixada.'
  },
  sheet: {
    back: 'Voltar para as pautas',
    nameLabel: 'Nome da pauta',
    legacyChip: 'versão anterior',
    legacyChipHint: 'Criada na versão anterior do app; os pontos viraram blocos de texto.',
    counterOf: 'de',
    counterOnScreen: 'na tela',
    saving: 'Salvando',
    savedAt: (time: string) => `Salvo às ${time}`,
    saveFailed: 'Falha ao salvar · nova tentativa em 5 s',
    columnLabel: (title: string) => `Pauta: ${title}`,
    emptyTitle: 'Folha em branco.',
    emptyBody:
      'Cole com Ctrl+V um texto, um print, um vídeo ou um áudio. Ou arraste o arquivo para cá, ou clique abaixo e comece a escrever.',
    emptyShortcuts: ['Ctrl+V cola', 'PgDn revela', 'PgUp oculta', 'Tab sub-item', 'F2 preparo'],
    continue: 'Clique para escrever, cole (Ctrl+V) ou solte um arquivo',
    textPlaceholder: 'Escreva aqui',
    textLabel: 'Texto do bloco',
    imageCaption: 'Imagem',
    videoCaption: 'Vídeo',
    audioCaption: 'Áudio',
    nameRequired: 'Dê um nome à pauta, por exemplo "Episódio 12: filas".',
    handleLabel: 'Arrastar para mover (ou Alt+↑/↓)',
    handleTitle: 'Arrastar · Alt+↑/↓',
    removeLabel: 'Apagar bloco',
    removeTitle: 'Apagar',
    indentNoParent: 'Para virar sub-item, o bloco precisa de um tópico logo acima.',
    indentTooDeep: 'A pauta vai até 3 níveis: o tópico e dois níveis de sub-item.',
    moved: 'Bloco movido. A ordem da coluna é a ordem de revelar.',
    undo: 'Desfazer',
    movedTo: (position: number, total: number) => `Bloco movido para a posição ${position} de ${total}.`,
    orderRestored: 'Ordem anterior de volta.',
    deleteTitle: 'Apagar bloco?',
    deleteText: (kind: keyof typeof DELETE_TARGET, withSubItems: boolean) =>
      `Você vai apagar ${DELETE_TARGET[kind]} da pauta.${withSubItems ? ' Os sub-itens dele sobem um nível.' : ''} Não dá para desfazer.`,
    deleteConfirm: 'Apagar bloco',
    dragInstructions: 'Arraste a alça com o ponteiro, ou, com a alça em foco, use Alt+↑ e Alt+↓ para mover o bloco.',
    dragStarted: 'Bloco levantado. Solte onde a marca aparecer.',
    dragCancelled: 'Arraste cancelado. O bloco ficou no lugar.',
    hideLast: 'Ocultar último',
    hideLastTitle: 'Ocultar o último revelado',
    revealNext: 'Revelar próximo',
    preparation: 'Preparo',
    preparationTitle: 'Preparo: ver e planejar os ocultos',
    newTake: 'Nova tomada',
    newTakeTitle: 'Nova tomada: voltar ao início',
    revealEmpty: 'A pauta está vazia. Cole ou escreva o primeiro bloco.',
    revealAllShown: 'Tudo já está na tela. PgUp oculta o último.',
    hideNothing: 'Nada foi revelado nesta tomada ainda.',
    topicRevealed: (subItems: number) =>
      `Tópico revelado com ${plural(subItems, 'sub-item', 'sub-itens')}. PgUp oculta o grupo.`,
    eyeHide: 'Ocultar este bloco',
    eyeShow: 'Mostrar este bloco',
    eyeHideTitle: 'Ocultar',
    eyeShowTitle: 'Mostrar',
    eyeHidTopic: 'Tópico oculto junto com os sub-itens. Ele volta com PgDn.',
    eyeHidBlock: 'Bloco oculto. Ele volta com PgDn ou aparece esmaecido no preparo (F2).',
    preparationOn: 'Preparo ligado: os ocultos aparecem esmaecidos só para você.',
    preparationOff: 'Preparo desligado. A tela está pronta para gravar.',
    preparationStripTitle: 'Preparo ligado',
    preparationStripBefore: 'O que está esmaecido não aparece na gravação. Desligue com',
    preparationStripAfter: 'antes de gravar.',
    plannedHidden: 'começa oculto',
    plannedVisible: 'começa visível',
    plannedTitle: 'Como o bloco começa em cada tomada',
    collapse: 'recolher',
    expand: 'expandir',
    collapseLabel: 'Recolher sub-itens',
    expandLabel: 'Expandir sub-itens',
    collapsedCount: (count: number) => plural(count, 'sub-item recolhido', 'sub-itens recolhidos'),
    sheetEnd: 'Fim da pauta · tudo na tela',
    newTakeDialogTitle: 'Começar uma nova tomada?',
    newTakeText: (visible: number, hidden: number) =>
      `Todos os blocos voltam a como foram planejados: ${plural(visible, 'visível', 'visíveis')} e ${plural(hidden, 'oculto', 'ocultos')}. Nenhum conteúdo é apagado.`,
    newTakeConfirm: 'Nova tomada',
    newTakeDone: 'Nova tomada. PgDn revela o primeiro bloco.',
    pastedBlocks: (count: number) => `${count} blocos criados: cada linha em branco separa um bloco.`,
    pastedList: (count: number) =>
      `Lista colada: ${plural(count, 'bloco', 'blocos')}, com os sub-itens nos níveis da lista.`,
    dropHere: 'Solte para criar blocos aqui',
    uploading: (name: string) => `Gravando ${name} na pasta de mídia`,
    uploadingLabel: (name: string) => `Progresso da gravação de ${name}`,
    missingTitle: 'Arquivo não encontrado',
    missingText: (name: string) =>
      `${name} saiu da pasta de mídia. O bloco continua no lugar e não aparece vazio na gravação.`,
    browseFile: 'Procurar o arquivo',
    unsupportedTitle: 'Formato não suportado',
    unsupportedText: (name: string) => `${name} não é texto, imagem, vídeo nem áudio. Converta o arquivo ou cole outro.`,
    tooLargeTitle: 'Arquivo grande demais',
    tooLargeText: (name: string, bytes: number) => `${name} tem ${fileSize(bytes)}. O limite é 512 MB por arquivo.`,
    writeFailedTitle: 'Não deu para gravar a mídia',
    writeFailedText: (name: string) => `${name} não foi salvo na pasta de mídia. O disco pode estar cheio.`,
    removeBlock: 'Remover bloco',
    playVideo: 'Tocar vídeo',
    pauseVideo: 'Pausar vídeo',
    playAudio: 'Tocar áudio',
    pauseAudio: 'Pausar áudio',
    playShortcut: 'Ctrl+Enter toca',
    noMediaOnScreen: 'Nenhum vídeo ou áudio na tela.',
    playRefused: 'O navegador não deixou tocar a mídia.',
    appearance: 'Aparência',
    howToUse: 'Como usar'
  },
  format: {
    sizeGroup: 'Tamanho do texto',
    sizes: {
      small: { short: 'P', name: 'Pequeno' },
      medium: { short: 'M', name: 'Médio' },
      large: { short: 'G', name: 'Grande' },
      title: { short: 'Título', name: 'Título' }
    },
    sizeTitle: (name: string, key: number) => `${name} · Ctrl+Alt+${key}`,
    fineGroup: 'Ajuste fino do tamanho',
    smaller: 'Diminuir tamanho',
    smallerTitle: 'Diminuir 4px · Ctrl+Alt+−',
    larger: 'Aumentar tamanho',
    largerTitle: 'Aumentar 4px · Ctrl+Alt+=',
    px: (px: number) => `${px}px`,
    rangeLimit: (name: string, min: number, max: number) =>
      `${name} vai de ${min} a ${max}px. Para passar disso, troque o tamanho.`,
    sizeAnnounced: (name: string, px: number) => `Tamanho ${name}, ${px}px.`,
    toolbar: 'Formatar trecho',
    bold: 'Negrito',
    boldTitle: 'Negrito · Ctrl+B',
    colors: {
      text: 'Texto',
      accent: 'Destaque',
      red: 'Vermelho',
      green: 'Verde',
      copper: 'Cobre',
      lilac: 'Lilás'
    },
    colorLabel: (name: string) => `Cor: ${name}`,
    normal: 'Normal',
    normalTitle: 'Volta ao normal: sem cor e sem negrito'
  },
  appearance: {
    title: 'Aparência',
    close: 'Fechar a Aparência',
    themeHeading: 'Tema',
    themes: {
      'ink-gold': { name: 'Tinta & Ouro', note: 'Escuro quente, o padrão' },
      porcelain: { name: 'Porcelana', note: 'Claro, para fundo de estúdio iluminado' },
      notebook: { name: 'Caderno', note: 'Papel pautado com margem' },
      slate: { name: 'Lousa', note: 'Verde escuro de sala de aula' },
      'high-contrast': { name: 'Alto contraste', note: 'Para vídeo muito comprimido' }
    },
    accentHeading: 'Cor de destaque',
    accentPick: 'Escolher cor de destaque',
    accentReset: 'Usar a do tema',
    contrastOk: (ratio: string) => `Contraste ${ratio}:1 sobre a folha. Legível no vídeo.`,
    contrastLow: (ratio: string) =>
      `Contraste ${ratio}:1 sobre a folha. No vídeo comprimido essa cor pode sumir; o mínimo recomendado é 4,5:1.`,
    backgroundHeading: 'Plano de fundo',
    backgroundKindLabel: 'Tipo de fundo',
    backgroundKinds: { theme: 'Do tema', color: 'Cor', gradient: 'Gradiente', image: 'Imagem' },
    backgroundColor: 'Cor do fundo',
    gradientGroup: 'Gradiente',
    gradient: (position: number) => `Gradiente ${position}`,
    imageChoose: 'Escolher imagem',
    imageChange: 'Trocar imagem',
    imageUploading: 'Gravando a imagem na pasta de mídia',
    imageUnsupported: (name: string) => `${name} não é uma imagem PNG, JPG, GIF ou WebP.`,
    imageTooLarge: (name: string, bytes: number) => `${name} tem ${fileSize(bytes)}. O limite é 512 MB por arquivo.`,
    imageFailed: 'Não deu para gravar a imagem na pasta de mídia. Tente de novo.',
    frameHeading: 'Enquadramento',
    frameLabel: 'Enquadramento da imagem de fundo',
    frameValue: (x: number, y: number) => `${x}% na horizontal, ${y}% na vertical`,
    frameHint: 'Arraste o retângulo: ele é o pedaço da imagem que aparece na tela. As setas também movem.',
    frameZoom: 'Zoom',
    frameReset: 'Centralizar',
    veilLabel: 'Transparência da folha',
    veilHint: 'Quanto do fundo aparece através da folha, atrás do texto. 0% esconde o fundo; 100% deixa só as pautas e o texto.',
    veilLow: 'Com a folha muito transparente, o texto pode sumir nas partes claras ou agitadas da imagem. Confira no vídeo antes de gravar.',
    scopeNote: 'Vale para todas as pautas.',
    saveFailed: 'Falha ao salvar a aparência · nova tentativa em 5 s'
  },
  /**
   * First-open tour (AC-pauta-revelavel-50), copy of the approved prototype.
   * Keys are marked with `<span class="tecla">` and rendered by `richText`.
   */
  tour: {
    dialogLabel: 'Como usar a pauta revelável',
    stepCounter: (current: number, total: number) => `Passo ${current} de ${total}`,
    skip: 'Pular',
    next: 'Próximo',
    start: 'Começar',
    steps: {
      sheet: {
        title: 'Esta folha é a pauta inteira',
        body: 'Você escreve aqui e é isto que a gravação mostra. Não existe tela de edição separada nem tela de apresentação.'
      },
      reveal: {
        title: 'PageDown revela, PageUp esconde',
        body: 'Cada <span class="tecla">PageDown</span> mostra o próximo bloco oculto, de cima para baixo, e a folha rola até ele. Passe o mouse num bloco: o olho esconde ou mostra só aquele. <span class="tecla">Shift+PageDown</span> revela o tópico inteiro, com os sub-itens. Funciona com passador de slides.'
      },
      paste: {
        title: 'Cole, escreva e destaque',
        body: '<span class="tecla">Ctrl+V</span> transforma texto, print, vídeo ou áudio em blocos; colar uma lista já cria os sub-itens. <span class="tecla">Tab</span> recua o bloco para sub-item e <span class="tecla">Shift+Tab</span> volta. Selecione um trecho para cor ou negrito; o tamanho (P, M, G, Título) fica acima do bloco.'
      },
      preparation: {
        title: 'F2 liga o preparo',
        body: 'Os blocos ocultos aparecem esmaecidos só para você ajustar, e uma faixa avisa para não gravar assim. O botão ao lado começa uma nova tomada do zero.'
      },
      appearance: {
        title: 'A cara é sua',
        body: 'Escolha tema, cor de destaque e plano de fundo. Vale para todas as pautas.'
      }
    }
  },
  common: {
    cancel: 'Cancelar',
    retry: 'Tentar de novo'
  },
  errors: {
    backendDown:
      'O app não conseguiu falar com o próprio servidor. Verifique se ele continua rodando no Play e tente de novo.',
    unexpected: 'Erro inesperado. Tente de novo.'
  }
} as const;
