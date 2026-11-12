import manifest from '../../../manifest.json' with { type: 'json' };

export interface ApiParam {
  name: string;
  in: 'path' | 'query' | 'body';
  required: boolean;
  description: string;
}

export interface ApiEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  description: string;
  params: ApiParam[];
  auth: boolean;
}

const pathParam = (name: string, description: string): ApiParam => ({
  name,
  in: 'path',
  required: true,
  description
});

const bodyParam = (name: string, required: boolean, description: string): ApiParam => ({
  name,
  in: 'body',
  required,
  description
});

/**
 * Catálogo único das rotas do Clave. `GET /api/aioson-play` é gerado daqui, e
 * `tests/api/platform.test.ts` compara esta lista com as rotas realmente
 * registradas no Express: nenhuma entrada inventada, nenhuma rota escondida.
 */
export const API_ENDPOINTS: ApiEndpoint[] = [
  {
    path: '/api/health',
    method: 'GET',
    description: 'Probe leve do processo: não toca o banco.',
    params: [],
    auth: false
  },
  {
    path: '/api/aioson-play',
    method: 'GET',
    description: 'Schema de capabilities do app para o AIOSON Play.',
    params: [],
    auth: false
  },
  {
    path: '/api/rundowns',
    method: 'GET',
    description: 'Lista as pautas com contagem de blocos, quantos começam na tela e o selo das pautas da versão anterior.',
    params: [],
    auth: false
  },
  {
    path: '/api/rundowns',
    method: 'POST',
    description: 'Cria uma pauta.',
    params: [
      bodyParam('title', true, 'Nome da pauta, até 120 caracteres.'),
      bodyParam('date', false, 'Data da pauta em AAAA-MM-DD; padrão é hoje.'),
      bodyParam('kind', false, 'Tipo da pauta: rundown, presentation ou event; padrão é rundown.'),
      bodyParam('pinned', false, 'Se a pauta está fixada no topo; padrão é false.')
    ],
    auth: false
  },
  {
    path: '/api/rundowns/:id',
    method: 'PATCH',
    description: 'Renomeia a pauta e ajusta a data, tipo ou fixação.',
    params: [
      pathParam('id', 'Id da pauta.'),
      bodyParam('title', true, 'Novo título, até 120 caracteres.'),
      bodyParam('date', false, 'Nova data em AAAA-MM-DD.'),
      bodyParam('kind', false, 'Tipo da pauta: rundown, presentation ou event.'),
      bodyParam('pinned', false, 'Se a pauta está fixada no topo.')
    ],
    auth: false
  },
  {
    path: '/api/rundowns/:id',
    method: 'DELETE',
    description: 'Apaga a pauta, os blocos dela e os arquivos de mídia que só ela usava.',
    params: [pathParam('id', 'Id da pauta.')],
    auth: false
  },
  {
    path: '/api/rundowns/:id/duplicate',
    method: 'POST',
    description: 'Duplica a pauta com cópia da folha e a tomada zerada, sem alterar a original.',
    params: [pathParam('id', 'Id da pauta de origem.')],
    auth: false
  },
  {
    path: '/api/rundowns/:id/toggle-pin',
    method: 'POST',
    description: 'Alterna a fixação da pauta no topo da listagem.',
    params: [pathParam('id', 'Id da pauta.')],
    auth: false
  },
  {
    path: '/api/rundowns/:id/open',
    method: 'POST',
    description: 'Marca a pauta como a última usada e devolve o estado dela.',
    params: [pathParam('id', 'Id da pauta.')],
    auth: false
  },
  {
    path: '/api/rundowns/:id/sheet',
    method: 'GET',
    description: 'Devolve a folha da pauta: os blocos na ordem, com nível, tamanho, marcas, planejado e progresso da tomada.',
    params: [pathParam('id', 'Id da pauta.')],
    auth: false
  },
  {
    path: '/api/rundowns/:id/sheet',
    method: 'PUT',
    description:
      'Grava a folha inteira numa transação (salvamento automático). Ids novos são gerados no servidor e devolvidos por chave.',
    params: [
      pathParam('id', 'Id da pauta.'),
      bodyParam(
        'blocks',
        true,
        'Lista completa e ordenada: key, id?, kind, depth, content, mediaPath, mediaName, size, fontPx, plannedVisible, takeVisible, revealStep, collapsed.'
      )
    ],
    auth: false
  },
  {
    path: '/api/media',
    method: 'POST',
    description:
      'Copia o arquivo escolhido para a pasta de mídia do app e devolve o caminho relativo do registro.',
    params: [
      {
        name: 'x-clave-filename',
        in: 'query',
        required: true,
        description: 'Cabeçalho com o nome original do arquivo; a extensão é conferida contra a assinatura.'
      }
    ],
    auth: false
  },
  {
    path: '/api/media/{*relativePath}',
    method: 'GET',
    description:
      'Serve um arquivo da pasta de mídia do app, com suporte a Range para vídeo. Caminho fora da pasta é recusado.',
    params: [pathParam('relativePath', 'Caminho relativo dentro da pasta de mídia.')],
    auth: false
  },
  {
    path: '/api/preferences',
    method: 'GET',
    description: 'Preferências de interface gravadas em disco: o tour de primeira abertura e a aparência (tema, destaque, fundo e cobertura da folha).',
    params: [],
    auth: false
  },
  {
    path: '/api/preferences',
    method: 'PUT',
    description: 'Grava as preferências de interface enviadas; chaves ausentes ficam como estavam.',
    params: [
      bodyParam('tourSeen', false, 'Marca o tour de primeira abertura como já visto.'),
      bodyParam('theme', false, 'Tema do app: ink-gold, porcelain, notebook, slate ou high-contrast.'),
      bodyParam('accent', false, 'Cor de destaque livre em #RRGGBB, ou null para usar a do tema.'),
      bodyParam('background', false, 'Fundo: { kind: theme } | { kind: color, value: #RRGGBB } | { kind: gradient, value: dusk|halo|grove } | { kind: image, value: caminho na pasta de mídia, frame?: { x: 0-100, y: 0-100, zoom: 100-300 } }.'),
      bodyParam('sheetOpacity', false, 'Quanto a folha cobre o fundo, inteiro de 0 a 100 (padrão 90); a Aparência mostra 100 − isso como transparência.')
    ],
    auth: false
  }
];

export interface ApiCatalog {
  name: string;
  slug: string;
  version: string;
  api_base_url: string;
  endpoints: ApiEndpoint[];
  events: string[];
}

export const APP_SLUG = manifest.slug;
export const APP_NAME = manifest.name;
export const APP_VERSION = manifest.version;

export function apiCatalog(apiBaseUrl: string): ApiCatalog {
  return {
    name: APP_NAME,
    slug: APP_SLUG,
    version: APP_VERSION,
    api_base_url: apiBaseUrl,
    endpoints: API_ENDPOINTS,
    events: []
  };
}
