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
    description: 'Lista as pautas com contagem de blocos, minutos previstos e execução em aberto.',
    params: [],
    auth: false
  },
  {
    path: '/api/rundowns',
    method: 'POST',
    description: 'Cria uma pauta.',
    params: [
      bodyParam('title', true, 'Título da live, até 120 caracteres.'),
      bodyParam('date', false, 'Data da live em AAAA-MM-DD; padrão é hoje.')
    ],
    auth: false
  },
  {
    path: '/api/rundowns/:id',
    method: 'GET',
    description: 'Devolve a pauta com seus blocos e anexos.',
    params: [pathParam('id', 'Id da pauta.')],
    auth: false
  },
  {
    path: '/api/rundowns/:id',
    method: 'PATCH',
    description: 'Renomeia a pauta e ajusta a data.',
    params: [
      pathParam('id', 'Id da pauta.'),
      bodyParam('title', true, 'Novo título, até 120 caracteres.'),
      bodyParam('date', false, 'Nova data em AAAA-MM-DD.')
    ],
    auth: false
  },
  {
    path: '/api/rundowns/:id',
    method: 'DELETE',
    description: 'Apaga a pauta e seus blocos; relatórios de trajeto já gravados são preservados.',
    params: [pathParam('id', 'Id da pauta.')],
    auth: false
  },
  {
    path: '/api/rundowns/:id/duplicate',
    method: 'POST',
    description: 'Duplica a pauta com cópia dos blocos e anexos, sem alterar a original.',
    params: [pathParam('id', 'Id da pauta de origem.')],
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
    path: '/api/rundowns/:id/track/reorder',
    method: 'POST',
    description:
      'Aplica a ordem completa da pauta e recompacta as posições; é idempotente e serve também ao "Desfazer".',
    params: [
      pathParam('id', 'Id da pauta.'),
      bodyParam('blockIds', true, 'Lista completa e ordenada dos ids dos blocos da pauta.')
    ],
    auth: false
  },
  {
    path: '/api/blocks',
    method: 'POST',
    description: 'Cria um bloco no fim da pauta, ou na reserva quando a etiqueta é rescue.',
    params: [
      bodyParam('rundownId', true, 'Id da pauta.'),
      bodyParam('type', true, 'Etiqueta do bloco: topic, media, interaction, guest ou rescue.'),
      bodyParam('title', true, 'Título do bloco, até 140 caracteres.'),
      bodyParam('durationMinutes', true, 'Duração prevista de 1 a 600 minutos.'),
      bodyParam('note', false, 'Nota privada do apresentador.'),
      bodyParam('attachments', false, 'Lista completa de anexos, gravada na mesma transação.'),
      bodyParam('beats', false, 'Lista completa de pontos do bloco, gravada na mesma transação.')
    ],
    auth: false
  },
  {
    path: '/api/blocks/:id',
    method: 'PATCH',
    description: 'Edita o bloco; mandar para a reserva ou tirar dela recalcula a ordem da pauta.',
    params: [
      pathParam('id', 'Id do bloco.'),
      bodyParam('type', true, 'Etiqueta do bloco.'),
      bodyParam('title', true, 'Título do bloco, até 140 caracteres.'),
      bodyParam('durationMinutes', true, 'Duração prevista de 1 a 600 minutos.'),
      bodyParam('note', false, 'Nota privada do apresentador.'),
      bodyParam('attachments', false, 'Lista completa de anexos, gravada na mesma transação.'),
      bodyParam('beats', false, 'Lista completa de pontos do bloco, gravada na mesma transação.')
    ],
    auth: false
  },
  {
    path: '/api/blocks/:id',
    method: 'DELETE',
    description: 'Exclui o bloco com os pontos dele e recompacta a pauta; passos já gravados no trajeto não mudam.',
    params: [pathParam('id', 'Id do bloco.')],
    auth: false
  },
  {
    path: '/api/beats/:id',
    method: 'PATCH',
    description:
      'Marca ou desmarca um ponto como falado. É a escrita que o Palco faz a cada avanço.',
    params: [
      pathParam('id', 'Id do ponto.'),
      bodyParam('done', true, 'true marca o ponto como falado; false desmarca.')
    ],
    auth: false
  },
  {
    path: '/api/blocks/:id/attachments',
    method: 'PUT',
    description: 'Reescreve a lista de anexos do bloco preservando o id dos que já existiam.',
    params: [
      pathParam('id', 'Id do bloco.'),
      bodyParam('attachments', true, 'Lista completa de anexos do bloco.')
    ],
    auth: false
  },
  {
    path: '/api/rundowns/:id/preflight',
    method: 'GET',
    description:
      'Checagem pré-live: devolve os blocos cuja mídia local (anexo ou imagem de ponto) não existe mais no disco.',
    params: [pathParam('id', 'Id da pauta.')],
    auth: false
  },
  {
    path: '/api/rundowns/:id/open-run',
    method: 'GET',
    description: 'Devolve a execução em aberto da pauta, ou nulo quando não há nenhuma.',
    params: [pathParam('id', 'Id da pauta.')],
    auth: false
  },
  {
    path: '/api/runs',
    method: 'POST',
    description: 'Entrar no ar: abre a execução, grava o primeiro passo e desmarca os pontos da pauta.',
    params: [bodyParam('rundownId', true, 'Id da pauta que entra no ar.')],
    auth: false
  },
  {
    path: '/api/runs/:id',
    method: 'GET',
    description: 'Devolve a execução com o trajeto e os trechos marcados.',
    params: [pathParam('id', 'Id da execução.')],
    auth: false
  },
  {
    path: '/api/runs/:id/steps',
    method: 'POST',
    description:
      'Registra o passo do trajeto: fecha o anterior com a duração real e abre o do bloco informado.',
    params: [
      pathParam('id', 'Id da execução.'),
      bodyParam('blockId', true, 'Bloco que entra no ar agora.')
    ],
    auth: false
  },
  {
    path: '/api/runs/:id/finish',
    method: 'POST',
    description:
      'Encerra a execução fechando o passo aberto; com `retroactive`, encerra no último passo registrado.',
    params: [
      pathParam('id', 'Id da execução.'),
      bodyParam('retroactive', false, 'Quando verdadeiro, encerra no último passo gravado.')
    ],
    auth: false
  },
  {
    path: '/api/runs/:id/report',
    method: 'GET',
    description:
      'Relatório do trajeto: planejado × tocado por bloco e no total.',
    params: [pathParam('id', 'Id da execução.')],
    auth: false
  },
  {
    path: '/api/library',
    method: 'GET',
    description:
      'Lista os itens do acervo com vezes no ar e a data da última vez em que foram ao ar.',
    params: [],
    auth: false
  },
  {
    path: '/api/library',
    method: 'POST',
    description: 'Guarda um bloco no acervo, copiando título, tipo e anexos.',
    params: [bodyParam('blockId', true, 'Id do bloco promovido.')],
    auth: false
  },
  {
    path: '/api/library/:id',
    method: 'PATCH',
    description: 'Renomeia o item do acervo; o tipo é imutável depois da promoção.',
    params: [
      pathParam('id', 'Id do item do acervo.'),
      bodyParam('title', true, 'Novo título, até 140 caracteres.')
    ],
    auth: false
  },
  {
    path: '/api/library/:id/attachments',
    method: 'PUT',
    description: 'Reescreve a lista de anexos do item do acervo.',
    params: [
      pathParam('id', 'Id do item do acervo.'),
      bodyParam('attachments', true, 'Lista completa de anexos do item.')
    ],
    auth: false
  },
  {
    path: '/api/library/:id',
    method: 'DELETE',
    description: 'Remove o item do acervo; blocos já copiados continuam nas pautas.',
    params: [pathParam('id', 'Id do item do acervo.')],
    auth: false
  },
  {
    path: '/api/library/:id/copy-to/:rundownId',
    method: 'POST',
    description:
      'Traz uma cópia independente do item para a pauta, guardando a origem no bloco criado.',
    params: [
      pathParam('id', 'Id do item do acervo.'),
      pathParam('rundownId', 'Id da pauta que recebe a cópia.')
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
    description: 'Preferências de interface gravadas em disco, como o tour de primeira abertura.',
    params: [],
    auth: false
  },
  {
    path: '/api/preferences',
    method: 'PUT',
    description: 'Grava as preferências de interface enviadas; chaves ausentes ficam como estavam.',
    params: [bodyParam('tourSeen', false, 'Marca o tour de primeira abertura como já visto.')],
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
