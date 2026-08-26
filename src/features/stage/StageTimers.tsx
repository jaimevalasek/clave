import { metalOf } from '../../ui/typeColors';
import { formatTimecode, minutesFromSeconds } from '../../../shared/time';
import type { RunClock } from './useRunClock';
import type { Block, BlockType } from '../../../shared/types';

interface StageTimersProps {
  clock: RunClock;
  currentType: BlockType;
  next: Block | null;
  inRescue: boolean;
  /** Previsto que ainda falta para fechar a pauta, contando o bloco no ar. */
  remainingSeconds: number;
}

/**
 * Lateral do Palco, e as duas únicas perguntas que o tempo responde aqui: há
 * quanto tempo eu estou neste assunto, e quanto falta para fechar a pauta. Nada
 * disso é timecode do vídeo — o Clave mede a própria execução.
 */
export function StageTimers({
  clock,
  currentType,
  next,
  inRescue,
  remainingSeconds
}: StageTimersProps) {
  const metal = metalOf(currentType);
  const progress = clock.plannedSeconds
    ? Math.min(100, (clock.blockSeconds / clock.plannedSeconds) * 100)
    : 0;

  return (
    <div className="lateral-palco">
      <div className="cron-bloco" data-testid="cronometro-bloco">
        <div className="rot">neste assunto</div>
        <div className="num mono" data-testid="relogio-bloco">
          {formatTimecode(clock.blockSeconds)}
        </div>
        <div className="prev">previsto {formatTimecode(clock.plannedSeconds)}</div>
        <div
          className={`barra-tempo${clock.overrun ? ' estourado' : ''}`}
          data-testid="barra-bloco"
        >
          <i style={{ width: `${progress}%`, background: metal.token }} />
        </div>
        {clock.overrun ? (
          <div className="aviso-estouro" data-testid="aviso-estouro">
            +{formatTimecode(clock.blockSeconds - clock.plannedSeconds)} além do previsto
          </div>
        ) : null}
      </div>

      <div className="falta-pauta" data-testid="falta-pauta">
        <div className="rot">falta para fechar a pauta</div>
        <div className="num-falta mono" data-testid="minutos-restantes">
          {minutesFromSeconds(remainingSeconds)}
          <span className="un">min</span>
        </div>
      </div>

      <div className="a-seguir">
        <div className="rot">{inRescue ? 'de volta à pauta' : 'a seguir'}</div>
        <div className="prox" data-testid="proximo-bloco">
          {next ? next.title : 'fim da pauta'}
        </div>
        {next ? (
          <div className="prev mono" style={{ color: metalOf(next.type).token }}>
            {metalOf(next.type).label} · {next.durationMinutes}min
          </div>
        ) : null}
      </div>
    </div>
  );
}
