import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, RefObject } from 'react';
import { ApiError, api } from '../../core/api';
import { COPY } from '../../core/vocabulary';
import { CloseIcon } from '../../ui/icons';
import { MAX_MEDIA_BYTES, mediaKindForName } from '../../../shared/media';
import { BACKGROUND_KINDS, GRADIENT_IDS, THEME_IDS } from '../../../shared/types';
import type { BackgroundKind, GradientId, ImageBackground } from '../../../shared/types';
import { accentOf } from './applyAppearance';
import { changeAppearance, setPanelOpen, useAppearance } from './appearanceStore';
import { MIN_CONTRAST, contrastRatio, formatRatio } from './contrast';
import { FramePicker } from './FramePicker';
import { DEFAULT_BACKGROUND_COLOR, GRADIENTS, THEMES } from './themes';
import './appearance.css';

const IMAGE_ACCEPT = 'image/png,image/jpeg,image/gif,image/webp,.png,.jpg,.jpeg,.gif,.webp';

/** The five ready themes; choosing one goes back to its own accent. */
function ThemeSection() {
  const theme = useAppearance((state) => state.theme);
  return (
    <section>
      <h3>{COPY.appearance.themeHeading}</h3>
      <div className="themes" role="radiogroup" aria-label={COPY.appearance.themeHeading}>
        {THEME_IDS.map((id) => {
          const palette = THEMES[id];
          const swatch = { background: palette.sheet, '--swatch-ink': palette.ink, '--swatch-accent': palette.accent } as CSSProperties;
          return (
            <button
              key={id}
              type="button"
              className="theme"
              role="radio"
              aria-checked={id === theme}
              data-theme-id={id}
              onClick={() => changeAppearance({ theme: id, accent: null })}
            >
              <span className="swatch" style={swatch} aria-hidden="true" />
              <span>
                <b>{COPY.appearance.themes[id].name}</b>
                <small>{COPY.appearance.themes[id].note}</small>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/** Free accent with the contrast against the sheet; below 4.5:1 it warns (AC-pauta-revelavel-46). */
function AccentSection() {
  const theme = useAppearance((state) => state.theme);
  const accent = useAppearance((state) => state.accent);
  const shown = accentOf({ theme, accent });
  const ratio = contrastRatio(shown, THEMES[theme].sheet);
  const low = ratio < MIN_CONTRAST;
  return (
    <section>
      <h3>{COPY.appearance.accentHeading}</h3>
      <div className="color-row">
        <input
          type="color"
          value={shown.toLowerCase()}
          aria-label={COPY.appearance.accentPick}
          data-testid="accent-input"
          onChange={(event) => changeAppearance({ accent: event.target.value.toUpperCase() })}
        />
        <span className="mono hex">{shown.toUpperCase()}</span>
        {accent ? (
          <button type="button" className="btn" onClick={() => changeAppearance({ accent: null })}>
            {COPY.appearance.accentReset}
          </button>
        ) : null}
      </div>
      <p className={low ? 'notice' : 'notice ok'} role={low ? 'alert' : 'status'} data-testid="accent-contrast">
        {low ? COPY.appearance.contrastLow(formatRatio(ratio)) : COPY.appearance.contrastOk(formatRatio(ratio))}
      </p>
    </section>
  );
}

type ImageState = { phase: 'idle' } | { phase: 'uploading'; progress: number } | { phase: 'failed'; message: string };

function imageFailure(file: File, error?: unknown): string {
  if (error instanceof ApiError && error.code === 'media_too_large') return COPY.appearance.imageTooLarge(file.name, file.size);
  if (error instanceof ApiError && (error.code === 'unsupported_media' || error.code === 'media_signature_mismatch')) {
    return COPY.appearance.imageUnsupported(file.name);
  }
  return COPY.appearance.imageFailed;
}

/** "Escolher imagem": the file goes to the media folder and then becomes the background. */
function ImagePicker({ hasImage }: { hasImage: boolean }) {
  const [state, setState] = useState<ImageState>({ phase: 'idle' });

  const choose = async (file: File | undefined) => {
    if (!file) return;
    if (mediaKindForName(file.name) !== 'image') {
      setState({ phase: 'failed', message: COPY.appearance.imageUnsupported(file.name) });
      return;
    }
    if (file.size > MAX_MEDIA_BYTES) {
      setState({ phase: 'failed', message: COPY.appearance.imageTooLarge(file.name, file.size) });
      return;
    }
    setState({ phase: 'uploading', progress: 0 });
    try {
      const stored = await api.uploadMedia(file, file.name, (progress) => setState({ phase: 'uploading', progress }));
      changeAppearance({ background: { kind: 'image', value: stored.path } });
      setState({ phase: 'idle' });
    } catch (error) {
      setState({ phase: 'failed', message: imageFailure(file, error) });
    }
  };

  return (
    <>
      <label className="btn file-button">
        {hasImage ? COPY.appearance.imageChange : COPY.appearance.imageChoose}
        <input
          type="file"
          className="sr-only"
          accept={IMAGE_ACCEPT}
          data-testid="background-image-input"
          disabled={state.phase === 'uploading'}
          onChange={(event) => {
            void choose(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
      </label>
      {state.phase === 'uploading' ? (
        <p className="notice ok" role="status">
          {COPY.appearance.imageUploading} · {Math.round(state.progress * 100)}%
        </p>
      ) : null}
      {state.phase === 'failed' ? (
        <p className="notice" role="alert">
          {state.message}
        </p>
      ) : null}
    </>
  );
}

/** Above this transparency a free background may eat the text in the video. */
const VEIL_WARNING_ABOVE = 40;

/**
 * "Transparência da folha": how much of the background shows through the
 * sheet, behind the text. Stored as how much the sheet covers (100 − it).
 */
function SheetVeil({ freeBackground }: { freeBackground: boolean }) {
  const opacity = useAppearance((state) => state.sheetOpacity);
  const transparency = 100 - opacity;
  return (
    <div className="veil-control">
      <div className="slider-row">
        <label htmlFor="sheet-veil">{COPY.appearance.veilLabel}</label>
        <input
          id="sheet-veil"
          type="range"
          min={0}
          max={100}
          step={5}
          value={transparency}
          aria-valuetext={`${transparency}%`}
          data-testid="sheet-veil"
          onChange={(event) => changeAppearance({ sheetOpacity: 100 - Number(event.target.value) })}
        />
        <output htmlFor="sheet-veil" className="mono">
          {transparency}%
        </output>
      </div>
      <p className="mono-note">{COPY.appearance.veilHint}</p>
      {freeBackground && transparency > VEIL_WARNING_ABOVE ? (
        <p className="notice" role="status" data-testid="sheet-veil-warning">
          {COPY.appearance.veilLow}
        </p>
      ) : null}
    </div>
  );
}

/** Theme background, a color, one of the 3 gradients or an image; the sheet keeps its veil. */
function BackgroundSection() {
  const background = useAppearance((state) => state.background);
  const [kind, setKind] = useState<BackgroundKind>(background.kind);
  const lastColor = useRef(background.kind === 'color' ? background.value : DEFAULT_BACKGROUND_COLOR);
  const lastGradient = useRef<GradientId>(background.kind === 'gradient' ? background.value : 'dusk');
  const lastImage = useRef<ImageBackground | null>(background.kind === 'image' ? background : null);
  if (background.kind === 'color') lastColor.current = background.value;
  if (background.kind === 'gradient') lastGradient.current = background.value;
  if (background.kind === 'image') lastImage.current = background;

  const pick = (next: BackgroundKind) => {
    setKind(next);
    if (next === 'theme') changeAppearance({ background: { kind: 'theme' } });
    if (next === 'color') changeAppearance({ background: { kind: 'color', value: lastColor.current } });
    if (next === 'gradient') changeAppearance({ background: { kind: 'gradient', value: lastGradient.current } });
    // "Imagem" waits for a file unless one was already chosen; it comes back with its frame.
    if (next === 'image' && lastImage.current) changeAppearance({ background: lastImage.current });
  };

  return (
    <section>
      <h3>{COPY.appearance.backgroundHeading}</h3>
      <div className="segments" role="radiogroup" aria-label={COPY.appearance.backgroundKindLabel}>
        {BACKGROUND_KINDS.map((option) => (
          <button key={option} type="button" role="radio" aria-checked={kind === option} onClick={() => pick(option)}>
            {COPY.appearance.backgroundKinds[option]}
          </button>
        ))}
      </div>
      {kind === 'color' ? (
        <div className="color-row">
          <input
            type="color"
            value={lastColor.current.toLowerCase()}
            aria-label={COPY.appearance.backgroundColor}
            data-testid="background-color-input"
            onChange={(event) => changeAppearance({ background: { kind: 'color', value: event.target.value.toUpperCase() } })}
          />
          <span className="mono hex">{lastColor.current.toUpperCase()}</span>
        </div>
      ) : null}
      {kind === 'gradient' ? (
        <div className="gradients" role="radiogroup" aria-label={COPY.appearance.gradientGroup}>
          {GRADIENT_IDS.map((id, index) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={background.kind === 'gradient' && background.value === id}
              aria-label={COPY.appearance.gradient(index + 1)}
              style={{ background: GRADIENTS[id] }}
              onClick={() => changeAppearance({ background: { kind: 'gradient', value: id } })}
            />
          ))}
        </div>
      ) : null}
      {kind === 'image' ? <ImagePicker hasImage={background.kind === 'image'} /> : null}
      {kind === 'image' && background.kind === 'image' ? <FramePicker key={background.value} image={background} /> : null}
      <SheetVeil freeBackground={background.kind !== 'theme'} />
    </section>
  );
}

/**
 * Esc closes the panel before anything else, unless a modal owns the keyboard;
 * the focus goes back to whoever opened it.
 */
function usePanelFocus(panelRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panelRef.current?.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]')?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || document.querySelector('[role="dialog"]')) return;
      event.preventDefault();
      event.stopPropagation();
      setPanelOpen(false);
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [panelRef]);
}

function PanelBody() {
  const ref = useRef<HTMLElement>(null);
  const save = useAppearance((state) => state.save);
  usePanelFocus(ref);
  return (
    <aside ref={ref} className="appearance-panel" aria-label={COPY.appearance.title} data-testid="appearance-panel">
      <header>
        <h2>{COPY.appearance.title}</h2>
        <button type="button" className="btn btn-icon" aria-label={COPY.appearance.close} onClick={() => setPanelOpen(false)}>
          <CloseIcon />
        </button>
      </header>
      <div className="panel-body">
        <ThemeSection />
        <AccentSection />
        <BackgroundSection />
        <p className="mono-note">{COPY.appearance.scopeNote}</p>
        {save === 'failed' ? (
          <p className="notice" role="alert">
            {COPY.appearance.saveFailed}
          </p>
        ) : null}
      </div>
    </aside>
  );
}

/**
 * The Appearance panel (AC-pauta-revelavel-46), over any screen: theme, free
 * accent with the contrast warning, and background. Every change is on screen
 * at once and holds for every rundown, after a restart too. It is not a modal:
 * the sheet and its keys keep working while it is open.
 */
export function AppearancePanel() {
  const open = useAppearance((state) => state.panelOpen);
  return open ? <PanelBody /> : null;
}
