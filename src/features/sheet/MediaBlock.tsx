import { useCallback, useEffect, useRef, useState } from 'react';
import { mediaUrl } from '../../core/api';
import { COPY } from '../../core/vocabulary';
import { AlertIcon, PauseIcon, PlayIcon } from '../../ui/icons';
import { useToast } from '../../ui/Toast';
import { baseName } from '../../../shared/media';
import { ACCEPTED_FILES, replaceMissingMedia, retryIntake } from './mediaIntake';
import { markPlaying, markStopped, pauseMedia, registerMedia, toggleMedia, usePlayback } from './mediaPlayback';
import type { DraftBlock, IntakeFailure } from './sheetStore';
import { requestDelete } from './structureOps';
import './media.css';

/** "Gravando {nome} na pasta de mídia" with the progress (AC-pauta-revelavel-16). */
function UploadingCard({ fileName, progress }: { fileName: string; progress: number }) {
  return (
    <div className="uploading" data-state="loading" aria-busy="true" data-testid="media-uploading">
      <div className="uploading-head">
        <span>{COPY.sheet.uploading(fileName)}</span>
        <span>{progress}%</span>
      </div>
      <progress max={100} value={progress} aria-label={COPY.sheet.uploadingLabel(fileName)} />
    </div>
  );
}

type FailureReason = IntakeFailure | 'missing';

function failureCopy(reason: FailureReason, fileName: string, bytes: number): [string, string] {
  if (reason === 'missing') return [COPY.sheet.missingTitle, COPY.sheet.missingText(fileName)];
  if (reason === 'unsupported') return [COPY.sheet.unsupportedTitle, COPY.sheet.unsupportedText(fileName)];
  if (reason === 'too-large') return [COPY.sheet.tooLargeTitle, COPY.sheet.tooLargeText(fileName, bytes)];
  return [COPY.sheet.writeFailedTitle, COPY.sheet.writeFailedText(fileName)];
}

/** "Procurar o arquivo": a file picker whose choice takes the block's place (AC-pauta-revelavel-34). */
function BrowseButton({ blockKey }: { blockKey: string }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <button type="button" className="btn" onClick={() => input.current?.click()}>
        {COPY.sheet.browseFile}
      </button>
      <input
        ref={input}
        type="file"
        hidden
        accept={ACCEPTED_FILES}
        data-testid="media-browse-input"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = '';
          if (file) replaceMissingMedia(blockKey, file);
        }}
      />
    </>
  );
}

/**
 * A failure shown in the block itself, never an empty block: the column and
 * the shortcuts keep working around it (AC-pauta-revelavel-18, -34).
 * "Remover bloco" takes it out without confirmation (BR-pauta-revelavel-10).
 */
