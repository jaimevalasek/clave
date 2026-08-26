import type { BlockType } from '../../shared/types';

/**
 * Fonte única do mapa tipo→metal (identity.md): a cor codifica o tipo do bloco em
 * toda superfície onde ele existe — Bancada, selo do Palco, barra do cronômetro,
 * mini-pauta, linha do relatório e carta do deck. O ouro fica com marca, ação
 * primária e gate: nenhum tipo o toma para si.
 */
export interface TypeMetal {
  /** Rótulo de interface, em pt-BR (vocabulário canônico). */
  label: string;
  /** Token CSS correspondente. */
  token: string;
  /** Valor literal, para SVG e estilos inline que não aceitam `var()`. */
  hex: string;
}

export const TYPE_METALS: Record<BlockType, TypeMetal> = {
  topic: { label: 'Tema', token: 'var(--tema)', hex: '#D8895B' },
  media: { label: 'Mídia', token: 'var(--midia)', hex: '#B49BD8' },
  interaction: { label: 'Interação', token: 'var(--interacao)', hex: '#C9697A' },
  guest: { label: 'Convidado', token: 'var(--convidado)', hex: '#B3C2D6' },
  rescue: { label: 'Resgate', token: 'var(--resgate)', hex: '#6EC6A2' }
};

export function metalOf(type: BlockType): TypeMetal {
  return TYPE_METALS[type] ?? TYPE_METALS.topic;
}
