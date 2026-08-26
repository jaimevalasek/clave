import { useState } from 'react';
import { resolveFileSource, resolveVideoSource } from './videoSource';
import type { Attachment } from '../../../shared/types';

interface PrivatePanelProps {
  attachment: Attachment;
  onClose(): void;
}

/**
 * Painel "só você vê": o anexo sem `telaCheia` abre aqui, na camada privada do
 * apresentador. Este nó nunca é renderizado na camada pública — ele existe
 * apenas enquanto o painel está aberto.
 */
export function PrivatePanel({ attachment, onClose }: PrivatePanelProps) {
  const [failed, setFailed] = useState(false);
  const source =
    attachment.type === 'video' ? resolveVideoSource(attachment.path) : resolveFileSource(attachment.path);

  return (
    <div className="painel-so-voce" data-testid="painel-so-voce">
      <div className="rot">SÓ VOCÊ VÊ · NÃO ESTÁ NA TELA CAPTURADA</div>

      <div className="previa-privada">
        {failed || source.kind === 'unknown' ? (
          <div className="erro-midia" role="alert" data-testid="erro-midia">
            <b>{attachment.label}</b> não abriu: o arquivo não foi encontrado
          </div>
        ) : attachment.type === 'image' ? (
          <img
            className="midia-real"
            src={source.url}
            alt={attachment.label}
            onError={() => setFailed(true)}
          />
        ) : attachment.type === 'video' && source.kind === 'youtube' ? (
          <iframe className="midia-real" src={source.url} title={attachment.label} allowFullScreen />
        ) : attachment.type === 'video' ? (
          <video
            className="midia-real"
            src={source.url}
            controls
            playsInline
            onError={() => setFailed(true)}
          />
        ) : (
          <a className="abrir-externo" href={source.url} target="_blank" rel="noreferrer noopener">
            Abrir {attachment.label} em nova janela
          </a>
        )}
      </div>

      <div className="termo">{attachment.label}</div>
      <div className="mono caminho-anexo">{attachment.path}</div>
      <button type="button" className="btn btn-fantasma" onClick={onClose}>
        Fechar (Esc)
      </button>
    </div>
  );
}
