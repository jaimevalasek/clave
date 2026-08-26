import { metalOf } from '../../ui/typeColors';
import type { BlockType } from '../../../shared/types';

interface PrivateNoteProps {
  note: string;
  type: BlockType;
  overrunSeconds: number;
  formatTimecode(seconds: number): string;
}

/**
 * A camada privada é capturada pelo OBS se vazar. Por isso o nó só existe no
 * DOM enquanto `N` está pressionada — nunca escondido por `visibility` ou
 * `opacity`, e sem nenhum estado persistente de "notas visíveis".
 */
export function PrivateNote({ note, type, overrunSeconds, formatTimecode }: PrivateNoteProps) {
  const metal = metalOf(type);
  return (
    <div
      className="painel-privado"
      style={{ borderColor: metal.token }}
      data-testid="camada-privada"
    >
      <div className="rot" style={{ color: metal.token }}>
        NOTAS PRIVADAS · SÓ ENQUANTO VOCÊ SEGURA N
      </div>
      <div className="nota-texto">
        {note ? note : <i className="sem-nota">Este bloco não tem nota privada.</i>}
      </div>
      {overrunSeconds > 0 ? (
        <div className="estouro-nota">+{formatTimecode(overrunSeconds)} além do previsto</div>
      ) : null}
    </div>
  );
}
