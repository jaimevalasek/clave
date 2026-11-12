import { useEffect, useMemo, useRef, useState } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { api } from '../../core/api';
import { routes } from '../../core/router';
import { COPY } from '../../core/vocabulary';
import { BackIcon, HelpIcon, HideIcon, PaletteIcon, PencilIcon, RevealIcon, TakeIcon } from '../../ui/icons';
import { togglePanel, useAppearance } from '../appearance/appearanceStore';
import { openTour } from '../guide/tourStore';
import { shownFlags } from '../../../shared/reveal';
import { RUNDOWN_TITLE_MAX_LENGTH } from '../../../shared/validation/rundown';
import type { RundownSummary } from '../../../shared/types';
import { isSavable, setRundownTitle, setSaveState, useSheet } from './sheetStore';
import { RETRY_DELAY_MS } from './useAutosave';
import type { RevealActions } from './useRevealActions';

const TITLE_DELAY_MS = 500;

function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/** "Salvando", "Salvo às HH:MM" or the failure with the retry (AC-pauta-revelavel-08/09). */
function SaveIndicator() {
  const save = useSheet((state) => state.save);
  const pending = useSheet((state) => state.revision > state.savedRevision);
  const updatedAt = useSheet((state) => state.rundown?.updatedAt ?? null);
  if (save.phase === 'failed') {
    return (
      <span className="save-state" data-state="error" role="alert" data-testid="save-state">
        <i />
        <span>{COPY.sheet.saveFailed}</span>
      </span>
    );
  }
  // A change waiting for the typing pause already counts as being saved.
  const saving = save.phase === 'saving' || pending;
  const label = saving
      ? COPY.sheet.saving
      : COPY.sheet.savedAt(clockTime(save.phase === 'saved' ? save.at : (updatedAt ?? new Date().toISOString())));
  return (
    <span className="save-state" data-state={saving ? 'saving' : save.phase} data-testid="save-state">
      <i />
      <span>{label}</span>
    </span>
  );
}

/**
 * The name is edited in place; it saves after a short pause and an empty name
 * is never sent (it goes back to the last saved one on blur).
 */
function useTitleAutosave(rundown: RundownSummary) {
  const [title, setTitle] = useState(rundown.title);
  const saved = useRef(rundown.title);
  const timer = useRef<number | undefined>(undefined);

  const persist = async (value: string) => {
    setSaveState(rundown.id, { phase: 'saving' });
    try {
      await api.patch(`/api/rundowns/${encodeURIComponent(rundown.id)}`, { title: value });
      saved.current = value;
      setSaveState(rundown.id, { phase: 'saved', at: new Date().toISOString() });
    } catch {
      setSaveState(rundown.id, { phase: 'failed' });
      timer.current = window.setTimeout(() => void persist(value), RETRY_DELAY_MS);
    }
  };

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const change = (value: string) => {
    setTitle(value);
    setRundownTitle(value);
    window.clearTimeout(timer.current);
    const trimmed = value.trim();
    if (trimmed && trimmed !== saved.current) {
      setSaveState(rundown.id, { phase: 'saving' });
      timer.current = window.setTimeout(() => void persist(trimmed), TITLE_DELAY_MS);
    }
  };

  const blur = () => {
    if (title.trim()) return;
    setTitle(saved.current);
    setRundownTitle(saved.current);
  };

  return { title, change, blur };
}

/** A file still on its way to the media folder, or that failed, is not a block of the rundown yet. */
function useCounts(): { shown: number; total: number } {
  const blocks = useSheet((state) => state.blocks);
  return useMemo(() => {
    const flags = shownFlags(blocks);
    const counted = blocks.flatMap((block, index) => (isSavable(block) ? [flags[index]] : []));
    return { shown: counted.filter(Boolean).length, total: counted.length };
  }, [blocks]);
}

function Counter() {
  const { shown, total } = useCounts();
  return (
    <span className="counter" data-testid="sheet-counter">
      <b>{shown}</b> {COPY.sheet.counterOf} {total}
      <span className="on-screen"> {COPY.sheet.counterOnScreen}</span>
    </span>
  );
}

/** A ruler button with its label and key, both dropped on a phone (the name stays in `aria-label`). */
function KeyedButton({ label, shortcut, keyLabel, icon, primary = false, ...rest }: KeyedButtonProps) {
  return (
    <button type="button" className={primary ? 'btn btn-primary' : 'btn'} aria-label={label} aria-keyshortcuts={shortcut} {...rest}>
      {icon}
      <span className="label">{label}</span>
      <span className="kbd" aria-hidden="true">
        {keyLabel}
      </span>
    </button>
  );
}