function FailureCard({ block, reason, fileName, bytes = 0 }: { block: DraftBlock; reason: FailureReason; fileName: string; bytes?: number }) {
  const [title, text] = failureCopy(reason, fileName, bytes);
  return (
    <div className="failure" data-state="error" role="alert" data-testid="media-failure" data-reason={reason}>
      <AlertIcon />
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
        <div className="failure-actions">
          {block.mediaMissing ? <BrowseButton blockKey={block.key} /> : null}
          {reason === 'write-failed' ? (
            <button type="button" className="btn" onClick={() => retryIntake(block.key)}>
              {COPY.common.retry}
            </button>
          ) : null}
          <button type="button" className="btn" onClick={() => requestDelete(block.key)}>
            {COPY.sheet.removeBlock}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * The player of one video or audio block: still until the presenter plays it,
 * and paused as soon as the block leaves the screen (AC-pauta-revelavel-33).
 */
function usePlayer(key: string, active: boolean) {
  const toast = useToast();
  const playing = usePlayback((state) => state.playingKey === key);
  const ref = useCallback((element: HTMLMediaElement | null) => registerMedia(key, element), [key]);
  useEffect(() => {
    if (!active) pauseMedia(key);
  }, [active, key]);
  const toggle = () => {
    toggleMedia(key).catch(() => toast.push(COPY.sheet.playRefused));
  };
  const events = {
    onPlay: () => markPlaying(key),
    onPause: () => markStopped(key),
    onEnded: () => markStopped(key)
  };
  return { playing, ref, toggle, events };
}

function PlayButton({ kind, playing, onToggle }: { kind: 'video' | 'audio'; playing: boolean; onToggle: () => void }) {
  const label =
    kind === 'video'
      ? playing
        ? COPY.sheet.pauseVideo
        : COPY.sheet.playVideo
      : playing
        ? COPY.sheet.pauseAudio
        : COPY.sheet.playAudio;
  return (
    <button
      type="button"
      className="play"
      aria-label={label}
      title={label}
      aria-keyshortcuts="Control+Enter"
      data-testid="media-play"
      data-playing={playing}
      onClick={onToggle}
    >
      {playing ? <PauseIcon /> : <PlayIcon />}
    </button>
  );
}

function Caption({ label, name, playable = false }: { label: string; name: string; playable?: boolean }) {
  return (
    <figcaption className="caption">
      <span>{label}</span>
      <span className="caption-name">{name}</span>
      {playable ? (
        <>
          <span className="caption-spacer" />
          <span className="caption-shortcut">{COPY.sheet.playShortcut}</span>
        </>
      ) : null}
    </figcaption>
  );
}

/** Bars of the audio wave: a fixed drawing that fills with the accent as it plays. */
const WAVE_BARS = Array.from({ length: 48 }, (_, index) =>
  Math.round(18 + 30 * Math.abs(Math.sin(index * 1.7) * Math.cos(index * 0.37)))
);

function VideoMedia({ block, active }: { block: DraftBlock; active: boolean }) {
  const player = usePlayer(block.key, active);
  return (
    <figure className="media" data-testid="media-video">
      <video ref={player.ref} src={mediaUrl(block.mediaPath)} preload="metadata" playsInline {...player.events} />
      <PlayButton kind="video" playing={player.playing} onToggle={player.toggle} />
      <Caption label={COPY.sheet.videoCaption} name={block.mediaName} playable />
    </figure>
  );
}

function AudioMedia({ block, active }: { block: DraftBlock; active: boolean }) {
  const player = usePlayer(block.key, active);
  const [played, setPlayed] = useState(0);
  return (
    <figure className="media" data-testid="media-audio">
      <audio
        ref={player.ref}
        src={mediaUrl(block.mediaPath)}
        preload="metadata"
        {...player.events}
        onTimeUpdate={(event) => {
          const { currentTime, duration } = event.currentTarget;
          setPlayed(duration ? currentTime / duration : 0);
        }}
        onEnded={() => {
          setPlayed(0);
          player.events.onEnded();
        }}
      />
      <div className="audio">
        <PlayButton kind="audio" playing={player.playing} onToggle={player.toggle} />
        <div className="wave" aria-hidden="true">
          {WAVE_BARS.map((height, index) => (
            <span key={index} className={index / WAVE_BARS.length < played ? 'played' : undefined} style={{ height }} />
          ))}
        </div>
      </div>
      <Caption label={COPY.sheet.audioCaption} name={block.mediaName} playable />
    </figure>
  );
}

/**
 * The content of a media block: the image, the video or the audio with its
 * player; while the file is being written, the progress; when it failed or
 * left the media folder, the failure in its place.
 */
export function MediaBlock({ block, active }: { block: DraftBlock; active: boolean }) {
  const { intake } = block;
  if (intake?.state === 'uploading') return <UploadingCard fileName={intake.fileName} progress={intake.progress} />;
  if (intake?.state === 'failed') {
    return <FailureCard block={block} reason={intake.reason} fileName={intake.fileName} bytes={intake.bytes} />;
  }
  if (block.mediaMissing) return <FailureCard block={block} reason="missing" fileName={block.mediaName || baseName(block.mediaPath)} />;
  if (block.kind === 'video') return <VideoMedia block={block} active={active} />;
  if (block.kind === 'audio') return <AudioMedia block={block} active={active} />;
  return (
    <figure className="media" data-testid="media-image">
      <img src={mediaUrl(block.mediaPath)} alt={block.mediaName} />
      <Caption label={COPY.sheet.imageCaption} name={block.mediaName} />
    </figure>
  );
}
