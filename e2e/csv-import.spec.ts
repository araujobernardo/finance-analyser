import { test, expect, FIXTURE_A, FIXTURE_B } from "./fixtures";
import type { Page } from "@playwright/test";

/**
 * Returns a promise that resolves with the first /transactions/import response
 * status and body. Resolves with null if no matching response arrives within
 * timeoutMs milliseconds.
 *
 * Used to include the actual API response in the Playwright failure output so
 * we can diagnose whether the import endpoint is returning a 404 (bad accountId),
 * 401 (bad token), 500 (server error), or a 200 with unexpected body.
 */
function captureImportResponse(
  page: Page,
  timeoutMs = 15_000,
): Promise<{ status: number; body: string } | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs);
    page.on("response", (response) => {
      if (response.url().includes("/transactions/import")) {
        clearTimeout(timer);
        response
          .text()
          .then((body) => resolve({ status: response.status(), body }))
          .catch(() =>
            resolve({ status: response.status(), body: "(unreadable)" }),
          );
      }
    });
  });
}

test("CSV upload imports transactions and navigates to dashboard", async ({
  authenticatedPage: page,
}) => {
  await page.goto("/dashboard");
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
  await expect(page.locator('[data-testid="csv-file-input"]')).toBeAttached();
  // Wait for AccountContext to finish loading so activeAccountId is a real UUID.
  await expect(
    page.locator('[data-testid="account-item"]').first(),
  ).toBeVisible({ timeout: 15_000 });

  // Upload one file at a time — simultaneous uploads use a stale closure that
  // can reference an invalid accountId for the second file.
  const importResponseA = captureImportResponse(page);
  await page
    .locator('[data-testid="csv-file-input"]')
    .setInputFiles([FIXTURE_A]);

  const resultA = await importResponseA;
  await expect(
    page.locator('[data-testid="upload-status"]'),
    `First upload failed. Import API response: ${JSON.stringify(resultA)}`,
  ).toContainText("Imported", { timeout: 15_000 });

  const importResponseB = captureImportResponse(page);
  await page
    .locator('[data-testid="csv-file-input"]')
    .setInputFiles([FIXTURE_B]);

  const resultB = await importResponseB;
  await expect(
    page.locator('[data-testid="upload-status"]'),
    `Second upload failed. Import API response: ${JSON.stringify(resultB)}`,
  ).toContainText("Imported", { timeout: 15_000 });

  await expect(page).toHaveURL(/\/dashboard/);
});

test("CSV upload accepts a second import of the same file", async ({
  authenticatedPage: page,
}) => {
  await page.goto("/dashboard");
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
  await expect(page.locator('[data-testid="csv-file-input"]')).toBeAttached();
  // Wait for AccountContext to finish loading so activeAccountId is a real UUID.
  await expect(
    page.locator('[data-testid="account-item"]').first(),
  ).toBeVisible({ timeout: 15_000 });

  // Upload files one at a time and wait for each to complete.
  const importResponseA1 = captureImportResponse(page);
  await page
    .locator('[data-testid="csv-file-input"]')
    .setInputFiles([FIXTURE_A]);
  const resultA1 = await importResponseA1;
  await expect(
    page.locator('[data-testid="upload-status"]'),
    `First upload (A) failed. Import API response: ${JSON.stringify(resultA1)}`,
  ).toContainText("Imported", { timeout: 15_000 });

  const importResponseB = captureImportResponse(page);
  await page
    .locator('[data-testid="csv-file-input"]')
    .setInputFiles([FIXTURE_B]);
  const resultB = await importResponseB;
  await expect(
    page.locator('[data-testid="upload-status"]'),
    `First upload (B) failed. Import API response: ${JSON.stringify(resultB)}`,
  ).toContainText("Imported", { timeout: 15_000 });

  // Second upload of the same file — the DB-backed import endpoint accepts it
  // (no server-side duplicate rejection for API accounts; localStorage-based
  // detection only applies to the legacy local-storage path).
  const importResponseA2 = captureImportResponse(page);
  await page
    .locator('[data-testid="csv-file-input"]')
    .setInputFiles([FIXTURE_A]);
  const resultA2 = await importResponseA2;
  await expect(
    page.locator('[data-testid="upload-status"]'),
    `Second upload (A) failed. Import API response: ${JSON.stringify(resultA2)}`,
  ).toContainText("Imported", { timeout: 15_000 });
});
