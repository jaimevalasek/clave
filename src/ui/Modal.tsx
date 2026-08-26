import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import './modal.css';

export interface ModalAction {
  label: string;
  /** `ouro` é o gate (decisão humana); `perigo` é a confirmação destrutiva. */
  intent?: 'ouro' | 'perigo' | 'fantasma';
  onSelect?: () => void;
  /** Ação que valida antes de fechar mantém o modal aberto e fecha por conta própria. */
  keepOpen?: boolean;
}

interface ModalProps {
  title: string;
  consequence?: ReactNode;
  children?: ReactNode;
  actions: ModalAction[];
  onDismiss: () => void;
}

const INTENT_CLASS: Record<NonNullable<ModalAction['intent']>, string> = {
  ouro: 'btn-ar',
  perigo: 'btn-perigo',
  fantasma: 'btn-fantasma'
};

/**
 * Modal do design system. O produto nunca usa `alert`, `confirm` ou `prompt`
 * nativos: toda confirmação destrutiva passa por aqui, com título nomeando o
 * alvo, uma linha de consequência e `Esc` cancelando.
 */
export function Modal({ title, consequence, children, actions, onDismiss }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onDismiss();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [onDismiss]);

  useEffect(() => {
    const focusable = dialogRef.current?.querySelector<HTMLElement>(
      'input, textarea, select, button'
    );
    focusable?.focus();
  }, []);

  return (
    <div
      className="modal-fundo"
      data-testid="modal"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onDismiss();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} ref={dialogRef}>
        <h2>{title}</h2>
        {consequence ? <p className="consequencia">{consequence}</p> : null}
        {children}
        <div className="acoes-modal">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              className={`btn ${INTENT_CLASS[action.intent ?? 'fantasma']}`}
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
