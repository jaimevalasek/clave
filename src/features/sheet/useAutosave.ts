import { useEffect } from 'react';
import { api } from '../../core/api';
import { normalizeDepths } from '../../../shared/sheetTree';
import type { SheetSaveResult } from '../../../shared/types';
import { applySaved, isSavable, setSaveState, useSheet } from './sheetStore';
import type { DraftBlock } from './sheetStore';

/** Pause after typing before the save goes out; structural changes go at once. */
export const TYPING_DELAY_MS = 600;
export const RETRY_DELAY_MS = 5000;

interface Snapshot {
  rundownId: string;
  revision: number;
  blocks: DraftBlock[];
}

/** Serial queue: one write at a time, always with the most recent snapshot. */
let inFlight = false;
let queued: Snapshot | null = null;
let debounceTimer: number | undefined;
let retryTimer: number | undefined;
const knownIds = new Map<string, string>();

function currentSnapshot(): Snapshot | null {
  const state = useSheet.getState();
  if (!state.rundownId || state.status !== 'ready') return null;
  if (state.revision <= state.savedRevision) return null;
  return { rundownId: state.rundownId, revision: state.revision, blocks: state.blocks };
}

/**
 * What goes to the server: every block but the client-only files still on
 * their way to the media folder (or that failed), with the levels made valid
 * again around the ones left out.
 */
function toPayload(blocks: DraftBlock[]) {
  return normalizeDepths(blocks.filter(isSavable)).map(blockPayload);
}

function blockPayload(block: DraftBlock & { kind: Exclude<DraftBlock['kind'], 'intake'> }) {
  return {
    key: block.key,
    id: block.id ?? knownIds.get(block.key) ?? null,
    kind: block.kind,
    depth: block.depth,
    content: block.content,
    mediaPath: block.mediaPath,
    mediaName: block.mediaName,
    size: block.size,
    fontPx: block.fontPx,
    plannedVisible: block.plannedVisible,
    takeVisible: block.takeVisible,
    revealStep: block.takeVisible ? block.revealStep : null,
    collapsed: block.collapsed
  };
}

function sheetUrl(rundownId: string): string {
  return `/api/rundowns/${encodeURIComponent(rundownId)}/sheet`;
}

/** The freshest snapshot of the same rundown, or the one captured earlier. */
function freshest(captured: Snapshot): Snapshot {
  const fresh = currentSnapshot();
  return fresh && fresh.rundownId === captured.rundownId ? fresh : captured;
}

async function send(snapshot: Snapshot): Promise<void> {
  inFlight = true;
  window.clearTimeout(retryTimer);
  setSaveState(snapshot.rundownId, { phase: 'saving' });
  try {
    const result = await api.put<SheetSaveResult>(sheetUrl(snapshot.rundownId), {
      blocks: toPayload(snapshot.blocks)
    });
    for (const [key, id] of Object.entries(result.ids)) knownIds.set(key, id);
    applySaved(snapshot.rundownId, result, snapshot.revision);
  } catch {
    // The screen never goes back: the warning shows and the whole state goes
    // again in 5 s (RULE-pauta-revelavel-11, BR-pauta-revelavel-14).
    setSaveState(snapshot.rundownId, { phase: 'failed' });
    retryTimer = window.setTimeout(() => {
      if (!inFlight) void send(freshest(snapshot));
      else queued = freshest(snapshot);
    }, RETRY_DELAY_MS);
  } finally {
    inFlight = false;
    const next = queued;
    queued = null;
    if (next) void send(freshest(next));
  }
}

/** Sends the pending changes now (or right after the write in flight). */
export function flushNow(): void {
  window.clearTimeout(debounceTimer);
  const snapshot = currentSnapshot();
  if (!snapshot) return;
  if (inFlight) {
    queued = snapshot;
    return;
  }
  void send(snapshot);
}

/** Best effort when the window goes away with changes still pending. */
function flushOnExit(): void {
  const snapshot = currentSnapshot();
  if (!snapshot) return;
  try {
    void fetch(sheetUrl(snapshot.rundownId), {
      method: 'PUT',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks: toPayload(snapshot.blocks) })
    });
  } catch {
    // Nothing else can be done while the page unloads.
  }
}

/**
 * Autosave of the open sheet (RULE-pauta-revelavel-08): no save button, typing
 * waits for a short pause, any other change goes at once.
 */
export function useAutosave(): void {
  const revision = useSheet((state) => state.revision);
  const urgent = useSheet((state) => state.urgent);

  useEffect(() => {
    window.clearTimeout(debounceTimer);
    if (urgent) flushNow();
    else debounceTimer = window.setTimeout(flushNow, TYPING_DELAY_MS);
  }, [revision, urgent]);

  useEffect(() => {
    window.addEventListener('pagehide', flushOnExit);
    return () => window.removeEventListener('pagehide', flushOnExit);
  }, []);
}
