import { useId, useRef, useState } from 'react';
import { ApiError } from '../../core/api';
import {
  BEAT_MAX_DEPTH,
  BEAT_TEXT_MAX_LENGTH,
  BEATS_MAX_PER_BLOCK
} from '../../../shared/validation/beat';
import { resolveFileSource } from '../attachments/videoSource';

export interface BeatDraft {
  id: string;
  text: string;
  imagePath: string;
  done: boolean;
  depth: number;
}

interface BeatFieldsProps {
  beats: BeatDraft[];
  errors: Record<string, string>;
  onChange(beats: BeatDraft[]): void;
}

/**
 * Rascunho de ponto novo. O id é só a chave de renderização da linha: o id
 * definitivo vem do servidor quando a gaveta salva. O nível vem de fora porque
 * um ponto novo nasce irmão do último — quem está escrevendo uma lista de
 * sub-pontos não devia ter de recuar cada linha.
 */
export function emptyBeat(depth = 0): BeatDraft {
  return { id: `rascunho-${crypto.randomUUID()}`, text: '', imagePath: '', done: false, depth };
}

/**
 * Fim da subárvore de um ponto: ele e todos os seguintes mais fundos que ele.
 * A árvore mora na lista plana, então "os filhos" são só o trecho contíguo
 * depois do pai com nível maior.
 */
function subtreeEnd(beats: BeatDraft[], index: number): number {
  let end = index + 1;
  while (end < beats.length && beats[end].depth > beats[index].depth) end += 1;
  return end;
}

/** Começo do irmão anterior, ou `-1` quando este ponto é o primeiro filho. */
function previousSiblingStart(beats: BeatDraft[], index: number): number {
  let cursor = index - 1;
  while (cursor >= 0 && beats[cursor].depth > beats[index].depth) cursor -= 1;
  return cursor >= 0 && beats[cursor].depth === beats[index].depth ? cursor : -1;
}

/**
 * Deixa a lista sempre legível como árvore: primeiro ponto no nível 0 e nenhum
 * ponto mais de um nível abaixo do anterior — a mesma regra que o servidor
 * aplica antes de gravar. Vale como rede de segurança depois de remover uma
 * linha; avanço, recuo e mover já cuidam da subárvore inteira.
 */
function normalizeDepths(beats: BeatDraft[]): BeatDraft[] {
  let previous = -1;
  return beats.map((beat) => {
    const depth = Math.max(0, Math.min(beat.depth, previous + 1, BEAT_MAX_DEPTH));
    previous = depth;
    return depth === beat.depth ? beat : { ...beat, depth };
  });
}

/**
 * Os pontos do bloco na gaveta: a lista que o Palco revela um a um. O checkbox
 * daqui é o mesmo estado que a live marca ao avançar, então desmarcar aqui é
 * como o criador reinicia um ponto sem entrar no ar.
 *
 * Um ponto pode ser sub-ponto de outro em até três níveis. O nível é estrutura
 * visual: o Palco continua revelando e marcando um ponto por vez, nesta mesma
 * ordem, atravessando níveis.
 *
 * A imagem é opcional de verdade: a linha dela só existe depois do `+` daquele
 * ponto. Quem só escreve texto — a maioria — nunca vê o campo.
 */
