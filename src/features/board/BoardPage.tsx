import { useEffect, useState } from 'react';
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { api } from '../../core/api';
import { navigate, routes } from '../../core/router';
import { COPY } from '../../core/vocabulary';
import { rescueBlocks, trackBlocks, useWorkspace } from '../../core/store';
import { ErrorBanner } from '../../ui/ErrorBanner';
import { LoadingSkeleton } from '../../ui/LoadingSkeleton';
import { useToast } from '../../ui/Toast';
import { EmptyStaffMark } from '../rundowns/EmptyStaffMark';
import { formatBrDate, formatMinutes } from '../rundowns/format';
import { OpenRunModal } from '../runs/OpenRunModal';
import { moveWithinTrack } from '../../../shared/track';
import type { Block, BlockType, Run } from '../../../shared/types';
import { TrackCanvas } from './TrackCanvas';
import { BlockDrawer } from './BlockDrawer';
import type { BlockDraft } from './BlockDrawer';
import type { AttachmentDraft } from './AttachmentFields';
import type { BeatDraft } from './BeatFields';
import './board.css';

interface RundownPayload {
  rundown: NonNullable<ReturnType<typeof useWorkspace.getState>['rundown']>;
  blocks: Block[];
}

type Drawer = { kind: 'none' } | { kind: 'create'; type: BlockType } | { kind: 'edit'; block: Block };

