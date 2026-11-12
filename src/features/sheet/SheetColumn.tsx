import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import type { Announcements, CollisionDetection, DragMoveEvent, DragStartEvent } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import type { SortingStrategy } from '@dnd-kit/sortable';
import { Fragment, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, RefObject } from 'react';
import { COPY } from '../../core/vocabulary';
import { Modal } from '../../ui/Modal';
import { scrollBehavior } from '../../ui/reducedMotion';
import { mountedFlags, shownFlags } from '../../../shared/reveal';
import { hasChildren, subtreeEnd } from '../../../shared/sheetTree';
import { FormatBar } from './FormatBar';
import { SheetBlock } from './SheetBlock';
import { appendTextBlock, useSheet } from './sheetStore';
import { cancelDelete, confirmDelete } from './structureOps';
import type { BlockActions } from './useBlockActions';
import type { RevealActions } from './useRevealActions';
import { useSheetInput } from './useSheetInput';

/** Files dragged over the window (AC-pauta-revelavel-17). It never takes the pointer: the drop reads the page under it. */
function DropOverlay() {
  return (
    <div className="drop-overlay" aria-hidden="true" data-testid="drop-overlay">
      <div>{COPY.sheet.dropHere}</div>
    </div>
  );
}

function EmptySheet() {
  return (
    <div className="sheet-empty" data-testid="sheet-empty">
      <div className="sheet-empty-title">{COPY.sheet.emptyTitle}</div>
      <p>{COPY.sheet.emptyBody}</p>
      <div className="sheet-empty-shortcuts">
        {COPY.sheet.emptyShortcuts.map((shortcut) => (
          <span key={shortcut}>{shortcut}</span>
        ))}
      </div>
    </div>
  );
}

/** "Apagar bloco?" (AC-pauta-revelavel-45): nothing leaves before the confirmation. */
function DeleteBlockModal() {
  const pendingKey = useSheet((state) => state.pendingDeleteKey);
  const blocks = useSheet((state) => state.blocks);
  const index = blocks.findIndex((block) => block.key === pendingKey);
  if (index < 0) return null;
  const { key, kind } = blocks[index];
  return (
    <Modal
      title={COPY.sheet.deleteTitle}
      text={COPY.sheet.deleteText(kind, hasChildren(blocks, index))}
      destructive
      onDismiss={cancelDelete}
      actions={[
        { label: COPY.common.cancel, autoFocus: true },
        { label: COPY.sheet.deleteConfirm, intent: 'danger', onSelect: () => confirmDelete(key) }
      ]}
    />
  );
}

/** The other blocks stay where they are while one is dragged: the drop mark shows the destination. */
const keepInPlace: SortingStrategy = () => null;

const DROP_AT_END = '__end__';

interface DragState {
  key: string;
  group: Set<string>;
  /** Key of the block the drag lands before, `DROP_AT_END`, or null when it lands where it is. */
  dropBefore: string | null;
}

const announcements: Announcements = {
  onDragStart: () => COPY.sheet.dragStarted,
  onDragOver: () => undefined,
  onDragEnd: () => undefined,
  onDragCancel: () => COPY.sheet.dragCancelled
};

/**
 * Reordering by drag (AC-pauta-revelavel-44): the handle lifts the block, the
 * accent mark shows where it lands, and the drop moves the block with all of
 * its sub-items (AC-pauta-revelavel-42). Touch works through the handle, which
 * never lets the page scroll (`touch-action: none`). Only blocks in the page
 * are destinations: `order` holds their keys, top to bottom.
 */
function useSheetDrag(actions: BlockActions, order: readonly string[]) {
  const orderRef = useRef(order);
  orderRef.current = order;
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const update = (next: DragState | null) => {
    dragRef.current = next;
    setDrag(next);
  };

  // The dragged group is not a destination: the nearest other block is.
  const collisionDetection = useCallback<CollisionDetection>((args) => {
    const group = dragRef.current?.group;
    return closestCenter({
      ...args,
      droppableContainers: args.droppableContainers.filter((container) => !group?.has(String(container.id)))
    });
  }, []);

  const onDragStart = ({ active }: DragStartEvent) => {
    const { blocks } = useSheet.getState();
    const index = blocks.findIndex((block) => block.key === active.id);
    if (index < 0) return;
    const group = new Set(blocks.slice(index, subtreeEnd(blocks, index)).map((block) => block.key));
    update({ key: String(active.id), group, dropBefore: null });
  };

  const onDragMove = ({ active, over }: DragMoveEvent) => {
    const current = dragRef.current;
    const lifted = active.rect.current.translated;
    if (!current || !over || !lifted) return;
    const keys = orderRef.current;
    const overIndex = keys.indexOf(String(over.id));
    if (overIndex < 0) return;
    const above = lifted.top + lifted.height / 2 < over.rect.top + over.rect.height / 2;
    const beforeIndex = above ? overIndex : overIndex + 1;
    const beforeKey = beforeIndex >= keys.length ? DROP_AT_END : keys[beforeIndex];
    const dropBefore = current.group.has(beforeKey) ? null : beforeKey;
    if (dropBefore !== current.dropBefore) update({ ...current, dropBefore });
  };

  const onDragEnd = () => {
    const current = dragRef.current;
    update(null);
    if (current?.dropBefore) {
      actions.moveBefore(current.key, current.dropBefore === DROP_AT_END ? null : current.dropBefore);
    }
  };

  const context = {
    sensors,
    collisionDetection,
    accessibility: { announcements, screenReaderInstructions: { draggable: COPY.sheet.dragInstructions } },
    onDragStart,
    onDragMove,
    onDragEnd,
    onDragCancel: () => update(null)
  };
  return { drag, context };
}

