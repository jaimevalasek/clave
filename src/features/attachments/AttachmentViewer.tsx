import { useState } from 'react';
import { resolveFileSource, resolveVideoSource } from './videoSource';
import type { Attachment } from '../../../shared/types';
import './attachments.css';

interface AttachmentViewerProps {
  attachment: Attachment;
  onClose(): void;
}

function BrokenMedia({ label, reason }: { label: string; reason: string }) {
  return (
    <div className="erro-midia" role="alert" data-testid="erro-midia">
      <b>{label}</b> não abriu: {reason}
    </div>
  );
}

function Media({ attachment, onFail }: { attachment: Attachment; onFail(): void }) {
  const source =
    attachment.type === 'video' ? resolveVideoSource(attachment.path) : resolveFileSource(attachment.path);

  if (source.kind === 'unknown') {
    return <BrokenMedia label={attachment.label} reason="a origem do anexo não foi reconhecida" />;
  }

  if (attachment.type === 'image') {
    return (
      <img className="midia-real" src={source.url} alt={attachment.label} onError={onFail} />
    );
  }

  if (attachment.type === 'video') {
    if (source.kind === 'youtube') {
      return (
        <iframe
          className="midia-real"
          src={source.url}
          title={attachment.label}
          allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      );
    }
    // Vídeo nativo, sem filtro nem blur por cima: a captura do OBS não paga
    // o custo de composição extra enquanto a mídia toca.
    return (
      <video
        className="midia-real"
        src={source.url}
        controls
        autoPlay
        playsInline
        onError={onFail}
      />
    );
  }

  return (
    <a className="abrir-externo" href={source.url} target="_blank" rel="noreferrer noopener">
      Abrir {attachment.label} em nova janela
    </a>
  );
}

/**
 * Tomada de tela: o anexo com `telaCheia` marcado toma a tela capturada, em
 * camada `position: fixed` própria. A poeira do Palco fica inerte enquanto ela
 * está aberta. Falha ao abrir troca a mídia por erro nomeando o anexo.
 */
export function AttachmentViewer({ attachment, onClose }: AttachmentViewerProps) {
  const [failed, setFailed] = useState(false);
  const source =
    attachment.type === 'video' ? resolveVideoSource(attachment.path) : resolveFileSource(attachment.path);

  return (
    <div
      className="tomada"
      data-testid="tomada-tela"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="player">
        {failed ? (
          <BrokenMedia label={attachment.label} reason="o arquivo não foi encontrado" />
        ) : (
          <Media attachment={attachment} onFail={() => setFailed(true)} />
        )}
      </div>
      <div className="legenda">{attachment.label}</div>
      <div className="origem mono">
        {source.kind === 'local' ? 'arquivo local' : 'mídia da web'} · {attachment.path}
      </div>
      <div className="origem">Esc ou clique fora para devolver a tela à pauta</div>
    </div>
  );
}
