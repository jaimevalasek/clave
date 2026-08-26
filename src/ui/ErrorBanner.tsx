import { ApiError } from '../core/api';
import { COPY } from '../core/vocabulary';

interface ErrorBannerProps {
  /** A ação que falhou, no infinitivo: "salvar a pauta", "apagar o bloco". */
  action: string;
  error: unknown;
  onRetry?: () => void;
}

function describe(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isUnreachable) return COPY.errors.backendDown;
    return error.message;
  }
  return 'Erro inesperado. Tente de novo.';
}

/**
 * Faixa de erro de escrita: nomeia a ação que falhou e o que fazer. Nada é dado
 * como salvo sem confirmação da gravação, e o que o criador digitou continua
 * no formulário.
 */
export function ErrorBanner({ action, error, onRetry }: ErrorBannerProps) {
  if (!error) return null;
  return (
    <div className="faixa-erro" role="alert" data-testid="faixa-erro">
      <div>
        <div className="rot">Não foi possível {action}</div>
        <p>
          {describe(error)} {COPY.errors.keepTyped}
        </p>
      </div>
      {onRetry ? (
        <button type="button" className="btn btn-fantasma" onClick={onRetry}>
          Tentar de novo
        </button>
      ) : null}
    </div>
  );
}
