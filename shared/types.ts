// Modelo de domínio do Clave, compartilhado entre servidor e interface.
// Vocabulário do produto (pt-BR) → identificadores (en):
// Pauta=Rundown · Bloco=Block · Ponto=Beat · Resgate=rescue
// Execução=Run · Trajeto=RunStep · Acervo=LibraryItem · Anexo=Attachment

/** Etiquetas de cor do bloco. Não são estrutura: a pauta é uma linha só. */
export const TRACK_LANES = ['topic', 'media', 'interaction', 'guest'] as const;
export type TrackLane = (typeof TRACK_LANES)[number];

/** Todas as etiquetas: as quatro da pauta mais a reserva de resgate. */
export const BLOCK_TYPES = [...TRACK_LANES, 'rescue'] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

export const ATTACHMENT_TYPES = ['video', 'image', 'link', 'code', 'chat', 'file'] as const;
export type AttachmentType = (typeof ATTACHMENT_TYPES)[number];

export interface Attachment {
  id: string;
  type: AttachmentType;
  label: string;
  /** Caminho relativo dentro da pasta de mídia do app, ou URL http(s). Nunca caminho absoluto. */
  path: string;
  /** Texto pronto para colar — usado por `code` e `chat`. */
  content: string;
  /** Quando verdadeiro, o anexo toma a tela capturada; caso contrário abre no painel privado. */
  fullscreen: boolean;
  position: number;
}

/**
 * Ponto do bloco: uma linha do que você vai falar, que só entra na tela do
 * Palco quando você chega nela. O nome em código é `Beat` porque `RunStep` já é
 * o passo do trajeto gravado — são coisas diferentes.
 */
export interface Beat {
  id: string;
  text: string;
  /** Imagem que entra junto com o ponto: caminho na pasta de mídia ou URL http(s). Vazio = sem imagem. */
  imagePath: string;
  /** Já foi falado. `Entrar no ar` desmarca os pontos da pauta inteira. */
  done: boolean;
  /**
   * Profundidade do sub-ponto: 0 é ponto de topo, 1 e 2 são sub-pontos. A lista
   * continua plana e ordenada por `position`; o pai de um ponto é o anterior
   * mais próximo com `depth` menor. É estrutura visual, não regra de fluxo — o
   * Palco revela e marca um ponto por vez nesta mesma ordem, atravessando níveis.
   */
  depth: number;
  position: number;
}

export interface Block {
  id: string;
  rundownId: string;
  type: BlockType;
  title: string;
  /** Nota privada do apresentador: nunca renderiza na camada pública. */
  note: string;
  durationMinutes: number;
  /** Invariante do domínio: `type === 'rescue'` ⇒ `position === null`. */
  position: number | null;
  /** Item do acervo que originou este bloco, quando veio de lá. */
  libraryItemId: string | null;
  attachments: Attachment[];
  beats: Beat[];
}

export interface Rundown {
  id: string;
  title: string;
  /** Data da live em ISO curto (`AAAA-MM-DD`). */
  date: string;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string;
}

export interface RundownSummary extends Rundown {
  trackBlockCount: number;
  rescueBlockCount: number;
  plannedMinutes: number;
  openRunId: string | null;
  lastFinishedRunId: string | null;
}

export interface RunStep {
  id: string;
  runId: string;
  /** Pode apontar para um bloco já excluído: o trajeto guarda o snapshot (AC-clave-47). */
  blockId: string | null;
  blockTitle: string;
  blockType: BlockType;
  libraryItemId: string | null;
  startOffsetSeconds: number;
  actualSeconds: number | null;
  plannedSeconds: number;
  wasRescue: boolean;
  sequence: number;
}

export interface Run {
  id: string;
  rundownId: string | null;
  /** Snapshot do título: o relatório sobrevive à exclusão da pauta. */
  rundownTitle: string;
  startedAt: string;
  endedAt: string | null;
  steps: RunStep[];
}

export interface LibraryItem {
  id: string;
  title: string;
  /** Imutável depois da promoção: a etiqueta define a cor do item. */
  type: BlockType;
  airCount: number;
  lastAiredOn: string | null;
  createdAt: string;
  updatedAt: string;
  attachments: Attachment[];
  beats: Beat[];
}

/** Bloco cujo anexo local não foi encontrado no disco, devolvido pela checagem pré-live. */
export interface PreflightProblem {
  blockId: string;
  blockTitle: string;
  attachmentId: string;
  attachmentLabel: string;
  attachmentPath: string;
}

/**
 * Preferências de interface. Não são dado de produto (pauta, bloco, ponto,
 * anexo, execução, trajeto, acervo), mas moram no mesmo banco em disco:
 * AC-clave-40 proíbe `localStorage`, e o produto não abre exceção nem para
 * preferência.
 */
export interface Preferences {
  /** O tour de primeira abertura já foi visto; a partir daí ele só abre pelo `Como usar`. */
  tourSeen: boolean;
}