/** "N sub-itens recolhidos" under a collapsed topic, in the preparation view. */
function CollapsedNote({ depth, count }: { depth: number; count: number }) {
  return (
    <div className="collapsed-note" style={{ '--level': depth + 1 } as CSSProperties} data-testid="collapsed-note">
      {COPY.sheet.collapsedCount(count)}
    </div>
  );
}

/** A revealed block settles in ink and the sheet follows it (AC-pauta-revelavel-22, -52). */
function useFollowReveal(columnRef: RefObject<HTMLElement | null>): Set<string> {
  const lastReveal = useSheet((state) => state.lastReveal);
  const key = lastReveal?.keys[lastReveal.keys.length - 1];
  const serial = lastReveal?.serial;
  useLayoutEffect(() => {
    if (!key) return;
    const element = columnRef.current?.querySelector<HTMLElement>(`[data-key="${CSS.escape(key)}"]`);
    element?.scrollIntoView({ block: 'nearest', behavior: scrollBehavior() });
  }, [columnRef, key, serial]);
  return useMemo(() => new Set(lastReveal?.keys ?? []), [lastReveal]);
}

/** What the column shows: blocks on screen, or every block (dimmed when hidden) in preparation. */
function useColumnView() {
  const blocks = useSheet((state) => state.blocks);
  const preparing = useSheet((state) => state.preparing);
  const leavingKeys = useSheet((state) => state.leavingKeys);
  const shown = useMemo(() => shownFlags(blocks), [blocks]);
  const mounted = useMemo(() => mountedFlags(blocks, preparing), [blocks, preparing]);
  const leaving = useMemo(() => new Set(leavingKeys), [leavingKeys]);
  const keys = useMemo(() => blocks.filter((_, index) => mounted[index]).map((block) => block.key), [blocks, mounted]);
  return { blocks, preparing, shown, mounted, leaving, keys, allShown: blocks.length > 0 && shown.every(Boolean) };
}

type ColumnView = ReturnType<typeof useColumnView>;

interface ColumnBlocksProps {
  view: ColumnView;
  entering: Set<string>;
  drag: DragState | null;
  onToggleEye: (key: string) => void;
}

/**
 * The blocks in the page, in reveal order. A block that just left the screen
 * stays for its fade-out; a collapsed topic in preparation shows how many
 * sub-items it holds instead of them.
 */
function ColumnBlocks({ view, entering, drag, onToggleEye }: ColumnBlocksProps) {
  const selectedKey = useSheet((state) => state.selectedKey);
  const versions = useSheet((state) => state.editorVersions);
  const { blocks, preparing, shown, mounted, leaving } = view;
  return blocks.map((block, index) => {
    const isLeaving = !mounted[index] && leaving.has(block.key);
    if (!mounted[index] && !isLeaving) return null;
    const subItems = hasChildren(blocks, index);
    return (
      <Fragment key={block.key}>
        <SheetBlock
          block={block}
          shown={shown[index]}
          selected={block.key === selectedKey}
          version={versions[block.key] ?? 0}
          preparing={preparing}
          hasSubItems={subItems}
          entering={entering.has(block.key)}
          leaving={isLeaving}
          onToggleEye={onToggleEye}
          dragRole={drag?.key === block.key ? 'lifted' : drag?.group.has(block.key) ? 'carried' : undefined}
          dropBefore={drag?.dropBefore === block.key}
        />
        {preparing && block.collapsed && subItems ? (
          <CollapsedNote depth={block.depth} count={subtreeEnd(blocks, index) - index - 1} />
        ) : null}
      </Fragment>
    );
  });
}

/**
 * The sheet: one vertical column that is both the editor and what the capture
 * shows (AC-pauta-revelavel-07). Blocks sit on the ruled paper in reveal order.
 * With the preparation view off, a block off screen is not in the page at all:
 * no content, no space, no focus (RULE-pauta-revelavel-01).
 */
export function SheetColumn({ actions, reveal }: { actions: BlockActions; reveal: RevealActions }) {
  const title = useSheet((state) => state.rundown?.title ?? '');
  const announcement = useSheet((state) => state.announcement);
  const columnRef = useRef<HTMLElement>(null);
  const entering = useFollowReveal(columnRef);
  const view = useColumnView();
  const { drag, context } = useSheetDrag(actions, view.keys);
  const dropping = useSheetInput(columnRef);

  return (
    <div className="desk">
      <article
        ref={columnRef}
        className={`sheet-column${view.preparing ? ' preparing' : ''}`}
        data-testid="sheet-column"
        data-aioson-primary
        data-aioson-tour="sheet"
        aria-label={COPY.sheet.columnLabel(title)}
      >
        {view.blocks.length === 0 ? <EmptySheet /> : null}
        <DndContext {...context}>
          <SortableContext items={view.keys} strategy={keepInPlace}>
            <ColumnBlocks view={view} entering={entering} drag={drag} onToggleEye={reveal.toggleEye} />
          </SortableContext>
        </DndContext>
        {view.allShown ? (
          <div className="sheet-end" data-testid="sheet-end">
            {COPY.sheet.sheetEnd}
          </div>
        ) : null}
        <button
          type="button"
          className={`end-hint${drag?.dropBefore === DROP_AT_END ? ' drop-before' : ''}`}
          data-aioson-tour="paste"
          data-testid="sheet-continue"
          onClick={appendTextBlock}
        >
          {COPY.sheet.continue}
        </button>
      </article>
      <div className="sr-only" role="status" aria-live="polite" data-testid="sheet-announcer">
        {announcement}
      </div>
      <FormatBar />
      <DeleteBlockModal />
      {dropping ? <DropOverlay /> : null}
    </div>
  );
}
