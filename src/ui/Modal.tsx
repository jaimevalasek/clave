import { useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { useFocusTrap } from './useFocusTrap';
import './modal.css';

export interface ModalAction {
  label: string;
  /** `primary` is the gate (a human decision); `danger` is the destructive confirmation. */
  intent?: 'primary' | 'danger' | 'ghost';
  onSelect?: () => void;
  /** An action that validates first keeps the modal open and closes it itself. */
  keepOpen?: boolean;
  /** Receives the initial focus instead of the first control. */
  autoFocus?: boolean;
}

interface ModalProps {
  title: string;
  text?: ReactNode;
  children?: ReactNode;
  actions: ModalAction[];
  destructive?: boolean;
  onDismiss: () => void;
}

const INTENT_CLASS: Record<NonNullable<ModalAction['intent']>, string> = {
  primary: 'btn btn-primary',
  danger: 'btn btn-danger',
  ghost: 'btn'
};

/**
 * Design-system modal. The product never uses native `alert`, `confirm` or
 * `prompt`: every destructive confirmation goes through here, with a title that
 * names the target, one line of consequence and Esc cancelling. Focus is
 * trapped inside and returns to the opener on close (AC-pauta-revelavel-53).
 */
export function Modal({ title, text, children, actions, destructive = false, onDismiss }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useFocusTrap(dialogRef, onDismiss);

  return (
    <div
      className="modal-backdrop"
      data-testid="modal"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onDismiss();
      }}
    >
      <div
        className={`modal${destructive ? ' destructive' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={dialogRef}
      >
        <h2 id={titleId}>{title}</h2>
        {text ? <p className="modal-text">{text}</p> : null}
        {children}
        <div className="modal-actions">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              className={INTENT_CLASS[action.intent ?? 'ghost']}
              data-autofocus={action.autoFocus ? 'true' : undefined}
              onClick={() => {
                if (action.keepOpen) {
                  action.onSelect?.();
                  return;
                }
                onDismiss();
                action.onSelect?.();
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
