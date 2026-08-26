import { isWebUrl } from '../../../shared/validation/attachment';

/**
 * Origem de um anexo de vídeo: arquivo local da pasta de mídia do app, URL
 * direta na web, ou YouTube em formato de embed.
 */
export type VideoSource =
  | { kind: 'local'; url: string }
  | { kind: 'web'; url: string }
  | { kind: 'youtube'; url: string; videoId: string }
  | { kind: 'unknown' };

const YOUTUBE_HOSTS = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'];

function youtubeVideoId(url: URL): string | null {
  if (url.hostname === 'youtu.be') return url.pathname.slice(1) || null;
  if (!YOUTUBE_HOSTS.includes(url.hostname)) return null;
  if (url.pathname === '/watch') return url.searchParams.get('v');
  if (url.pathname.startsWith('/embed/')) return url.pathname.slice('/embed/'.length) || null;
  if (url.pathname.startsWith('/shorts/')) return url.pathname.slice('/shorts/'.length) || null;
  return null;
}

/** URL same-origin do arquivo guardado na pasta de mídia do app. */
export function localMediaUrl(relativePath: string): string {
  const clean = relativePath.replace(/^\/+/, '');
  return `/api/media/${clean.split('/').map(encodeURIComponent).join('/')}`;
}

export function resolveVideoSource(rawPath: string): VideoSource {
  const path = (rawPath ?? '').trim();
  if (!path) return { kind: 'unknown' };

  if (!isWebUrl(path)) return { kind: 'local', url: localMediaUrl(path) };

  let url: URL;
  try {
    url = new URL(path);
  } catch {
    return { kind: 'unknown' };
  }

  const videoId = youtubeVideoId(url);
  if (videoId) {
    return {
      kind: 'youtube',
      videoId,
      url: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`
    };
  }

  return { kind: 'web', url: url.toString() };
}

/** Imagem e arquivo seguem a mesma regra de origem, sem o caso do YouTube. */
export function resolveFileSource(rawPath: string): VideoSource {
  const source = resolveVideoSource(rawPath);
  return source.kind === 'youtube' ? { kind: 'web', url: source.url } : source;
}
