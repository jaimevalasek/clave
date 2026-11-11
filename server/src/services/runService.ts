import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Database } from '../db/database.js';
import { badRequest, notFound } from '../http/errors.js';
import { mediaDir } from '../db/paths.js';
import { isWebUrl } from '../../../shared/validation/attachment.js';
import { trackOrder } from '../../../shared/track.js';
import type { Block, PreflightProblem, Run } from '../../../shared/types.js';
import { listBlocks } from '../repositories/blockRepository.js';
import { findRundown } from '../repositories/rundownRepository.js';
import { registerAiringsFromRun } from './libraryService.js';
import {
  closeOpenStep,
  findOpenRun,
  findRun,
  finishRun,
  insertRun,
  insertStep,
  nextSequence
} from '../repositories/runRepository.js';
import { clearDoneForRundown } from '../repositories/beatRepository.js';

const nowIso = () => new Date().toISOString();

/** Segundos decorridos desde que a execução entrou no ar. */
function elapsedSeconds(run: Run, at: Date = new Date()): number {
  return Math.max(0, Math.round((at.getTime() - new Date(run.startedAt).getTime()) / 1000));
}

/** Fim do último passo gravado — é onde a execução encerra retroativamente. */
function lastRecordedSecond(run: Run): number {
  const last = run.steps[run.steps.length - 1];
  if (!last) return 0;
  return last.startOffsetSeconds + (last.actualSeconds ?? 0);
}

function requireRun(db: Database, runId: string): Run {
  const run = findRun(db, runId);
  if (!run) throw notFound('Execução não encontrada.');
  return run;
}

/**
 * Caminho de anexo local resolvido dentro da pasta de mídia do app. Qualquer
 * caminho que escape dela é recusado, não conferido.
 */
function resolveLocalMedia(relative: string): string | null {
  const root = mediaDir();
  const resolved = path.resolve(root, relative);
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
  return resolved.startsWith(rootWithSep) ? resolved : null;
}

/** Verdadeiro quando o caminho local aponta para um arquivo que ainda existe. */
function localMediaExists(relative: string): boolean {
  const resolved = resolveLocalMedia(relative);
  return Boolean(resolved && fs.existsSync(resolved));
}

function fileUrlExists(urlStr: string): boolean {
  try {
    const filePath = fileURLToPath(urlStr);
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function localMediaOrFileExists(targetPath: string, type?: string): boolean {
  if (localMediaExists(targetPath)) return true;
  if (/^file:\/\//i.test(targetPath)) {
    return fileUrlExists(targetPath);
  }
  if (type === 'link' && path.isAbsolute(targetPath)) {
    try {
      return fs.existsSync(targetPath);
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Checagem pré-live: toda mídia local inexistente é devolvida para a tela
 * marcar antes de a execução começar. Anexo e imagem de ponto entram na mesma
 * lista — `attachmentId` carrega o id do alvo, seja ele anexo ou ponto.
 */
export function preflight(db: Database, rundownId: string): PreflightProblem[] {
  if (!findRundown(db, rundownId)) throw notFound('Pauta não encontrada.');
  const problems: PreflightProblem[] = [];

  for (const block of listBlocks(db, rundownId)) {
    for (const attachment of block.attachments) {
      if (!attachment.path || isWebUrl(attachment.path)) continue;
      if (localMediaOrFileExists(attachment.path, attachment.type)) continue;
      problems.push({
        blockId: block.id,
        blockTitle: block.title,
        attachmentId: attachment.id,
        attachmentLabel: attachment.label,
        attachmentPath: attachment.path
      });
    }

    for (const beat of block.beats) {
      if (!beat.imagePath || isWebUrl(beat.imagePath)) continue;
      if (localMediaExists(beat.imagePath)) continue;
      problems.push({
        blockId: block.id,
        blockTitle: block.title,
        attachmentId: beat.id,
        attachmentLabel: `imagem do ponto "${beat.text}"`,
        attachmentPath: beat.imagePath
      });
    }
  }

  return problems;
}

function stepInputFor(block: Block, startOffsetSeconds: number) {
  return {
    blockId: block.id,
    blockTitle: block.title,
    blockType: block.type,
    libraryItemId: block.libraryItemId,
    startOffsetSeconds,
    plannedSeconds: block.durationMinutes * 60,
    wasRescue: block.type === 'rescue'
  };
}

/** Entrar no ar: abre a execução, grava o primeiro passo e limpa o checklist. */
export function start(db: Database, rundownId: string): Run {
  const rundown = findRundown(db, rundownId);
  if (!rundown) throw notFound('Pauta não encontrada.');
  if (findOpenRun(db, rundownId)) {
    throw badRequest('Esta pauta já tem uma execução em aberto.', 'run_already_open');
  }

  const blocks = listBlocks(db, rundownId);
  const track = trackOrder(blocks);
  if (!track.length) throw badRequest('A pauta ainda não tem nenhum bloco.', 'empty_track');

  const runId = db.transaction(() => {
    const id = insertRun(db, rundownId, rundown.title, nowIso());
    insertStep(db, id, stepInputFor(track[0], 0), 0);
    // A live começa com o checklist limpo: os pontos marcados pertencem à
    // execução anterior, não a esta.
    clearDoneForRundown(db, rundownId);
    return id;
  })();

  return requireRun(db, runId);
}

/** Avançar, voltar e sacar resgate são a mesma escrita: registrar o passo atual. */
export function registerStep(db: Database, runId: string, payload: unknown): Run {
  const run = requireRun(db, runId);
  if (run.endedAt) throw badRequest('Esta execução já foi encerrada.', 'run_finished');

  const input = (payload ?? {}) as Record<string, unknown>;
  const blockId = String(input.blockId ?? '');
  const block = listBlocks(db, run.rundownId ?? '').find((entry) => entry.id === blockId);
  if (!block) throw notFound('Bloco não encontrado nesta pauta.');

  const elapsed = elapsedSeconds(run);
  db.transaction(() => {
    closeOpenStep(db, runId, elapsed);
    insertStep(db, runId, stepInputFor(block, elapsed), nextSequence(db, runId));
  })();

  return requireRun(db, runId);
}

export interface FinishOptions {
  /** Encerra no último passo registrado, em vez do relógio de agora. */
  retroactive?: boolean;
}

export function finish(db: Database, runId: string, payload: unknown): Run {
  const run = requireRun(db, runId);
  if (run.endedAt) return run;

  const options = (payload ?? {}) as FinishOptions;
  const endSecond = options.retroactive ? lastRecordedSecond(run) : elapsedSeconds(run);
  const endedAt = new Date(new Date(run.startedAt).getTime() + endSecond * 1000).toISOString();

  db.transaction(() => {
    closeOpenStep(db, runId, endSecond);
    finishRun(db, runId, endedAt);
    // Os contadores do Acervo sobem aqui, na mesma transação do encerramento.
    registerAiringsFromRun(db, runId);
  })();

  return requireRun(db, runId);
}

export function get(db: Database, runId: string): Run {
  return requireRun(db, runId);
}

export function openRunOf(db: Database, rundownId: string): Run | null {
  return findOpenRun(db, rundownId);
}
