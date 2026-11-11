import { useState } from 'react';
import type { Attachment } from '../../../shared/types';
import { isTextual, isWebUrl } from '../../../shared/validation/attachment';
import { resolveFileSource, resolveVideoSource } from '../attachments/videoSource';
import '../attachments/attachments.css';

interface StageCarouselProps {
  attachments: Attachment[];
  index: number;
  brokenIds: Set<string>;
  onPrev(): void;
  onNext(): void;
  onOpen(attachment: Attachment): void;
  onCopy?(attachment: Attachment): void;
}

const LINK_ICON = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const COPY_ICON = (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const CHECK_ICON = (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

function hostOf(path: string): string {
  if (!isWebUrl(path)) return path;
  try {
    return new URL(path).host;
  } catch {
    return path;
  }
}

function SlideLink({
  attachment,
  broken,
  onCopy
}: {
  attachment: Attachment;
  broken: boolean;
  onCopy?(attachment: Attachment): void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(attachment.path);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onCopy?.(attachment);
    } catch {
      // fallback
    }
  };

  return (
    <div className={`carrossel-link-card${broken ? ' quebrado' : ''}`} data-testid="carrossel-link">
      {broken ? (
        <div className="erro-midia link-erro-banner" role="alert">
          <b>{attachment.label}</b> · arquivo não encontrado
        </div>
      ) : null}

      <div className="carrossel-link-corpo">
        <div className="carrossel-link-icone" aria-hidden="true">
          {LINK_ICON}
        </div>
        <div className="carrossel-link-dados">
          <div className="carrossel-link-label">{attachment.label}</div>
          <div className="carrossel-link-url mono" title={attachment.path}>
            {attachment.path}
          </div>
        </div>
        <button
          type="button"
          className={`btn-copiar-link${copied ? ' copiado' : ''}`}
          data-testid={`copiar-link-${attachment.id}`}
          title="Copiar link"
          aria-label={`Copiar link ${attachment.label}`}
          onClick={handleCopy}
        >
          {copied ? (
            <>
              {CHECK_ICON}
              <span>copiado!</span>
            </>
          ) : (
            <>
              {COPY_ICON}
              <span>copiar</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function SlideMedia({
  attachment,
  broken,
  onCopy
}: {
  attachment: Attachment;
  broken: boolean;
  onCopy?(attachment: Attachment): void;
}) {
  if (attachment.type === 'link') {
    return <SlideLink attachment={attachment} broken={broken} onCopy={onCopy} />;
  }
  const textual = isTextual(attachment.type);
  const publicMedia = attachment.fullscreen && (attachment.type === 'image' || attachment.type === 'video');

  if (broken) {
    return (
      <div className="erro-midia" role="alert">
        <b>{attachment.label}</b> · arquivo não encontrado
      </div>
    );
  }

  if (textual) {
    return <pre className="carrossel-conteudo">{attachment.content}</pre>;
  }

  if (!publicMedia) {
    if (!isWebUrl(attachment.path)) return null;
    return <div className="carrossel-origem">{hostOf(attachment.path)}</div>;
  }

  if (attachment.type === 'image') {
    const source = resolveFileSource(attachment.path);
    if (source.kind === 'unknown') {
      return (
        <div className="erro-midia" role="alert">
          <b>{attachment.label}</b> · a origem do anexo não foi reconhecida
        </div>
      );
    }
    return <img className="midia-real" src={source.url} alt={attachment.label} />;
  }

  const source = resolveVideoSource(attachment.path);
  if (source.kind === 'unknown') {
    return (
      <div className="erro-midia" role="alert">
        <b>{attachment.label}</b> · a origem do anexo não foi reconhecida
      </div>
    );
  }
  if (source.kind === 'youtube') {
    return (
      <iframe
        className="midia-real"
        src={source.url}
        title={attachment.label}
        allow="accelerometer; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    );
  }
  return <video className="midia-real" src={source.url} controls playsInline />;
}

/**
 * Um anexo por página no Palco. A mídia pública pinta no quadro capturado;
 * anexo privado mostra só o cartão, sem vazar o arquivo na tela do OBS.
 */
export function StageCarousel({
  attachments,
  index,
  brokenIds,
  onPrev,
  onNext,
  onOpen,
  onCopy
}: StageCarouselProps) {
  const attachment = attachments[index];
  if (!attachment) return null;

  const textual = isTextual(attachment.type);
  const broken = brokenIds.has(attachment.id);
  const web = isWebUrl(attachment.path);
  const pages = attachments.length;

  return (
    <div className="carrossel-palco" data-testid="anexos-palco">
      <div
        className={`carrossel-quadro${broken ? ' quebrado' : ''}`}
        data-testid={`anexo-${attachment.id}`}
      >
        <SlideMedia attachment={attachment} broken={broken} onCopy={onCopy} />
        <div className="carrossel-acoes">
          {broken ? null : attachment.fullscreen ? (
            <span className="tc">{web ? 'WEB · ' : ''}TELA CHEIA</span>
          ) : textual ? null : (
            <span className="tc privado-rotulo">SÓ VOCÊ</span>
          )}
          <button
            type="button"
            className="acao-anexo"
            data-testid={`acao-anexo-${attachment.id}`}
            onClick={() => onOpen(attachment)}
          >
            {textual ? 'copiar' : 'abrir'}
          </button>
        </div>
      </div>
      <div className="carrossel-legenda">{attachment.label}</div>

      {pages > 1 ? (
        <div className="carrossel-nav" role="group" aria-label="Páginas de anexo">
          <button
            type="button"
            className="botao-palco"
            data-testid="carrossel-anterior"
            aria-label="Anexo anterior"
            disabled={index === 0}
            onClick={onPrev}
          >
            ←
          </button>
          <span className="carrossel-pagina mono" data-testid="carrossel-pagina">
            {index + 1} / {pages}
          </span>
          <button
            type="button"
            className="botao-palco"
            data-testid="carrossel-proximo"
            aria-label="Próximo anexo"
            disabled={index === pages - 1}
            onClick={onNext}
          >
            →
          </button>
        </div>
      ) : null}
    </div>
  );
}
