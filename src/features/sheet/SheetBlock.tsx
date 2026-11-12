import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { memo, useLayoutEffect, useRef } from 'react';
import type { CSSProperties, RefObject } from 'react';
import { COPY } from '../../core/vocabulary';
import { ChevronIcon, EyeClosedIcon, EyeIcon, HandleIcon, TrashIcon } from '../../ui/icons';
import { MediaBlock } from './MediaBlock';
import { SizeBar } from './SizeBar';
import { TextBlockEditor } from './TextBlockEditor';
import { selectBlock } from './sheetStore';
import type { DraftBlock } from './sheetStore';
import { requestDelete } from './structureOps';
import { toggleCollapsed, togglePlanned } from './takeOps';

const STEP_PX = 44;

/**
 * Media and title blocks complete their height up to the next multiple of the
 * ruled-paper step, so the next block lands back on the lines.
 */
function useStepAlignment(blockRef: RefObject<HTMLElement | null>, contentRef: RefObject<HTMLElement | null>, enabled: boolean) {
  useLayoutEffect(() => {
    const block = blockRef.current;
    const content = contentRef.current;
    if (!block || !content) return;
    if (!enabled) {
      block.style.paddingBottom = '';
      return;
    }
    const align = () => {
      const height = content.getBoundingClientRect().height;
      const rest = Math.ceil(height / STEP_PX - 0.001) * STEP_PX - height;
      block.style.paddingBottom = `${Math.max(0, rest).toFixed(2)}px`;
    };
    align();
    const observer = new ResizeObserver(align);
    observer.observe(content);
    return () => observer.disconnect();
  }, [blockRef, contentRef, enabled]);
}

/** Sub-item mark (AC-pauta-revelavel-41, revised 2026-11-12): "–" on levels 1 and 2, none on a topic. */
function TreeMarks({ depth }: { depth: number }) {
  if (depth === 0) return null;
  return (
    <>
      <span className="guide" aria-hidden="true" />
      <span className="bullet" aria-hidden="true" data-testid="block-bullet">
        –
      </span>
    </>
  );
}

/**
 * Preparation view only (AC-pauta-revelavel-28, -43): how the block starts in
 * every take, and "recolher" on a topic with sub-items.
 */
function PreparationActions({ block, hasSubItems }: { block: DraftBlock; hasSubItems: boolean }) {
  return (
    <div className="prep-actions">
      {hasSubItems ? (
        <button
          type="button"
          className="collapse"
          aria-expanded={!block.collapsed}
          aria-label={block.collapsed ? COPY.sheet.expandLabel : COPY.sheet.collapseLabel}
          data-testid="block-collapse"
          onClick={() => toggleCollapsed(block.key)}
        >
          <ChevronIcon />
          {block.collapsed ? COPY.sheet.expand : COPY.sheet.collapse}
        </button>
      ) : null}
      <button
        type="button"
        className="planned"
        data-planned={block.plannedVisible ? 'visible' : 'hidden'}
        title={COPY.sheet.plannedTitle}
        data-testid="block-planned"
        onClick={() => togglePlanned(block.key)}
      >
        {block.plannedVisible ? COPY.sheet.plannedVisible : COPY.sheet.plannedHidden}
      </button>
    </div>
  );
}

/** While dragging: the lifted block, or one of its sub-items that goes along. */
export type DragRole = 'lifted' | 'carried';

interface SheetBlockProps {
  block: DraftBlock;
  /** On screen in the take; a block off screen only renders in preparation, dimmed. */
  shown: boolean;
  selected: boolean;
  version: number;
  preparing: boolean;
  hasSubItems: boolean;
  /** Just revealed: the ink settles. */
  entering: boolean;
  /** Just hidden: it fades out and takes no input. */
  leaving: boolean;
  onToggleEye: (key: string) => void;
  dragRole?: DragRole;
  /** The drop mark sits right above this block. */
  dropBefore?: boolean;
}

export const SheetBlock = memo(function SheetBlock({
  block,
  shown,
  selected,
  version,
  preparing,
  hasSubItems,
  entering,
  leaving,
  onToggleEye,
  dragRole,
  dropBefore = false
}: SheetBlockProps) {
  const blockRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const sortable = useSortable({ id: block.key, disabled: leaving });
  useStepAlignment(blockRef, contentRef, block.kind !== 'text' || block.size === 'title');
  const style = {
    '--level': block.depth,
    '--block-font': `${block.fontPx}px`,
    transform: CSS.Translate.toString(sortable.transform),
    transition: sortable.transition
  } as CSSProperties;
  const classes = [
    'block',
    shown || leaving ? '' : 'ghost',
    selected ? 'selected' : '',
    entering && shown ? 'entering' : '',
    leaving ? 'leaving' : '',
    dragRole ?? '',
    dropBefore ? 'drop-before' : ''
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section
      ref={(node) => {
        blockRef.current = node;
        sortable.setNodeRef(node);
      }}
      className={classes}
      style={style}
      tabIndex={-1}
      data-testid="sheet-block"
      data-key={block.key}
      data-kind={block.kind}
      data-depth={block.depth}
      data-size={block.kind === 'text' ? block.size : undefined}
      data-shown={shown}
      data-planned={block.plannedVisible ? 'visible' : 'hidden'}
      aria-hidden={leaving || undefined}
      inert={leaving}
      onMouseDown={() => selectBlock(block.key)}
      onFocus={() => selectBlock(block.key)}
    >
      <div className="gutter">
        <button
          type="button"
          className="handle"
          ref={sortable.setActivatorNodeRef}
          {...sortable.listeners}
          aria-label={COPY.sheet.handleLabel}
          title={COPY.sheet.handleTitle}
          data-testid="block-handle"
        >
          <HandleIcon />
        </button>
        <button
          type="button"
          aria-label={shown ? COPY.sheet.eyeHide : COPY.sheet.eyeShow}
          title={shown ? COPY.sheet.eyeHideTitle : COPY.sheet.eyeShowTitle}
          data-testid="block-eye"
          onClick={() => onToggleEye(block.key)}
        >
          {shown ? <EyeIcon /> : <EyeClosedIcon />}
        </button>
        <button
          type="button"
          className="remove"
          aria-label={COPY.sheet.removeLabel}
          title={COPY.sheet.removeTitle}
          data-testid="block-remove"
          onClick={() => requestDelete(block.key)}
        >
          <TrashIcon />
        </button>
      </div>
      {preparing ? <PreparationActions block={block} hasSubItems={hasSubItems} /> : null}
      <TreeMarks depth={block.depth} />
      <div className="content" ref={contentRef}>
        {block.kind === 'text' ? (
          <TextBlockEditor block={block} version={version} />
        ) : (
          <MediaBlock block={block} active={shown && !leaving} />
        )}
      </div>
      {/* Drawn above the text but after it in the Tab order: Shift+Tab from the
          text reaches the gutter, Esc then Tab reaches the sizes (AC-pauta-revelavel-53). */}
      {block.kind === 'text' ? <SizeBar blockKey={block.key} size={block.size} fontPx={block.fontPx} /> : null}
    </section>
  );
});
