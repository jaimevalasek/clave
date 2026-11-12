import { COPY } from '../../core/vocabulary';
import { PinIcon, TrashIcon } from '../../ui/icons';
import { editedAgo } from './format';
import type { RundownSummary } from '../../../shared/types';

interface RundownRowProps {
  rundown: RundownSummary;
  index: number;
  onOpen(): void;
  onTogglePin(): void;
  onRename(): void;
  onDuplicate(): void;
  onDelete(): void;
}

/** One editorial line of the list, identified by the persisted id (AC-pauta-revelavel-06). */
export function RundownRow({ rundown, index, onOpen, onTogglePin, onRename, onDuplicate, onDelete }: RundownRowProps) {
  return (
    <div className="rundown-row" data-testid={`rundown-${rundown.id}`}>
      <span className="row-number">{String(index + 1).padStart(2, '0')}</span>
      <div className="row-info">
        <h2>
          <button type="button" className="row-open" onClick={onOpen}>
            {rundown.title}
          </button>
        </h2>
        <div className="row-meta">
          <span>{COPY.rundowns.blocks(rundown.blockCount)}</span>
          <span>{COPY.rundowns.initiallyVisible(rundown.initiallyVisibleCount)}</span>
          <span>{COPY.rundowns.edited(editedAgo(rundown.updatedAt))}</span>
          {rundown.pinned ? <span className="row-pinned">{COPY.rundowns.pinned}</span> : null}
          {rundown.legacyImported ? (
            <span className="chip" title={COPY.rundowns.legacySealHint}>
              {COPY.rundowns.legacySeal}
            </span>
          ) : null}
        </div>
      </div>
      <div className="row-actions">
        <button
          type="button"
          className="btn btn-icon"
          aria-pressed={rundown.pinned}
          aria-label={rundown.pinned ? COPY.rundowns.unpin : COPY.rundowns.pin}
          title={rundown.pinned ? COPY.rundowns.unpin : COPY.rundowns.pin}
          onClick={onTogglePin}
        >
          <PinIcon />
        </button>
        <button type="button" className="btn" onClick={onRename}>
          {COPY.rundowns.rename}
        </button>
        <button type="button" className="btn" onClick={onDuplicate}>
          {COPY.rundowns.duplicate}
        </button>
        <button
          type="button"
          className="btn btn-icon"
          aria-label={COPY.rundowns.remove(rundown.title)}
          title={COPY.rundowns.remove(rundown.title)}
          onClick={onDelete}
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  );
}