export function BoardPage({ rundownId }: { rundownId: string }) {
  const { rundown, blocks, status, error, open, apply, setBlocks } = useWorkspace();
  const [drawer, setDrawer] = useState<Drawer>({ kind: 'none' });
  const [writeError, setWriteError] = useState<{ action: string; error: unknown } | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [openRun, setOpenRun] = useState<Run | null>(null);
  const [postponedRunId, setPostponedRunId] = useState<string | null>(null);
  const [brokenBlockIds, setBrokenBlockIds] = useState<Set<string>>(() => new Set());
  const toast = useToast();

  // Um pequeno limiar separa clicar (abre a gaveta) de arrastar (reordena).
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => {
    void open(rundownId);
  }, [rundownId, open]);

  // A execução em aberto pertence a esta pauta: abrir a pauta pergunta o que
  // fazer com ela, e nenhuma das saídas descarta o trajeto.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const payload = await api.get<{ run: Run | null }>(`/api/rundowns/${rundownId}/open-run`);
        if (!cancelled) setOpenRun(payload.run);
      } catch {
        // A faixa de erro do carregamento da pauta já cobre a falha de leitura.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rundownId, rundown?.openRunId]);

  // A checagem pré-live também alimenta o alerta no cartão: o criador vê o
  // anexo quebrado enquanto compõe, não só no gate de entrar no ar.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const payload = await api.get<{ problems: { blockId: string }[] }>(
          `/api/rundowns/${rundownId}/preflight`
        );
        if (!cancelled) {
          setBrokenBlockIds(new Set(payload.problems.map((problem) => problem.blockId)));
        }
      } catch {
        // Sem checagem, os cartões ficam sem alerta; o gate ainda confere.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rundownId, blocks]);

  const track = trackBlocks(blocks);
  const deck = rescueBlocks(blocks);

  const applyOrder = async (orderedIds: string[], movedTitle: string, previousIds: string[]) => {
    // Aplicação otimista: a pauta já aparece na nova ordem antes da resposta.
    setBlocks(
      blocks.map((block) => {
        const index = orderedIds.indexOf(block.id);
        return index >= 0 ? { ...block, position: index } : block;
      })
    );
    try {
      setWriteError(null);
      const payload = await api.post<RundownPayload>(`/api/rundowns/${rundownId}/track/reorder`, {
        blockIds: orderedIds
      });
      apply(payload);
      toast.push(`"${movedTitle}" movido na pauta`, {
        label: COPY.common.undo,
        onSelect: () => void applyOrder(previousIds, movedTitle, orderedIds)
      });
    } catch (writeFailure) {
      setWriteError({ action: 'reordenar a pauta', error: writeFailure });
      await open(rundownId);
    }
  };

  const moveTo = (blockId: string, target: number) => {
    const previousIds = track.map((block) => block.id);
    const orderedIds = moveWithinTrack(track, blockId, target);
    const moved = track.find((block) => block.id === blockId);
    if (!moved) return;
    setAnnouncement(
      `"${moved.title}" movido para a posição ${target + 1} de ${track.length} na pauta.`
    );
    void applyOrder(orderedIds, moved.title, previousIds);
  };

  const onDragEnd = (event: DragEndEvent) => {
    const target = event.over?.data.current?.index;
    if (typeof target !== 'number') return;
    const blockId = String(event.active.id);
    const current = track.findIndex((block) => block.id === blockId);
    if (current < 0 || current === target) return;
    moveTo(blockId, target);
  };

  const runWrite = async (action: string, work: () => Promise<RundownPayload>) => {
    try {
      setWriteError(null);
      apply(await work());
    } catch (failure) {
      setWriteError({ action, error: failure });
      throw failure;
    }
  };

  const saveBlock = async (
    draft: BlockDraft,
    attachments: AttachmentDraft[],
    beats: BeatDraft[]
  ) => {
    const editing = drawer.kind === 'edit' ? drawer.block : null;
    // Bloco, anexos e pontos vão numa escrita só: ou tudo grava, ou nada é dado
    // como salvo e o que o criador digitou continua na gaveta.
    const body = { ...draft, attachments, beats };
    const payload = editing
      ? await api.patch<RundownPayload>(`/api/blocks/${editing.id}`, body)
      : await api.post<RundownPayload>('/api/blocks', { ...body, rundownId });

    apply(payload);
    setDrawer({ kind: 'none' });
    toast.push(editing ? 'Bloco salvo' : 'Bloco criado na pauta');
  };

  if (status === 'error') {
    return (
      <div className="pagina">
        <ErrorBanner action="abrir a pauta" error={error} onRetry={() => void open(rundownId)} />
        <button type="button" className="btn btn-suave" onClick={() => navigate(routes.rundowns())}>
          {COPY.nav.backToRundowns}
        </button>
      </div>
    );
  }

  if (!rundown || rundown.id !== rundownId) return <LoadingSkeleton />;

  const plannedMinutes = track.reduce((total, block) => total + block.durationMinutes, 0);
  const editing = drawer.kind === 'edit' ? drawer.block : null;

  return (
    <div className="bancada">
      <div className="bancada-topo">
        <button type="button" className="voltar" onClick={() => navigate(routes.rundowns())}>
          {COPY.nav.backToRundowns}
        </button>
        <div className="eyebrow batuta">
          {COPY.board.eyebrow(formatBrDate(rundown.date), formatMinutes(plannedMinutes))}
        </div>
        <h1>{rundown.title}</h1>
        {writeError ? <ErrorBanner action={writeError.action} error={writeError.error} /> : null}
      </div>

      <div className="canvas" data-testid="bancada-canvas">
        {track.length || deck.length ? (
          <DndContext sensors={sensors} onDragEnd={onDragEnd}>
            <TrackCanvas
              track={track}
              deck={deck}
              brokenBlockIds={brokenBlockIds}
              onCreate={(type) => setDrawer({ kind: 'create', type })}
              onEdit={(block) => setDrawer({ kind: 'edit', block })}
            />
          </DndContext>
        ) : (
          <div className="vazio bancada-vazia" data-testid="estado-vazio-bancada">
            <EmptyStaffMark />
            <h2>{COPY.board.emptyTitle}</h2>
            <p>{COPY.board.emptyBody}</p>
            <button
              type="button"
              className="btn btn-ar"
              data-testid="criar-primeiro-bloco"
              onClick={() => setDrawer({ kind: 'create', type: 'topic' })}
            >
              {COPY.board.emptyCta}
            </button>
          </div>
        )}
      </div>

      {/* Equivalente por teclado do arraste, anunciado para leitores de tela. */}
      <div className="visualmente-oculto" role="status" aria-live="polite" data-testid="anuncio-pauta">
        {announcement}
      </div>

      {openRun && openRun.id !== postponedRunId ? (
        <OpenRunModal
          run={openRun}
          onPostpone={() => setPostponedRunId(openRun.id)}
          onResume={() => navigate(`${routes.stage(rundownId)}?run=${openRun.id}`)}
          onFinishRetroactively={() =>
            void (async () => {
              try {
                setWriteError(null);
                await api.post(`/api/runs/${openRun.id}/finish`, { retroactive: true });
                setOpenRun(null);
                await open(rundownId);
                toast.push('Execução encerrada com o último passo registrado', {
                  label: 'Ver relatório',
                  onSelect: () => navigate(routes.report(openRun.id))
                });
              } catch (failure) {
                setWriteError({ action: 'encerrar a execução em aberto', error: failure });
              }
            })()
          }
        />
      ) : null}

      {drawer.kind !== 'none' ? (
        <BlockDrawer
          key={editing?.id ?? `novo-${drawer.kind === 'create' ? drawer.type : ''}`}
          block={editing}
          initialType={drawer.kind === 'create' ? drawer.type : (editing?.type ?? 'topic')}
          trackLength={track.length}
          currentPosition={editing?.position ?? null}
          onSave={saveBlock}
          onMoveTo={
            editing && editing.position !== null
              ? (position) => {
                  setDrawer({ kind: 'none' });
                  moveTo(editing.id, position);
                }
              : undefined
          }
          onArchive={
            editing
              ? () =>
                  void (async () => {
                    try {
                      setWriteError(null);
                      await api.post('/api/library', { blockId: editing.id });
                      setDrawer({ kind: 'none' });
                      toast.push(`"${editing.title}" guardado no acervo`, {
                        label: 'Ver acervo',
                        onSelect: () => navigate(routes.library())
                      });
                    } catch (failure) {
                      setWriteError({ action: 'guardar o bloco no acervo', error: failure });
                    }
                  })()
              : undefined
          }
          onDelete={
            editing
              ? () =>
                  void runWrite('excluir o bloco', async () => {
                    const payload = await api.delete<RundownPayload>(`/api/blocks/${editing.id}`);
                    setDrawer({ kind: 'none' });
                    toast.push('Bloco excluído');
                    return payload;
                  })
              : undefined
          }
          onDismiss={() => setDrawer({ kind: 'none' })}
        />
      ) : null}
    </div>
  );
}
