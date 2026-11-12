import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

const FOCUSABLE = 'input, textarea, select, button, [href], [tabindex]:not([tabindex="-1"])';

function focusableIn(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (element) => !element.hasAttribute('disabled') && element.offsetParent !== null
  );
}

function focusInitial(container: HTMLElement): void {
  const preferred =
    container.querySelector<HTMLElement>('input, textarea, select') ??
    container.querySelector<HTMLElement>('[data-autofocus="true"]') ??
    focusableIn(container)[0];
  preferred?.focus();
  if (preferred instanceof HTMLInputElement) preferred.select();
}

function wrapTab(event: KeyboardEvent, container: HTMLElement): void {
  const focusable = focusableIn(container);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;
  if (event.shiftKey && (active === first || !container.contains(active))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (active === last || !container.contains(active))) {
    event.preventDefault();
    first.focus();
  }
}

/**
 * Keeps keyboard focus inside a dialog while it is open, closes it on Esc and
 * gives focus back to whoever opened it (AC-pauta-revelavel-53).
 */
export function useFocusTrap(containerRef: RefObject<HTMLElement | null>, onEscape: () => void): void {
  const escapeRef = useRef(onEscape);
  escapeRef.current = onEscape;

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const container = containerRef.current;
    if (container) focusInitial(container);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        escapeRef.current();
      } else if (event.key === 'Tab' && container) {
        wrapTab(event, container);
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      if (opener && document.contains(opener)) opener.focus();
    };
  }, [containerRef]);
}
