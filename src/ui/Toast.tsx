import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

export interface ToastAction {
  label: string;
  onSelect: () => void;
}

interface ToastEntry {
  id: number;
  message: string;
  action?: ToastAction;
}

interface ToastApi {
  push(message: string, action?: ToastAction): void;
  /** Some com os avisos pendentes — o Palco é tela capturada e não os carrega. */
  clear(): void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<ToastEntry[]>([]);
  const nextId = useRef(1);

  const remove = useCallback((id: number) => {
    setEntries((current) => current.filter((entry) => entry.id !== id));
  }, []);

  const push = useCallback(
    (message: string, action?: ToastAction) => {
      const id = nextId.current++;
      setEntries((current) => [...current, { id, message, action }]);
      window.setTimeout(() => remove(id), 5200);
    },
    [remove]
  );

  const clear = useCallback(() => setEntries([]), []);

  const api = useMemo(() => ({ push, clear }), [push, clear]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div id="toasts" aria-live="polite">
        {entries.map((entry) => (
          <div className="toast" key={entry.id} data-testid="toast">
            <span>{entry.message}</span>
            {entry.action ? (
              <button
                type="button"
                onClick={() => {
                  entry.action?.onSelect();
                  remove(entry.id);
                }}
              >
                {entry.action.label}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast precisa de um <ToastProvider> acima na árvore.');
  return api;
}
