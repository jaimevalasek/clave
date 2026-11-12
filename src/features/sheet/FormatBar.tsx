import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { COPY } from '../../core/vocabulary';
import { TEXT_COLORS, isRangeBold } from '../../../shared/textMarks';
import { readRuns, selectionOffsets } from './domText';
import { formatPassage } from './formatOps';
import type { PassageFormat } from './formatOps';
import { BLOCK_SELECTOR, EDITOR_SELECTOR } from './useSheetShortcuts';
import './format.css';

/** The ruler is at the top: the bar goes under the passage when there is no room above it. */
const TOP_LIMIT = 72;
const GAP = 10;

interface Passage {
  editor: HTMLElement;
  blockKey: string;
  start: number;
  end: number;
  bold: boolean;
  rect: DOMRect;
}

/** A non-empty selection inside one block text, or `null`. */
function readPassage(): Passage | null {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount || selection.isCollapsed) return null;
  const range = selection.getRangeAt(0);
  const base = range.commonAncestorContainer;
  const element = base.nodeType === Node.ELEMENT_NODE ? (base as Element) : base.parentElement;
  const editor = element?.closest<HTMLElement>(EDITOR_SELECTOR);
  const blockKey = editor?.closest<HTMLElement>(BLOCK_SELECTOR)?.dataset.key;
  if (!editor || !blockKey) return null;
  const offsets = selectionOffsets(editor);
  if (!offsets || offsets.start === offsets.end) return null;
  const start = Math.min(offsets.start, offsets.end);
  const end = Math.max(offsets.start, offsets.end);
  return { editor, blockKey, start, end, bold: isRangeBold(readRuns(editor), start, end), rect: range.getBoundingClientRect() };
}

/** Follows the selection, and the scroll that moves it. */
function usePassage(): Passage | null {
  const [passage, setPassage] = useState<Passage | null>(null);
  useEffect(() => {
    const update = () => setPassage(readPassage());
    document.addEventListener('selectionchange', update);
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      document.removeEventListener('selectionchange', update);
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);
  return passage;
}

/** Above the passage, centred, inside the window. */
function usePlacement(passage: Passage | null) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<CSSProperties>({ visibility: 'hidden' });
  useLayoutEffect(() => {
    const bar = ref.current;
    if (!passage || !bar) return;
    const { width, height } = bar.getBoundingClientRect();
    const { rect } = passage;
    const above = rect.top - height - GAP;
    const top = above < TOP_LIMIT ? rect.bottom + GAP : above;
    const left = Math.max(8, Math.min(window.innerWidth - width - 8, rect.left + rect.width / 2 - width / 2));
    setStyle({ top, left });
  }, [passage]);
  return { ref, style: passage ? style : { visibility: 'hidden' as const } };
}

/**
 * The bar over a selected passage (AC-pauta-revelavel-37): Negrito, the six
 * colors of the theme and Normal. A mark goes to the passage only and is
 * saved; a press never takes the selection away from the text.
 */
export function FormatBar() {
  const passage = usePassage();
  const { ref, style } = usePlacement(passage);

  const apply = useCallback(
    (format: PassageFormat) => {
      if (!passage) return;
      formatPassage(passage.blockKey, readRuns(passage.editor), passage.start, passage.end, format);
    },
    [passage]
  );

  if (!passage) return null;
  return (
    <div
      ref={ref}
      className="format-bar"
      role="toolbar"
      aria-label={COPY.format.toolbar}
      data-testid="format-bar"
      style={style}
      onMouseDown={(event) => event.preventDefault()}
    >
      <button
        type="button"
        className="bold"
        aria-label={COPY.format.bold}
        aria-pressed={passage.bold}
        title={COPY.format.boldTitle}
        onClick={() => apply({ kind: 'toggle-bold' })}
      >
        B
      </button>
      <span className="separator" aria-hidden="true" />
      {TEXT_COLORS.map((color) => {
        const name = COPY.format.colors[color];
        return (
          <button
            key={color}
            type="button"
            className="dot"
            aria-label={COPY.format.colorLabel(name)}
            title={name}
            data-color-option={color}
            onClick={() => apply({ kind: 'color', color })}
          >
            <i style={{ background: `var(--color-${color})` }} />
          </button>
        );
      })}
      <span className="separator" aria-hidden="true" />
      <button type="button" className="normal" title={COPY.format.normalTitle} onClick={() => apply({ kind: 'clear' })}>
        {COPY.format.normal}
      </button>
    </div>
  );
}
