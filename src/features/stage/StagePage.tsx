import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../core/api';
import { COPY, VOCABULARY } from '../../core/vocabulary';
import { rescueBlocks, trackBlocks, useWorkspace } from '../../core/store';
import { formatTimecode } from '../../../shared/time';
import { ErrorBanner } from '../../ui/ErrorBanner';
import { LoadingSkeleton } from '../../ui/LoadingSkeleton';
import { Modal } from '../../ui/Modal';
import { useToast } from '../../ui/Toast';
import { metalOf } from '../../ui/typeColors';
import type { Attachment, Block, Beat, Run } from '../../../shared/types';
import { isWebUrl } from '../../../shared/validation/attachment';
import { AttachmentViewer } from '../attachments/AttachmentViewer';
import { PrivatePanel } from '../attachments/PrivatePanel';
import { PrivateNote } from './PrivateNote';
import { RescueDeck } from './RescueDeck';
import { StageTimers } from './StageTimers';
import { drawRescue, isInRescue, trackIndexToResume, usedRescueIds } from './rescue';
import { beatToAdvance, beatToRewind, doneCount, remainingSeconds, revealedBeats } from './beats';
import { StageBeats } from './StageBeats';
import { StageCarousel } from './StageCarousel';
import { landingSlideIndex, nextSlideIndex, previousSlideIndex } from './slides';
import { useRunClock } from './useRunClock';
import { useStageShortcuts } from './useStageShortcuts';
import './stage.css';

interface StagePageProps {
  rundownId: string;
  runId: string;
  onLeave(): void;
  onFinished(runId: string): void;
}

/**
 * D-03 · Palavra viva: a última palavra fala em serif itálico no metal do bloco.
 *
 * O espaço vai **entre** os `<span>`, nunca dentro deles: `.palavra` é
 * `inline-block`, e espaço na borda de uma caixa inline-block é descartado na
 * renderização — o título saía com as palavras coladas.
 */
function LiveTitle({ block }: { block: Block }) {
  const words = block.title.split(/\s+/).filter(Boolean);
  const hex = metalOf(block.type).hex;
  return (
    <h1 className="titulo-gigante" data-testid="titulo-palco">
      {words.map((word, index) => {
        const last = index === words.length - 1;
        return (
          <Fragment key={`${word}-${index}`}>
            <span
              className={`palavra${last ? ' viva' : ''}`}
              style={{ animationDelay: `${index * 35}ms`, color: last ? hex : undefined }}
            >
              {word}
            </span>
            {last ? null : ' '}
          </Fragment>
        );
      })}
    </h1>
  );
}