export function BeatFields({ beats, errors, onChange }: BeatFieldsProps) {
  // Um seletor por linha: a imagem escolhida pertence sempre ao ponto daquela
  // linha, sem estado intermediário que possa apontar para o vizinho.
  const fileInputs = useRef<Record<number, HTMLInputElement | null>>({});
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  // Linhas de imagem abertas nesta sessão, por id de rascunho. A chave é o id
  // da linha, e não o índice: mover ou remover um ponto não pode transferir a
  // abertura para o vizinho.
  const [openImages, setOpenImages] = useState<ReadonlySet<string>>(() => new Set());
  const baseId = useId();

  const commit = (next: BeatDraft[]) => onChange(normalizeDepths(next));

  const patch = (index: number, changes: Partial<BeatDraft>) => {
    commit(beats.map((beat, i) => (i === index ? { ...beat, ...changes } : beat)));
  };

  /**
   * Avançar ou recuar leva a subárvore junto: quem era filho continua filho.
   * Normalizar sozinho não daria isso — o limite `anterior + 1` é teto, não
   * igualdade, então um filho ficaria parado e viraria irmão do próprio pai.
   */
  const shiftDepth = (index: number, delta: 1 | -1) => {
    const end = subtreeEnd(beats, index);
    commit(
      beats.map((beat, i) =>
        i >= index && i < end ? { ...beat, depth: beat.depth + delta } : beat
      )
    );
  };

  /** Subir e descer movem o ponto com os filhos, trocando de lugar com o irmão. */
  const move = (index: number, delta: 1 | -1) => {
    const end = subtreeEnd(beats, index);
    if (delta === 1) {
      const nextEnd = subtreeEnd(beats, end);
      commit([
        ...beats.slice(0, index),
        ...beats.slice(end, nextEnd),
        ...beats.slice(index, end),
        ...beats.slice(nextEnd)
      ]);
      return;
    }
    const start = previousSiblingStart(beats, index);
    commit([
      ...beats.slice(0, start),
      ...beats.slice(index, end),
      ...beats.slice(start, index),
      ...beats.slice(end)
    ]);
  };

  /**
   * O `+` abre a linha de imagem; fechar recolhe e limpa o caminho, porque uma
   * imagem escondida é uma imagem que ainda entraria no Palco sem ninguém ver.
   */
  const toggleImage = (index: number, open: boolean) => {
    const beat = beats[index];
    setOpenImages((current) => {
      const next = new Set(current);
      if (open) next.add(beat.id);
      else next.delete(beat.id);
      return next;
    });
    if (!open && beat.imagePath) patch(index, { imagePath: '' });
  };

  /** A imagem do ponto passa pela mesma pasta de mídia do app que os anexos. */
  const uploadImage = async (index: number, file: File) => {
    setUploadingIndex(index);
    setUploadError(null);
    try {
      const response = await fetch('/api/media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'x-clave-filename': encodeURIComponent(file.name)
        },
        body: file
      });
      const payload = (await response.json()) as {
        media?: { path: string };
        message?: string;
        code?: string;
      };
      if (!response.ok) {
        throw new ApiError(response.status, payload.code ?? 'upload_failed', payload.message ?? '');
      }
      patch(index, { imagePath: payload.media?.path ?? '' });
    } catch (error) {
      setUploadError(
        error instanceof ApiError
          ? error.message
          : 'Não foi possível copiar a imagem para a pasta de mídia do app.'
      );
    } finally {
      setUploadingIndex(null);
    }
  };

  return (
    <div id="pontos-bloco">
      {uploadError ? (
        <div className="erro-campo" role="alert" data-testid="erro-upload-ponto">
          {uploadError}
        </div>
      ) : null}

      {beats.map((beat, index) => {
        const textError = errors[`beats.${index}.text`];
        const preview = beat.imagePath ? resolveFileSource(beat.imagePath) : null;
        // Ponto que já tem imagem gravada nunca aparece sem o campo dela: o
        // opt-in esconde o que ninguém usa, não o que já está em uso.
        const showImage = beat.imagePath !== '' || openImages.has(beat.id);
        const imageRowId = `${baseId}-imagem-${index}`;

        const end = subtreeEnd(beats, index);
        const deepest = Math.max(...beats.slice(index, end).map((entry) => entry.depth));
        // Só dá para avançar até virar filho do ponto de cima, e só até o teto
        // de níveis — contando o filho mais fundo, que desce junto.
        const canIndent =
          index > 0 && beat.depth <= beats[index - 1].depth && deepest < BEAT_MAX_DEPTH;
        const canOutdent = beat.depth > 0;
        const canMoveUp = previousSiblingStart(beats, index) >= 0;
        const canMoveDown = end < beats.length && beats[end].depth === beat.depth;

        return (
          <div
            className="ponto-linha"
            key={beat.id}
            data-nivel={beat.depth}
            data-testid={`ponto-${index}`}
          >
            <div className="linha1">
              <label className="check check-ponto">
                <input
                  type="checkbox"
                  checked={beat.done}
                  aria-label={`Ponto ${index + 1} já falado`}
                  onChange={(event) => patch(index, { done: event.target.checked })}
                />
              </label>
              <input
                type="text"
                value={beat.text}
                placeholder="O que você fala neste ponto"
                autoComplete="off"
                maxLength={BEAT_TEXT_MAX_LENGTH}
                aria-label={`Texto do ponto ${index + 1}`}
                aria-invalid={textError ? true : undefined}
                onChange={(event) => patch(index, { text: event.target.value })}
              />
              <button
                type="button"
                className={`btn btn-fantasma botao-imagem${showImage ? ' aberto' : ''}`}
                data-testid={`alternar-imagem-${index}`}
                aria-expanded={showImage}
                aria-controls={imageRowId}
                aria-label={
                  showImage
                    ? `Tirar a imagem do ponto ${index + 1}`
                    : `Adicionar imagem ao ponto ${index + 1}`
                }
                title={showImage ? 'Tirar a imagem deste ponto' : 'Adicionar imagem a este ponto'}
                onClick={() => toggleImage(index, !showImage)}
              >
                {showImage ? '−' : '+'}
              </button>
              <button
                type="button"
                className="btn btn-fantasma botao-mover"
                data-testid={`recuar-nivel-${index}`}
                aria-label={`Recuar um nível o ponto ${index + 1}`}
                title="Recuar um nível"
                disabled={!canOutdent}
                onClick={() => shiftDepth(index, -1)}
              >
                ←
              </button>
              <button
                type="button"
                className="btn btn-fantasma botao-mover"
                data-testid={`avancar-nivel-${index}`}
                aria-label={`Avançar um nível o ponto ${index + 1}`}
                title="Virar sub-ponto do ponto de cima"
                disabled={!canIndent}
                onClick={() => shiftDepth(index, 1)}
              >
                →
              </button>
              <button
                type="button"
                className="btn btn-fantasma botao-mover"
                aria-label={`Subir o ponto ${index + 1}`}
                disabled={!canMoveUp}
                onClick={() => move(index, -1)}
              >
                ↑
              </button>
              <button
                type="button"
                className="btn btn-fantasma botao-mover"
                aria-label={`Descer o ponto ${index + 1}`}
                disabled={!canMoveDown}
                onClick={() => move(index, 1)}
              >
                ↓
              </button>
              <button
                type="button"
                className="btn btn-fantasma"
                aria-label={`Remover o ponto ${index + 1}`}
                onClick={() => commit(beats.filter((_, i) => i !== index))}
              >
                ✕
              </button>
            </div>

            {textError ? <div className="erro-campo">{textError}</div> : null}
            {errors[`beats.${index}.depth`] ? (
              <div className="erro-campo">{errors[`beats.${index}.depth`]}</div>
            ) : null}

            {showImage ? (
              <div className="linha-caminho" id={imageRowId} data-testid={`linha-imagem-${index}`}>
                <input
                  type="text"
                  value={beat.imagePath}
                  autoComplete="off"
                  placeholder="Imagem deste ponto: arquivo ou URL"
                  aria-label={`Imagem do ponto ${index + 1}`}
                  onChange={(event) => patch(index, { imagePath: event.target.value })}
                />
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  data-testid={`seletor-de-imagem-${index}`}
                  ref={(element) => {
                    fileInputs.current[index] = element;
                  }}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadImage(index, file);
                    event.target.value = '';
                  }}
                />
                <button
                  type="button"
                  className="btn btn-fantasma"
                  data-testid={`escolher-imagem-${index}`}
                  disabled={uploadingIndex !== null}
                  onClick={() => fileInputs.current[index]?.click()}
                >
                  {uploadingIndex === index ? 'copiando…' : 'escolher imagem'}
                </button>
              </div>
            ) : null}

            {showImage && preview && preview.kind !== 'unknown' ? (
              <img
                className="previa-ponto"
                src={preview.url}
                alt=""
                data-testid={`previa-ponto-${index}`}
              />
            ) : null}
          </div>
        );
      })}

      {beats.length >= BEATS_MAX_PER_BLOCK ? (
        <div className="erro-campo">
          Este bloco chegou aos {BEATS_MAX_PER_BLOCK} pontos. Quebre o assunto em dois blocos.
        </div>
      ) : null}
    </div>
  );
}
