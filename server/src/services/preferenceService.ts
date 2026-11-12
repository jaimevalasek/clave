import type { Database } from '../db/database.js';
import { isHexColor } from '../../../shared/types.js';
import type { Preferences } from '../../../shared/types.js';
import type { FieldError } from '../../../shared/validation/result.js';
import { isSheetOpacity, isThemeId, parseBackground } from '../../../shared/validation/preferences.js';
import { validationFailed } from '../http/errors.js';
import { readPreferences, writePreferences } from '../repositories/preferenceRepository.js';
import { nowIso } from './clock.js';
import { mediaFileExists } from './mediaService.js';

export function read(db: Database): Preferences {
  return readPreferences(db);
}

type Body = Record<string, unknown>;

function readAppearance(body: Body, patch: Partial<Preferences>, errors: FieldError[]): void {
  if ('theme' in body) {
    if (isThemeId(body.theme)) patch.theme = body.theme;
    else errors.push({ field: 'theme', message: 'Escolha um dos cinco temas da Aparência.' });
  }
  if ('accent' in body) {
    if (body.accent === null) patch.accent = null;
    else if (isHexColor(body.accent)) patch.accent = body.accent.toUpperCase();
    else errors.push({ field: 'accent', message: 'A cor de destaque precisa estar no formato #RRGGBB.' });
  }
  if ('background' in body) {
    const background = parseBackground(body.background);
    if (!background) {
      errors.push({ field: 'background', message: 'O fundo é do tema, uma cor, um dos 3 gradientes ou uma imagem; o enquadramento vai de 0 a 100% na posição e de 100 a 300% no zoom.' });
    } else if (background.kind === 'image' && !mediaFileExists(background.value)) {
      errors.push({ field: 'background', message: 'A imagem do fundo não está na pasta de mídia.' });
    } else {
      patch.background = background;
    }
  }
  if ('sheetOpacity' in body) {
    if (isSheetOpacity(body.sheetOpacity)) patch.sheetOpacity = body.sheetOpacity;
    else errors.push({ field: 'sheetOpacity', message: 'A cobertura da folha é um número inteiro de 0 a 100.' });
  }
}

/**
 * O patch aceita apenas as chaves conhecidas, e cada uma no seu tipo. Chave
 * desconhecida é ignorada em silêncio; chave conhecida com tipo errado é erro
 * de validação e nada é gravado, para o cliente não gravar `"undefined"` como
 * preferência. A aparência (tema, destaque, fundo e transparência da folha) vale para o app inteiro
 * (RULE-pauta-revelavel-10); a imagem de fundo precisa estar na pasta de mídia.
 */
export function update(db: Database, payload: unknown): Preferences {
  const body = (payload ?? {}) as Body;
  const patch: Partial<Preferences> = {};
  const errors: FieldError[] = [];

  if ('tourSeen' in body) {
    if (typeof body.tourSeen === 'boolean') patch.tourSeen = body.tourSeen;
    else errors.push({ field: 'tourSeen', message: 'A preferência do tour aceita apenas verdadeiro ou falso.' });
  }
  readAppearance(body, patch, errors);

  if (errors.length) throw validationFailed(errors);
  return writePreferences(db, patch, nowIso());
}
