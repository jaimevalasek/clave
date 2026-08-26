import { invalid, valid } from './result.js';
import type { FieldError, ValidationResult } from './result.js';
import type { Beat } from '../types.js';

export const BEAT_TEXT_MAX_LENGTH = 200;
/** Teto por bloco: acima disso o bloco virou pauta, e o lugar dele é outro bloco. */
export const BEATS_MAX_PER_BLOCK = 30;
/**
 * Profundidade máxima do sub-ponto, contada de zero: 0, 1 e 2 dão os três
 * níveis do produto. O teto por bloco continua contando o total, sem distinção
 * de nível.
 */
export const BEAT_MAX_DEPTH = 2;

export type BeatInput = Omit<Beat, 'position'>;

/**
 * Pontos do bloco. A gaveta manda a lista inteira e o registro reescreve tudo,
 * como já acontece com os anexos: a posição é o índice do envio, nunca um campo
 * que o formulário precise administrar.
 *
 * A árvore mora na própria lista: `depth` diz o nível e o pai é o ponto anterior
 * mais próximo com nível menor. Por isso a lista só é válida quando começa no
 * nível 0 e nenhum ponto desce mais de um nível por vez — um salto de 0 para 2
 * descreveria um filho sem pai.
 */
export function validateBeats(raw: unknown): ValidationResult<BeatInput[]> {
  const list = Array.isArray(raw) ? raw : [];
  const errors: FieldError[] = [];
  const parsed: BeatInput[] = [];

  if (list.length > BEATS_MAX_PER_BLOCK) {
    return invalid([
      {
        field: 'beats',
        message: `Um bloco comporta até ${BEATS_MAX_PER_BLOCK} pontos. Quebre o assunto em dois blocos.`
      }
    ]);
  }

  list.forEach((entry, index) => {
    const item = (entry ?? {}) as Record<string, unknown>;
    const text = String(item.text ?? '').trim();

    if (!text) {
      errors.push({ field: `beats.${index}.text`, message: 'Escreva o ponto ou remova a linha.' });
      return;
    }
    if (text.length > BEAT_TEXT_MAX_LENGTH) {
      errors.push({
        field: `beats.${index}.text`,
        message: `Use no máximo ${BEAT_TEXT_MAX_LENGTH} caracteres neste ponto.`
      });
      return;
    }

    const depth = Number(item.depth ?? 0);
    if (!Number.isInteger(depth) || depth < 0 || depth > BEAT_MAX_DEPTH) {
      errors.push({
        field: `beats.${index}.depth`,
        message: `Um ponto vai do nível 1 ao ${BEAT_MAX_DEPTH + 1}.`
      });
      return;
    }

    // `-1` para a lista vazia faz o primeiro ponto cair na mesma regra dos
    // outros: ele só pode nascer no nível 0.
    const previousDepth = parsed.length ? parsed[parsed.length - 1].depth : -1;
    if (depth > previousDepth + 1) {
      errors.push({
        field: `beats.${index}.depth`,
        message:
          previousDepth < 0
            ? 'O primeiro ponto do bloco não pode ser um sub-ponto.'
            : 'Um sub-ponto entra no máximo um nível abaixo do ponto anterior.'
      });
      return;
    }

    parsed.push({
      id: typeof item.id === 'string' && item.id ? item.id : '',
      text,
      imagePath: String(item.imagePath ?? '').trim(),
      done: Boolean(item.done),
      depth
    });
  });

  if (errors.length) return invalid(errors);
  return valid(parsed);
}
