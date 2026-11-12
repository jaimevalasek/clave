import { useEffect, useState } from 'react';
import { navigate, routes } from '../../core/router';
import { COPY } from '../../core/vocabulary';
import { ErrorBanner } from '../../ui/ErrorBanner';
import { BackIcon } from '../../ui/icons';
import { LoadingSkeleton } from '../../ui/LoadingSkeleton';
import { Modal } from '../../ui/Modal';
import { plannedCounts } from '../../../shared/reveal';
import { SheetColumn } from './SheetColumn';
import { PreparationStrip, SheetRuler } from './SheetRuler';
import { forgetAllIntakes } from './mediaIntake';
import { isSavable, loadSheet, resetSheet, useSheet } from './sheetStore';
import { flushNow, useAutosave } from './useAutosave';
import { useBlockActions } from './useBlockActions';
import { useRevealActions } from './useRevealActions';
import { useSheetShortcuts } from './useSheetShortcuts';
import './sheet.css';

function BareRuler() {
  return (
    <header className="ruler">
      <a className="btn btn-icon" href={`#${routes.rundowns()}`} aria-label={COPY.sheet.back} title={COPY.sheet.back}>
        <BackIcon />
      </a>
    </header>
  );
}

/**
 * "Começar uma nova tomada?" (AC-pauta-revelavel-29): the count of what starts
 * visible and hidden; confirming goes back to the plan, Esc or "Cancelar"
 * keeps the progress.
 */
function NewTakeModal({ onConfirm, onClose }: { onConfirm: () => void; onClose: () => void }) {
  const blocks = useSheet((state) => state.blocks);
  const { visible, hidden } = plannedCounts(blocks.filter(isSavable));
  return (
    <Modal
      title={COPY.sheet.newTakeDialogTitle}
      text={COPY.sheet.newTakeText(visible, hidden)}
      onDismiss={onClose}
      actions={[
        { label: COPY.common.cancel },
        { label: COPY.sheet.newTakeConfirm, intent: 'primary', autoFocus: true, onSelect: onConfirm }
      ]}
    />
  );
}

/** One rundown (`#/rundown/:id`): the ruler and the sheet, on a single route. */
export function SheetPage({ rundownId }: { rundownId: string }) {
  const status = useSheet((state) => state.status);
  const error = useSheet((state) => state.error);
  const rundown = useSheet((state) => state.rundown);
  const preparing = useSheet((state) => state.preparing);
  const [confirmingTake, setConfirmingTake] = useState(false);
  const actions = useBlockActions();
  const reveal = useRevealActions();
  useAutosave();
  useSheetShortcuts(actions, reveal);

  useEffect(() => {
    void loadSheet(rundownId);
    return () => {
      flushNow();
      forgetAllIntakes();
      resetSheet();
    };
  }, [rundownId]);

  // A rundown that does not exist (deleted, or a bad id) leads to the list (BR-pauta-revelavel-13).
  useEffect(() => {
    if (status === 'missing') navigate(routes.rundowns(), { replace: true });
  }, [status]);

  if (status === 'ready' && rundown) {
    return (
      <>
        <div className="top">
          <SheetRuler key={rundown.id} rundown={rundown} reveal={reveal} onNewTake={() => setConfirmingTake(true)} />
          {preparing ? <PreparationStrip /> : null}
        </div>
        <SheetColumn actions={actions} reveal={reveal} />
        {confirmingTake ? <NewTakeModal onConfirm={reveal.newTake} onClose={() => setConfirmingTake(false)} /> : null}
      </>
    );
  }

  return (
    <>
      <div className="top">
        <BareRuler />
      </div>
      <div className="desk">
        <div className="sheet-column">
          {status === 'error' ? (
            <ErrorBanner action="abrir a pauta" error={error} onRetry={() => void loadSheet(rundownId)} />
          ) : (
            <LoadingSkeleton />
          )}
        </div>
      </div>
    </>
  );
}
