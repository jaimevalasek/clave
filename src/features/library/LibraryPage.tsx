import { useCallback, useEffect, useState } from 'react';
import { api } from '../../core/api';
import { navigate, routes } from '../../core/router';
import { COPY, VOCABULARY } from '../../core/vocabulary';
import { useWorkspace } from '../../core/store';
import { ErrorBanner } from '../../ui/ErrorBanner';
import { LoadingSkeleton } from '../../ui/LoadingSkeleton';
import { Modal } from '../../ui/Modal';
import { useToast } from '../../ui/Toast';
import { metalOf } from '../../ui/typeColors';
import { daysSince } from '../rundowns/format';
import type { Block, LibraryItem, RundownSummary } from '../../../shared/types';
import { LibraryItemForm } from './LibraryItemForm';
import './library.css';

type Dialog =
  | { kind: 'none' }
  | { kind: 'edit'; item: LibraryItem }
  | { kind: 'remove'; item: LibraryItem };

function airingLabel(item: LibraryItem): string {
  if (!item.lastAiredOn) return 'nunca foi ao ar';
  const days = daysSince(item.lastAiredOn);
  if (days === 0) return 'foi ao ar hoje';
  return `há ${days} dia${days === 1 ? '' : 's'} fora do ar`;
}

export function LibraryPage() {
  const [items, setItems] = useState<LibraryItem[] | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [writeError, setWriteError] = useState<{ action: string; error: unknown } | null>(null);
  const [dialog, setDialog] = useState<Dialog>({ kind: 'none' });
  const toast = useToast();
  const { rundown, apply } = useWorkspace();

  const load = useCallback(async () => {
    try {
      const payload = await api.get<{ items: LibraryItem[] }>('/api/library');
      setItems(payload.items);
      setLoadError(null);
    } catch (error) {
      setLoadError(error);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loadError) {
    return (
      <div className="pagina">
        <ErrorBanner action="carregar o acervo" error={loadError} onRetry={() => void load()} />
      </div>
    );
  }

  if (!items) return <LoadingSkeleton />;

  const bringCopy = async (item: LibraryItem) => {
    if (!rundown) return;
    try {
      setWriteError(null);
      const payload = await api.post<{ rundown: RundownSummary; blocks: Block[] }>(
        `/api/library/${item.id}/copy-to/${rundown.id}`
      );
      apply(payload);
      toast.push(`"${item.title}" trazido para ${rundown.title}`, {
        label: 'Ver na Bancada',
        onSelect: () => navigate(routes.board(rundown.id))
      });
    } catch (error) {
      setWriteError({ action: 'trazer a cópia para a pauta', error });
    }
  };

  return (
    <div className="pagina" data-testid="acervo-grade">
      <div className="eyebrow batuta">Biblioteca de blocos</div>
      <h1>{VOCABULARY.library}</h1>
      <p className="sub">Blocos que já funcionaram, prontos para reciclar sem repetir demais.</p>

      {writeError ? <ErrorBanner action={writeError.action} error={writeError.error} /> : null}

      {items.length ? (
        <div className="grade-acervo">
          {items.map((item) => {
            const metal = metalOf(item.type);
            return (
              <div
                className="item-acervo"
                key={item.id}
                data-metal={item.type}
                data-testid={`acervo-${item.id}`}
              >
                <div className="t">{item.title}</div>
                <div className="m" style={{ color: metal.token }}>
                  {metal.label.toUpperCase()}
                </div>
                <div className="m" data-testid={`contadores-${item.id}`}>
                  {item.airCount}× no ar · {airingLabel(item)}
                </div>
                <div className="acoes-item">
                  <button
                    type="button"
                    className="btn btn-suave"
                    disabled={!rundown}
                    title={rundown ? undefined : 'Abra uma pauta para trazer a cópia'}
                    onClick={() => void bringCopy(item)}
                  >
                    Trazer cópia para a pauta atual
                  </button>
                  <button type="button" onClick={() => setDialog({ kind: 'edit', item })}>
                    Editar
                  </button>
                  <button type="button" onClick={() => setDialog({ kind: 'remove', item })}>
                    Remover
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="vazio" data-testid="estado-vazio-acervo">
          <h2>Acervo vazio</h2>
          <p>
            Guarde um bloco pela gaveta da Bancada ("Guardar no acervo") e ele aparece aqui com
            contador de uso.
          </p>
        </div>
      )}

      {dialog.kind === 'edit' ? (
        <LibraryItemForm
          item={dialog.item}
          onDismiss={() => setDialog({ kind: 'none' })}
          onSaved={() => {
            setDialog({ kind: 'none' });
            toast.push('Item do acervo salvo');
            void load();
          }}
        />
      ) : null}

      {dialog.kind === 'remove' ? (
        <Modal
          title={`Remover "${dialog.item.title}" do acervo?`}
          consequence="O item do acervo sai da lista. Os blocos já trazidos para pautas continuam onde estão. Esta ação não pode ser desfeita."
          onDismiss={() => setDialog({ kind: 'none' })}
          actions={[
            { label: COPY.common.cancel },
            {
              label: 'Remover do acervo',
              intent: 'perigo',
              onSelect: () =>
                void (async () => {
                  try {
                    setWriteError(null);
                    await api.delete(`/api/library/${dialog.item.id}`);
                    toast.push('Item do acervo removido');
                    await load();
                  } catch (error) {
                    setWriteError({ action: 'remover o item do acervo', error });
                  }
                })()
            }
          ]}
        />
      ) : null}
    </div>
  );
}
