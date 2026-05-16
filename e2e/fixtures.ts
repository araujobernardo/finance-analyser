import { test as base, expect, type Page } from "@playwright/test";

type AuthFixtures = {
  authenticatedPage: Page;
};

// Use this in all specs except auth.spec.ts.
// Loads the saved auth session from global-setup — no login boilerplate needed.
export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ browser }, provide) => {
    const context = await browser.newContext({
      storageState: ".playwright/auth.json",
    });
    const page = await context.newPage();
    await provide(page);
    await context.close();
  },
});

export { expect };
