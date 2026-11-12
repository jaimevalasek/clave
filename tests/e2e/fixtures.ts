import { test as base } from '@playwright/test';

/**
 * The product suites test the app as someone who already uses it: the
 * first-open tour was seen. This is not a test shortcut — it is the same
 * preference the app writes when the tour closes, through the same real route
 * (`PUT /api/preferences`). The first open itself is covered in
 * `tour.spec.ts`, which clears the preference before loading the page.
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
