import { Modal } from '../../ui/Modal';
import type { PreflightProblem } from '../../../shared/types';

interface GoLiveGateProps {
  problems: PreflightProblem[];
  onConfirm(): void;
  onDismiss(): void;
}

/**
 * Entrar no ar é um gate explícito. Quando a checagem pré-live acha anexo local
 * inexistente, os blocos são nomeados antes de a execução começar — o criador
 * não descobre isso ao vivo.
 */
export function GoLiveGate({ problems, onConfirm, onDismiss }: GoLiveGateProps) {
  if (!problems.length) {
    return (
      <Modal
        title="Entrar no ar?"
        consequence="O Palco abre em tela cheia e a execução começa a gravar o trajeto. Os anexos foram conferidos e estão todos no lugar."
        onDismiss={onDismiss}
        actions={[
          { label: 'Voltar à Bancada' },
          { label: 'Entrar no ar', intent: 'ouro', onSelect: onConfirm }
        ]}
      />
    );
  }

  return (
    <Modal
      title="Checagem de anexos antes de entrar no ar"
      consequence={`${problems.length} anexo${problems.length > 1 ? 's' : ''} com problema. Os blocos ficam marcados no Palco; a mídia quebrada não abre.`}
      onDismiss={onDismiss}
      actions={[
        { label: 'Voltar à Bancada' },
        { label: 'Entrar mesmo assim', intent: 'ouro', onSelect: onConfirm }
      ]}
    >
      <ul className="lista-check" data-testid="checagem-pre-live">
        {problems.map((problem) => (
          <li key={problem.attachmentId}>
            <span className="ponto-erro">!</span>
            <span>
              <b>{problem.blockTitle}</b> · {problem.attachmentLabel}
              <br />
              <span className="mono caminho-quebrado">{problem.attachmentPath}</span>{' '}
              <span className="marca-erro">arquivo não encontrado</span>
            </span>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
