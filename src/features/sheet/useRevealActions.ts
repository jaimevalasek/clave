import { useMemo } from 'react';
import { COPY } from '../../core/vocabulary';
import { prefersReducedMotion, scrollBehavior } from '../../ui/reducedMotion';
import { useToast } from '../../ui/Toast';
import type { RevealRefusal } from '../../../shared/reveal';
import { shortcutTarget, toggleMedia } from './mediaPlayback';
import { selectBlock, useSheet } from './sheetStore';
import {
  hideLastStep,
  revealNextBlock,
  revealNextTopicBlocks,
  startNewTake,
  toggleBlockEye,
  togglePreparation
} from './takeOps';
import type { TakeChange } from './takeOps';

export interface RevealActions {
  revealNext(): void;
  revealTopic(): void;
  hideLast(): void;
  toggleEye(key: string): void;
  togglePreparation(): void;
  /** Called after "Começar uma nova tomada?" is confirmed. */
  newTake(): void;
  /** Ctrl+Enter: plays or pauses the selected media, or the one revealed last (BR-pauta-revelavel-09). */
  toggleMedia(): void;
}

const REFUSAL_TEXT: Record<RevealRefusal, string> = {
  empty: COPY.sheet.revealEmpty,
  'all-shown': COPY.sheet.revealAllShown,
  'nothing-revealed': COPY.sheet.hideNothing
};

function editingText(): boolean {
  return Boolean(document.activeElement?.closest('[data-testid="block-text"]'));
}

/**
 * The reveal commands with their feedback: refusal and confirmation toasts
 * (AC-pauta-revelavel-22 to -29). The screen changes before any save
 * (RULE-pauta-revelavel-11); a revealed block becomes the selected one unless
 * a text is being edited, so the caret is never taken away.
 */
export function useRevealActions(): RevealActions {
  const toast = useToast();

  return useMemo(() => {
    const ready = () => useSheet.getState().status === 'ready';
    const fade = () => !prefersReducedMotion();

    const afterReveal = (result: TakeChange | RevealRefusal): TakeChange | null => {
      if (typeof result === 'string') {
        toast.push(REFUSAL_TEXT[result]);
        return null;
      }
      const last = result.keys[result.keys.length - 1];
      if (last && !editingText()) selectBlock(last);
      return result;
    };

    return {
      revealNext() {
        if (ready()) afterReveal(revealNextBlock());
      },
      revealTopic() {
        if (!ready()) return;
        const result = afterReveal(revealNextTopicBlocks());
        if (result && result.onScreen.length > 1) toast.push(COPY.sheet.topicRevealed(result.onScreen.length - 1));
      },
      hideLast() {
        if (!ready()) return;
        const result = hideLastStep(fade());
        if (typeof result === 'string') toast.push(REFUSAL_TEXT[result]);
      },
      toggleEye(key) {
        const outcome = toggleBlockEye(key, fade());
        if (!outcome) return;
        if (!outcome.hidden) {
          if (!editingText()) selectBlock(key);
          return;
        }
        // In preparation the block stays in view, dimmed: the change speaks for itself.
        if (!useSheet.getState().preparing) {
          toast.push(outcome.withSubItems ? COPY.sheet.eyeHidTopic : COPY.sheet.eyeHidBlock);
        }
      },
      togglePreparation() {
        if (!ready()) return;
        toast.push(togglePreparation() ? COPY.sheet.preparationOn : COPY.sheet.preparationOff);
      },
      newTake() {
        startNewTake();
        window.scrollTo({ top: 0, behavior: scrollBehavior() });
        toast.push(COPY.sheet.newTakeDone);
      },
      toggleMedia() {
        if (!ready()) return;
        const { blocks, selectedKey } = useSheet.getState();
        const key = shortcutTarget(blocks, selectedKey);
        if (!key) {
          toast.push(COPY.sheet.noMediaOnScreen);
          return;
        }
        toggleMedia(key).catch(() => toast.push(COPY.sheet.playRefused));
      }
    };
  }, [toast]);
}
