import { test as base } from '@playwright/test';

/**
 * As suítes do produto testam o Clave de quem já usa o Clave: o tour de
 * primeira abertura já foi visto. Isto não é um atalho de teste — é a mesma
 * preferência que o usuário grava ao fechar o tour, escrita pela mesma rota
 * real (`PUT /api/preferences`), e o estado de primeira abertura continua
 * coberto de verdade em `onboarding.spec.ts`, que a zera antes de carregar.
 */
export const test = base.extend<{ tourAlreadySeen: void }>({
  tourAlreadySeen: [
    async ({ request }, use) => {
      await request.put('/api/preferences', { data: { tourSeen: true } });
      await use();
    },
    { auto: true }
  ]
});

export { expect } from '@playwright/test';
