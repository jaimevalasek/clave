import { create } from 'zustand';
import { api } from './api';
import type { Block, RundownSummary } from '../../shared/types';

interface RundownPayload {
  rundown: RundownSummary;
  blocks: Block[];
}

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

interface WorkspaceState {
  /** Pauta aberta no momento — a que a Bancada, o Palco e a barra superior leem. */
  rundown: RundownSummary | null;
  blocks: Block[];
  status: LoadStatus;
  error: unknown;
  /** Carrega a pauta e marca como última usada; é o que o boot reabre. */
  open(rundownId: string): Promise<void>;
  /** Recarrega a pauta aberta sem mexer na marca de última usada. */
  refresh(): Promise<void>;
  /** Aplica uma resposta de escrita que já devolveu pauta e blocos. */
  apply(payload: RundownPayload): void;
  /** Troca a lista de blocos localmente (aplicação otimista do arraste). */
  setBlocks(blocks: Block[]): void;
  clear(): void;
}

export const useWorkspace = create<WorkspaceState>((set, get) => ({
  rundown: null,
  blocks: [],
  status: 'idle',
  error: null,

  async open(rundownId) {
    set({ status: 'loading', error: null });
    try {
      await api.post(`/api/rundowns/${rundownId}/open`);
      const payload = await api.get<RundownPayload>(`/api/rundowns/${rundownId}`);
      set({ rundown: payload.rundown, blocks: payload.blocks, status: 'ready', error: null });
    } catch (error) {
      set({ status: 'error', error });
    }
  },

  async refresh() {
    const current = get().rundown;
    if (!current) return;
    try {
      const payload = await api.get<RundownPayload>(`/api/rundowns/${current.id}`);
      set({ rundown: payload.rundown, blocks: payload.blocks, status: 'ready', error: null });
    } catch (error) {
      set({ status: 'error', error });
    }
  },

  apply(payload) {
    set({ rundown: payload.rundown, blocks: payload.blocks, status: 'ready', error: null });
  },

  setBlocks(blocks) {
    set({ blocks });
  },

  clear() {
    set({ rundown: null, blocks: [], status: 'idle', error: null });
  }
}));

/** Blocos da pauta, na ordem da live (de cima para baixo). */
export function trackBlocks(blocks: Block[]): Block[] {
  return blocks
    .filter((block) => block.type !== 'rescue')
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}

/** Cartas do deck: os blocos de resgate, fora da ordem da pauta. */
export function rescueBlocks(blocks: Block[]): Block[] {
  return blocks.filter((block) => block.type === 'rescue');
}
