import { useCallback, useEffect, useState } from 'react';
import { api } from '../../core/api';
import { navigate, routes } from '../../core/router';
import { COPY, VOCABULARY } from '../../core/vocabulary';
import { ErrorBanner } from '../../ui/ErrorBanner';
import { LoadingSkeleton } from '../../ui/LoadingSkeleton';
import { metalOf } from '../../ui/typeColors';
import { formatTimecode } from '../../../shared/time';
import type { BlockType, Run } from '../../../shared/types';
import './report.css';

interface ReportLine {
  stepId: string;
  blockTitle: string;
  blockType: BlockType;
  startOffsetSeconds: number;
  plannedSeconds: number;
  actualSeconds: number;
  deltaSeconds: number;
  wasRescue: boolean;
}

interface Report {
  run: Run;
  lines: ReportLine[];
  totals: {
    plannedSeconds: number;
    actualSeconds: number;
    deltaSeconds: number;
    rescueCount: number;
  };
}

/**
 * O relatório responde uma pergunta só: quanto tempo cada assunto levou contra
 * o que estava previsto. Os tempos são relativos à execução — a pauta não
 * começa junto com a gravação, então nada aqui vira timecode do vídeo.
 */
export function ReportPage({ runId }: { runId: string }) {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    try {
      const payload = await api.get<{ report: Report }>(`/api/runs/${runId}/report`);
      setReport(payload.report);
      setError(null);
    } catch (failure) {
      setError(failure);
    }
  }, [runId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) {
    return (
      <div className="pagina">
        <ErrorBanner action="abrir o relatório" error={error} onRetry={() => void load()} />
        <button type="button" className="btn btn-suave" onClick={() => navigate(routes.rundowns())}>
          {COPY.nav.backToRundowns}
        </button>
      </div>
    );
  }

  if (!report) return <LoadingSkeleton />;

  const { run, lines, totals } = report;
  const maxSeconds = Math.max(
    1,
    ...lines.map((line) => Math.max(line.actualSeconds, line.plannedSeconds))
  );

  return (
    <div className="pagina pagina-relatorio" data-testid="relatorio">
      <button type="button" className="voltar" onClick={() => navigate(routes.rundowns())}>
        {COPY.nav.backToRundowns}
      </button>
      <div className="eyebrow batuta">{VOCABULARY.trajectory} gravado</div>
      <h1>{run.rundownTitle}</h1>
      <p className="sub mono" data-testid="resumo-trajeto">
        {formatTimecode(totals.actualSeconds)} no ar · previsto{' '}
        {formatTimecode(totals.plannedSeconds)} · {totals.rescueCount} resgate
        {totals.rescueCount === 1 ? '' : 's'} sacado{totals.rescueCount === 1 ? '' : 's'}
      </p>

      {lines.length ? (
        <table className="rel-tabela" data-testid="tabela-trajeto">
          <thead>
            <tr>
              <th>Começou em</th>
              <th>Bloco (trajeto real)</th>
              <th>planejado × tocado</th>
              <th>Prev.</th>
              <th>Real</th>
              <th>Δ</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => {
              const metal = metalOf(line.blockType);
              return (
                <tr key={line.stepId}>
                  <td className="mono inicio">{formatTimecode(line.startOffsetSeconds)}</td>
                  <td>
                    <span className="tipo-linha" style={{ color: metal.token }}>
                      {metal.label.toUpperCase()}
                    </span>
                    <br />
                    {line.blockTitle}{' '}
                    {line.wasRescue ? <span className="selo-res">RESGATE</span> : null}
                  </td>
                  <td>
                    <div className="barra-comp">
                      <i
                        className="prev-b"
                        style={{ width: `${(line.plannedSeconds / maxSeconds) * 100}%` }}
                      />
                      <i
                        style={{
                          width: `${(line.actualSeconds / maxSeconds) * 100}%`,
                          background: metal.token
                        }}
                      />
                    </div>
                  </td>
                  <td className="mono">{formatTimecode(line.plannedSeconds)}</td>
                  <td className="mono">{formatTimecode(line.actualSeconds)}</td>
                  <td className={`mono ${line.deltaSeconds > 0 ? 'delta-mais' : 'delta-menos'}`}>
                    {line.deltaSeconds > 0 ? '+' : '−'}
                    {formatTimecode(Math.abs(line.deltaSeconds))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <div className="vazio" data-testid="trajeto-vazio">
          <h2>Nenhum passo gravado</h2>
          <p>Esta execução foi encerrada antes de qualquer bloco entrar no ar.</p>
        </div>
      )}

      <p className="nota-relatorio" data-testid="nota-tempo-relativo">
        Os tempos são contados a partir do momento em que você entrou no ar, não da sua gravação.
        Eles servem para você ver onde a pauta estourou — não para virar marcação de vídeo.
      </p>

      {run.rundownId ? (
        <button
          type="button"
          className="btn btn-suave"
          onClick={() => navigate(routes.board(run.rundownId as string))}
        >
          {COPY.nav.backToBoard}
        </button>
      ) : null}
    </div>
  );
}