interface KeyedButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'className'> {
  label: string;
  shortcut: string;
  keyLabel: string;
  icon: ReactNode;
  primary?: boolean;
  'data-testid': string;
}

/** "Ocultar último", "Revelar próximo", "Preparo" and "Nova tomada" (AC-pauta-revelavel-08). */
function TakeControls({ reveal, onNewTake }: { reveal: RevealActions; onNewTake: () => void }) {
  const preparing = useSheet((state) => state.preparing);
  return (
    <>
      <div className="group">
        <KeyedButton
          label={COPY.sheet.hideLast}
          shortcut="PageUp"
          keyLabel="PgUp"
          icon={<HideIcon />}
          title={COPY.sheet.hideLastTitle}
          data-testid="hide-last"
          onClick={reveal.hideLast}
        />
        <KeyedButton
          label={COPY.sheet.revealNext}
          shortcut="PageDown"
          keyLabel="PgDn"
          icon={<RevealIcon />}
          primary
          data-aioson-tour="reveal"
          data-testid="reveal-next"
          onClick={reveal.revealNext}
        />
      </div>
      <div className="group">
        <KeyedButton
          label={COPY.sheet.preparation}
          shortcut="F2"
          keyLabel="F2"
          icon={<PencilIcon />}
          aria-pressed={preparing}
          title={COPY.sheet.preparationTitle}
          data-aioson-tour="preparation"
          data-testid="preparation-toggle"
          onClick={reveal.togglePreparation}
        />
        <button
          type="button"
          className="btn btn-icon"
          aria-label={COPY.sheet.newTake}
          title={COPY.sheet.newTakeTitle}
          data-testid="new-take"
          onClick={onNewTake}
        >
          <TakeIcon />
        </button>
      </div>
    </>
  );
}

/** "Aparência" opens the panel of theme, accent and background (AC-pauta-revelavel-08, -46). */
function AppearanceButton() {
  const open = useAppearance((state) => state.panelOpen);
  return (
    <button
      type="button"
      className="btn btn-icon"
      aria-label={COPY.sheet.appearance}
      aria-expanded={open}
      title={COPY.sheet.appearance}
      data-aioson-tour="appearance"
      data-testid="appearance-open"
      onClick={togglePanel}
    >
      <PaletteIcon />
    </button>
  );
}

/** "Como usar" reopens the first-open tour (AC-pauta-revelavel-08, -50). */
function HowToUseButton() {
  return (
    <button
      type="button"
      className="btn btn-icon"
      aria-label={COPY.sheet.howToUse}
      title={COPY.sheet.howToUse}
      data-testid="how-to-use"
      onClick={openTour}
    >
      <HelpIcon />
    </button>
  );
}

/** "Preparo ligado": a warning strip under the ruler, never to be recorded (AC-pauta-revelavel-28). */
export function PreparationStrip() {
  return (
    <div className="prep-strip" role="alert" data-testid="preparation-strip">
      <strong>{COPY.sheet.preparationStripTitle}</strong>
      <span>
        {COPY.sheet.preparationStripBefore} <span className="kbd">F2</span> {COPY.sheet.preparationStripAfter}
      </span>
    </div>
  );
}

interface SheetRulerProps {
  rundown: RundownSummary;
  reveal: RevealActions;
  onNewTake: () => void;
}

/** The thin ruler on top of the sheet: name, counter, save state, the take controls, "Aparência" and "Como usar". */
export function SheetRuler({ rundown, reveal, onNewTake }: SheetRulerProps) {
  const { title, change, blur } = useTitleAutosave(rundown);
  return (
    <header className="ruler" data-testid="sheet-ruler">
      <a className="btn btn-icon" href={`#${routes.rundowns()}`} aria-label={COPY.sheet.back} title={COPY.sheet.back}>
        <BackIcon />
      </a>
      <input
        className="ruler-title"
        type="text"
        value={title}
        maxLength={RUNDOWN_TITLE_MAX_LENGTH}
        aria-label={COPY.sheet.nameLabel}
        autoComplete="off"
        spellCheck={false}
        onChange={(event) => change(event.target.value)}
        onBlur={blur}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === 'Escape') event.currentTarget.blur();
        }}
      />
      {rundown.legacyImported ? (
        <span className="chip" title={COPY.sheet.legacyChipHint}>
          {COPY.sheet.legacyChip}
        </span>
      ) : null}
      <Counter />
      <span className="spacer" />
      <SaveIndicator />
      <TakeControls reveal={reveal} onNewTake={onNewTake} />
      <AppearanceButton />
      <HowToUseButton />
    </header>
  );
}
