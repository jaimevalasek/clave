import { formatTimecode } from '../../../shared/time';
import { Modal } from '../../ui/Modal';
import type { Run } from '../../../shared/types';

interface OpenRunModalProps {
  run: Run;
  onResume(): void;
  onFinishRetroactively(): void;
  onPostpone(): void;
}

/** Fim do último passo gravado: é até onde o trajeto chegou. */
function recordedUpTo(run: Run): number {
  const last = run.steps[run.steps.length - 1];
  if (!last) return 0;
  return last.startOffsetSeconds + (last.actualSeconds ?? 0);
}

/**
 * A execução em aberto pertence a uma pauta. Abrir essa pauta oferece as duas
 * saídas — retomar no bloco onde parou ou encerrar retroativamente no último
 * passo registrado. Nenhuma das duas descarta o trajeto.
 */
export function OpenRunModal({
  run,
  onResume,
  onFinishRetroactively,
  onPostpone
}: OpenRunModalProps) {
  return (
    <Modal
      title="Execução em aberto encontrada"
      consequence={`Esta pauta entrou no ar e não foi encerrada (trajeto gravado até ${formatTimecode(
        recordedUpTo(run)
      )}). O que fazer com ela?`}
      onDismiss={onPostpone}
      actions={[
        { label: 'Deixar para depois', onSelect: onPostpone },
        { label: 'Encerrar retroativamente', onSelect: onFinishRetroactively },
        { label: 'Retomar de onde parou', intent: 'ouro', onSelect: onResume }
      ]}
    />
  );
}
