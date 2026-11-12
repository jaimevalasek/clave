import fs from 'node:fs';
import path from 'node:path';

/**
 * O AIOSON Play injeta AIOSON_APP_DIR no spawn. Fora do Play (dev solto, testes)
 * o diretório de trabalho serve de raiz. Nada aqui fixa caminho de máquina.
 * A raiz sai sempre absoluta: a guarda da pasta de mídia compara caminhos
 * resolvidos, e uma raiz relativa recusaria todo arquivo.
 */
export function appDir(): string {
  return path.resolve(process.env.AIOSON_APP_DIR ?? process.cwd());
}

export function dataDir(): string {
  return path.join(appDir(), 'data');
}

export function mediaDir(): string {
  return path.join(dataDir(), 'media');
}

export function databaseFile(): string {
  return path.join(dataDir(), 'clave.db');
}

export function ensureDataDirs(): void {
  fs.mkdirSync(mediaDir(), { recursive: true });
}
