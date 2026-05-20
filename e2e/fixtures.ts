import path from "path";
import { fileURLToPath } from "url";
import { test as base, expect, type Page } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const FIXTURE_A = path.join(__dirname, "fixtures/sample-statement.csv");
export const FIXTURE_B = path.join(
  __dirname,
  "fixtures/sample-statement-b.csv",
);

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

// Uploads both paired transfer fixture CSVs and waits for the success status.
// All transactions are classified as inter-account transfers so the Claude
// categorisation API is never called.
export async function uploadFixtures(page: Page): Promise<void> {
  await page.goto("/dashboard");
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
  await expect(page.locator('[data-testid="csv-file-input"]')).toBeAttached();
  // Wait for AccountContext to finish loading so activeAccountId is a real DB
  // UUID before the upload starts. Without this, the upload hook may use the
  // "default" fallback which does not exist in the DB and returns 404.
  await expect(
    page.locator('[data-testid="account-item"]').first(),
  ).toBeVisible({ timeout: 15_000 });
  await page
    .locator('[data-testid="csv-file-input"]')
    .setInputFiles([FIXTURE_A, FIXTURE_B]);
  await expect(page.locator('[data-testid="upload-status"]')).toContainText(
    "Imported",
    { timeout: 15_000 },
  );
  await page.waitForURL(/\/dashboard/);
}

export { expect };
// verify-auth-fix: confirms localStorage auth is captured by Playwright storageState
