import { create } from 'zustand';
import { shownFlags } from '../../../shared/reveal';
import type { DraftBlock } from './sheetStore';

// Video and audio play inside their block, on the presenter's command
// (CAP-pauta-revelavel-midia). One media plays at a time; the elements
// register here by block key and their own play/pause events drive the state.

const elements = new Map<string, HTMLMediaElement>();

export const usePlayback = create<{ playingKey: string | null }>(() => ({ playingKey: null }));

export function markPlaying(key: string): void {
  usePlayback.setState({ playingKey: key });
}

export function markStopped(key: string): void {
  if (usePlayback.getState().playingKey === key) usePlayback.setState({ playingKey: null });
}

/** Ref of a media element: registered while it is in the page; leaving the page stops it. */
export function registerMedia(key: string, element: HTMLMediaElement | null): void {
  if (element) {
    elements.set(key, element);
    return;
  }
  elements.get(key)?.pause();
  elements.delete(key);
  markStopped(key);
}

export function pauseMedia(key: string): void {
  const element = elements.get(key);
  if (element && !element.paused) element.pause();
}

/**
 * Plays a media block and pauses any other; the same command on the block
 * that is playing pauses it (AC-pauta-revelavel-33). Rejects when the
 * browser refuses to play.
 */
export async function toggleMedia(key: string): Promise<void> {
  const element = elements.get(key);
  if (!element) return;
  if (!element.paused) {
    element.pause();
    return;
  }
  elements.forEach((other, otherKey) => {
    if (otherKey !== key && !other.paused) other.pause();
  });
  await element.play();
}

function isPlayable(block: DraftBlock | undefined, shown: boolean): boolean {
  return Boolean(block && shown && (block.kind === 'video' || block.kind === 'audio') && !block.intake && !block.mediaMissing);
}

/**
 * What Ctrl+Enter plays (BR-pauta-revelavel-09): the selected media block on
 * screen; otherwise the media on screen revealed last (the latest in the
 * sheet among equals); null when no video or audio is on screen.
 */
export function shortcutTarget(blocks: readonly DraftBlock[], selectedKey: string | null): string | null {
  const shown = shownFlags(blocks);
  const selected = blocks.findIndex((block) => block.key === selectedKey);
  if (selected >= 0 && isPlayable(blocks[selected], shown[selected])) return blocks[selected].key;
  let target: string | null = null;
  let step = -1;
  blocks.forEach((block, index) => {
    if (!isPlayable(block, shown[index])) return;
    const revealed = block.revealStep ?? 0;
    if (revealed >= step) {
      step = revealed;
      target = block.key;
    }
  });
  return target;
}
