import { ApiError } from '../core/api';
import { COPY } from '../core/vocabulary';

interface ErrorBannerProps {
  /** The action that failed, in the infinitive: "abrir a pauta", "carregar as pautas". */
  action: string;
  error: unknown;
  onRetry?: () => void;
}

function describe(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isUnreachable) return COPY.errors.backendDown;
    return error.message;
  }
  return COPY.errors.unexpected;
}

/** Error banner: names the action that failed and what to do (AC-pauta-revelavel-57). */
export function ErrorBanner({ action, error, onRetry }: ErrorBannerProps) {
  if (!error) return null;
  return (
    <div className="error-banner" role="alert" data-testid="error-banner">
      <div>
        <div className="error-label">Não foi possível {action}</div>
        <p>{describe(error)}</p>
      </div>
      {onRetry ? (
        <button type="button" className="btn" onClick={onRetry}>
          {COPY.common.retry}
        </button>
      ) : null}
    </div>
  );
}