export function StagePage({ rundownId, runId, onLeave, onFinished }: StagePageProps) {
  const { rundown, blocks, status, error, open } = useWorkspace();
  const [run, setRun] = useState<Run | null>(null);
  const [noteVisible, setNoteVisible] = useState(false);
  const [confirmingFinish, setConfirmingFinish] = useState(false);
  const [fullscreenAttachment, setFullscreenAttachment] = useState<Attachment | null>(null);
  const [privateAttachment, setPrivateAttachment] = useState<Attachment | null>(null);
  const [brokenAttachmentIds, setBrokenAttachmentIds] = useState<Set<string>>(() => new Set());
  const [writeError, setWriteError] = useState<{ action: string; error: unknown } | null>(null);
  const [flash, setFlash] = useState('');
  const [slideIndex, setSlideIndex] = useState(0);
  const [timersOpen, setTimersOpen] = useState(false);
  const slideLanding = useRef<'start' | 'end'>('start');
  const toast = useToast();

  // O Palco é a tela que o OBS captura: avisos pendentes da Bancada não entram
  // nela. O retorno das ações do Palco é o próprio `.flash-palco`.
  useEffect(() => {
    toast.clear();
  }, [toast]);

  useEffect(() => {
    if (!rundown || rundown.id !== rundownId) void open(rundownId);
  }, [rundownId, rundown, open]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const payload = await api.get<{ run: Run }>(`/api/runs/${runId}`);
        if (!cancelled) setRun(payload.run);
      } catch (failure) {
        if (!cancelled) setWriteError({ action: 'abrir a execução', error: failure });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [runId]);

  // A mesma checagem pré-live marca o anexo quebrado dentro do Palco.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const payload = await api.get<{ problems: { attachmentId: string }[] }>(
          `/api/rundowns/${rundownId}/preflight`
        );
        if (!cancelled) {
          setBrokenAttachmentIds(new Set(payload.problems.map((problem) => problem.attachmentId)));
        }
      } catch {
        // Sem a checagem, o anexo ainda mostra erro na hora de abrir.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rundownId]);

  const track = useMemo(() => trackBlocks(blocks), [blocks]);
  const deck = useMemo(() => rescueBlocks(blocks), [blocks]);
  const used = useMemo(() => usedRescueIds(run), [run]);
  const inRescue = isInRescue(run);
  const trackIndex = trackIndexToResume(run, track);

  const currentStep = run?.steps[run.steps.length - 1] ?? null;
  const current =
    blocks.find((block) => block.id === currentStep?.blockId) ?? track[trackIndex] ?? null;
  const next = inRescue ? (track[trackIndex] ?? null) : (track[trackIndex + 1] ?? null);
  const clock = useRunClock(run);

  useEffect(() => {
    const count = current?.attachments.length ?? 0;
    setSlideIndex(landingSlideIndex(count, slideLanding.current));
    slideLanding.current = 'start';
  }, [current?.id]);

  const write = useCallback(
    async (action: string, work: () => Promise<{ run: Run }>) => {
      try {
        setWriteError(null);
        const payload = await work();
        setRun(payload.run);
        return payload.run;
      } catch (failure) {
        setWriteError({ action, error: failure });
        return null;
      }
    },
    []
  );

  /**
   * Marcar o ponto é escrita de verdade — o estado mora no banco, e por isso
   * recarregar o Palco no meio da live devolve o checklist onde ele estava.
   *
   * A tela muda antes da resposta de propósito: numa live o criador aperta
   * espaço duas vezes em sequência, e esperar a gravação faria o segundo avanço
   * reler o ponto ainda não marcado e se perder. Se a gravação falhar, a faixa
   * de erro aparece e o estado real volta do disco.
   */
  const setBeatDone = useCallback(
    async (beat: Beat, done: boolean) => {
      const { blocks: current, setBlocks, refresh } = useWorkspace.getState();
      setBlocks(
        current.map((block) => ({
          ...block,
          beats: block.beats.map((entry) => (entry.id === beat.id ? { ...entry, done } : entry))
        }))
      );
      try {
        setWriteError(null);
        await api.patch(`/api/beats/${beat.id}`, { done });
      } catch (failure) {
        setWriteError({ action: 'marcar o ponto', error: failure });
        await refresh();
      }
    },
    []
  );

  const goToBlock = useCallback(
    (block: Block) => write('registrar o passo no trajeto', () =>
      api.post<{ run: Run }>(`/api/runs/${runId}/steps`, { blockId: block.id })
    ),
    [runId, write]
  );

  const finishRun = useCallback(async () => {
    const finished = await write('encerrar a live', () =>
      api.post<{ run: Run }>(`/api/runs/${runId}/finish`, {})
    );
    if (finished) onFinished(finished.id);
  }, [runId, write, onFinished]);

  const advance = useCallback(() => {
    // O avanço percorre primeiro os pontos do bloco no ar; em seguida as
    // páginas de anexo; só quando elas acabam a live troca de bloco.
    const nextBeat = beatToAdvance(current);
    if (nextBeat) {
      void setBeatDone(nextBeat, true);
      return;
    }
    const nextSlide = nextSlideIndex(slideIndex, current?.attachments.length ?? 0);
    if (nextSlide !== null) {
      setSlideIndex(nextSlide);
      return;
    }
    // Sair do resgate devolve ao ponto exato da pauta, sem passo manual.
    slideLanding.current = 'start';
    if (inRescue) {
      const back = track[trackIndex];
      if (back) {
        void goToBlock(back);
        setFlash('De volta à pauta, onde você parou');
      }
      return;
    }
    const following = track[trackIndex + 1];
    if (!following) {
      setConfirmingFinish(true);
      return;
    }
    void goToBlock(following);
  }, [current, setBeatDone, slideIndex, inRescue, track, trackIndex, goToBlock]);

  const back = useCallback(() => {
    const prevSlide = previousSlideIndex(slideIndex);
    if (prevSlide !== null) {
      setSlideIndex(prevSlide);
      return;
    }
    const lastBeat = beatToRewind(current);
    if (lastBeat) {
      void setBeatDone(lastBeat, false);
      return;
    }
    slideLanding.current = 'end';
    if (inRescue) {
      const target = track[trackIndex];
      if (target) void goToBlock(target);
      return;
    }
    const previous = track[trackIndex - 1];
    if (previous) void goToBlock(previous);
  }, [current, setBeatDone, slideIndex, inRescue, track, trackIndex, goToBlock]);

  const draw = useCallback(
    (card?: Block) => {
      const chosen = card ?? drawRescue(deck, used);
      if (!chosen) {
        setFlash('Deck vazio: nenhum resgate disponível');
        return;
      }
      void goToBlock(chosen);
    },
    [deck, used, goToBlock]
  );

  const closeOverlays = useCallback(() => {
    setFullscreenAttachment(null);
    setPrivateAttachment(null);
    setConfirmingFinish(false);
  }, []);

  /**
   * Ação por tipo: vídeo, imagem, link e arquivo abrem; código e chat copiam,
   * com confirmação visível da cópia. Link (e arquivo cuja origem já é web)
   * abre no navegador do sistema — o webview do Play não segue target=_blank.
   */
  const openAttachment = useCallback(
    async (attachment: Attachment) => {
      if (attachment.type === 'code' || attachment.type === 'chat') {
        try {
          await navigator.clipboard.writeText(attachment.content);
          setFlash(`"${attachment.label}" copiado para a área de transferência`);
        } catch {
          setFlash(`Não foi possível copiar "${attachment.label}" automaticamente`);
        }
        return;
      }
      if (attachment.type === 'link' || (attachment.type === 'file' && isWebUrl(attachment.path))) {
        try {
          await api.post('/api/open-url', { url: attachment.path });
          setFlash(`"${attachment.label}" aberto no navegador`);
        } catch {
          setFlash(`Não foi possível abrir "${attachment.label}" no navegador`);
        }
        return;
      }
      // Com `telaCheia`, o anexo toma a tela capturada; sem ela, abre no painel
      // privado, que nunca é renderizado na camada pública.
      if (attachment.fullscreen) setFullscreenAttachment(attachment);
      else setPrivateAttachment(attachment);
    },
    []
  );

  const overlayOpen = confirmingFinish || Boolean(fullscreenAttachment) || Boolean(privateAttachment);

  useStageShortcuts({
    advance,
    back,
    drawRescue: () => draw(),
    finish: () => setConfirmingFinish(true),
    setNoteVisible,
    overlayOpen,
    closeOverlay: closeOverlays,
    enabled: Boolean(run) && !run?.endedAt
  });

  if (status === 'error') {
    return (
      <div className="pagina">
        <ErrorBanner action="abrir a pauta" error={error} onRetry={() => void open(rundownId)} />
      </div>
    );
  }
  if (!run || !rundown || rundown.id !== rundownId || !current) return <LoadingSkeleton />;

  const metal = metalOf(current.type);
  const beats = revealedBeats(current);
  const spoken = doneCount(current);
  const remaining = remainingSeconds(
    track,
    trackIndex,
    inRescue,
    clock.blockSeconds,
    clock.plannedSeconds
  );

  return (
    <div
      className={`palco${fullscreenAttachment ? ' com-tomada' : ''}`}
      data-testid="palco"
    >
      <div
        className="poeira"
        style={{ ['--neb' as string]: `${metal.hex}1a` }}
        aria-hidden="true"
        data-testid="poeira"
      />

      <div className="palco-topo">
        <button
          type="button"
          className="sair-palco"
          data-testid="acao-sair-palco"
          title="Volta à Bancada sem encerrar a live: a execução fica em aberto"
          onClick={onLeave}
        >
          {COPY.nav.backToBoard}
        </button>

        <div className="mini-pauta" data-testid="mini-pauta" aria-label="progresso da pauta">
          {track.map((block, index) => (
            <i
              key={block.id}
              title={block.title}
              className={`${index < trackIndex ? 'feito' : ''} ${
                index === trackIndex && !inRescue ? 'agora' : ''
              }`}
              style={{ background: index <= trackIndex ? metalOf(block.type).hex : undefined }}
            />
          ))}
          {inRescue ? (
            <i
              className="agora"
              title={VOCABULARY.rescue}
              style={{ background: metalOf('rescue').hex, maxWidth: '34px' }}
            />
          ) : null}
        </div>

        <div className="relogio-wrap">
          <button
            type="button"
            className="mostrar-tempos"
            data-testid="acao-mostrar-tempos"
            aria-expanded={timersOpen}
            aria-controls="lateral-tempos"
            onClick={() => setTimersOpen((open) => !open)}
          >
            {timersOpen ? 'esconder' : 'tempos'}
          </button>
          <span className="no-ar">no ar</span>
          <div className="relogio-global mono" data-testid="relogio-global">
            {formatTimecode(clock.elapsedSeconds)}
          </div>
        </div>
      </div>

      <div className={`palco-centro${timersOpen ? ' com-tempos' : ''}`}>
        <div className="bloco-atual" data-testid="palco-bloco-atual">
          {inRescue ? <span className="selo-resgate">RESGATE</span> : null}
          <div className="selo-tipo batuta" style={{ color: metal.token }}>
            {metal.label}
          </div>
          <LiveTitle block={current} />

          <StageBeats
            beats={beats}
            spoken={spoken}
            brokenIds={brokenAttachmentIds}
            onToggle={(beat) => void setBeatDone(beat, !beat.done)}
          />

          {current.attachments.length ? (
            <StageCarousel
              attachments={current.attachments}
              index={slideIndex}
              brokenIds={brokenAttachmentIds}
              onPrev={() => {
                const prev = previousSlideIndex(slideIndex);
                if (prev !== null) setSlideIndex(prev);
              }}
              onNext={() => {
                const nextPage = nextSlideIndex(slideIndex, current.attachments.length);
                if (nextPage !== null) setSlideIndex(nextPage);
              }}
              onOpen={(attachment) => void openAttachment(attachment)}
              onCopy={(attachment) => {
                setFlash(`Link de "${attachment.label}" copiado para a área de transferência`);
              }}
            />
          ) : null}

        </div>

        {timersOpen ? (
          <StageTimers
            clock={clock}
            currentType={current.type}
            next={next}
            inRescue={inRescue}
            remainingSeconds={remaining}
          />
        ) : null}
      </div>

      <div className="palco-rodape">
        <RescueDeck deck={deck} usedIds={used} currentType={current.type} onDraw={(card) => draw(card)} />

        <div className="rodape-linha">
          <div className="atalhos-dica">
            <span className="tecla">espaço</span> avança · <span className="tecla">←</span> volta ·{' '}
            <span className="tecla">R</span> resgate · <span className="tecla">N</span> segure p/ suas
            notas · <span className="tecla">Esc</span> encerra a live
          </div>

          {/* Cada atalho tem controle clicável equivalente, alcançável por Tab. */}
          <div className="controles-palco" role="group" aria-label="Controles do Palco">
            <button type="button" className="botao-palco" data-testid="acao-voltar" onClick={back}>
              ← voltar
            </button>
            <button type="button" className="botao-palco" data-testid="acao-avancar" onClick={advance}>
              avançar →
            </button>
            <button
              type="button"
              className="botao-palco"
              data-testid="acao-sacar-resgate"
              onClick={() => draw()}
            >
              sacar resgate
            </button>
            <button
              type="button"
              className="botao-palco"
              data-testid="acao-mostrar-notas"
              onPointerDown={() => setNoteVisible(true)}
              onPointerUp={() => setNoteVisible(false)}
              onPointerLeave={() => setNoteVisible(false)}
            >
              segure para ver as suas notas
            </button>
            <button
              type="button"
              className="botao-palco"
              data-testid="acao-encerrar"
              onClick={() => setConfirmingFinish(true)}
            >
              encerrar live
            </button>
          </div>
        </div>

        {flash ? (
          <div className="flash-palco" role="status" data-testid="flash-palco">
            {flash}
          </div>
        ) : null}

        {writeError ? <ErrorBanner action={writeError.action} error={writeError.error} /> : null}
      </div>

      {/* A camada privada é irmã das três faixas, nunca filha de uma delas: dentro
          de `.palco-centro` ela ficaria presa naquele contexto de empilhamento e o
          rodapé, que vem depois no DOM, pintaria as cartas por cima da nota. */}
      {noteVisible ? (
        <PrivateNote
          note={current.note}
          type={current.type}
          overrunSeconds={Math.max(0, clock.blockSeconds - clock.plannedSeconds)}
          formatTimecode={formatTimecode}
        />
      ) : null}

      {fullscreenAttachment ? (
        <AttachmentViewer
          attachment={fullscreenAttachment}
          onClose={() => setFullscreenAttachment(null)}
        />
      ) : null}

      {privateAttachment ? (
        <PrivatePanel attachment={privateAttachment} onClose={() => setPrivateAttachment(null)} />
      ) : null}

      {confirmingFinish ? (
        <Modal
          title="Encerrar a live?"
          consequence="O trajeto é gravado e o relatório de planejado × tocado fica pronto. Esta ação fecha a execução. Dá para revê-la no relatório, mas não continuar."
          onDismiss={() => setConfirmingFinish(false)}
          actions={[
            { label: 'Continuar no ar' },
            { label: 'Encerrar live', intent: 'perigo', onSelect: () => void finishRun() }
          ]}
        />
      ) : null}
    </div>
  );
}
