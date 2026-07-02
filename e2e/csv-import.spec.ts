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

/**
 * Navigates to the Settings Import Transactions section, waits for accounts to
 * load in the dropdown, and selects the first available account.
 * Returns the selected account's UUID value.
 */
async function selectFirstAccountInImportSection(page: Page): Promise<string> {
  const select = page.locator('[data-testid="import-account-select"]');
  // Wait for at least one real account option to appear (index 1, since index 0
  // is the placeholder "(select an account)").
  const firstAccountOption = select.locator("option").nth(1);
  await expect(firstAccountOption).toBeAttached({ timeout: 15_000 });
  const value = await firstAccountOption.getAttribute("value");
  await select.selectOption({ value: value! });
  return value!;
}

test("sidebar does not contain CSV upload button or file input", async ({
  authenticatedPage: page,
}) => {
  await page.goto("/dashboard");
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 });

  // Old sidebar upload elements must not exist now that CSV upload has moved
  // to the Settings page.
  await expect(
    page.locator('[data-testid="upload-csv-btn"]'),
  ).not.toBeAttached();
  await expect(
    page.locator('[data-testid="csv-file-input"]'),
  ).not.toBeAttached();
  await expect(
    page.locator('[data-testid="mobile-upload-csv-btn"]'),
  ).not.toBeAttached();
  await expect(
    page.locator('[data-testid="mobile-csv-file-input"]'),
  ).not.toBeAttached();
});

test("CSV upload via Settings imports transactions and shows status", async ({
  authenticatedPage: page,
}) => {
  await page.goto("/settings");
  await page.waitForURL(/\/settings/, { timeout: 15_000 });

  // Wait for the Import Transactions section to render.
  await expect(
    page.locator('[data-testid="import-transactions-section"]'),
  ).toBeVisible({ timeout: 15_000 });

  // Select the first available account — required before uploading.
  await selectFirstAccountInImportSection(page);

  // Upload button must be enabled once an account is selected.
  await expect(
    page.locator('[data-testid="import-upload-btn"]'),
  ).not.toBeDisabled();

  // Upload the first fixture file and assert the status message appears.
  const importResponseA = captureImportResponse(page);
  await page
    .locator('[data-testid="import-csv-file-input"]')
    .setInputFiles([FIXTURE_A]);

  const resultA = await importResponseA;
  await expect(
    page.locator('[data-testid="import-upload-status"]'),
    `First upload failed. Import API response: ${JSON.stringify(resultA)}`,
  ).toContainText("imported", { timeout: 15_000 });

  // Upload the second fixture file.
  const importResponseB = captureImportResponse(page);
  await page
    .locator('[data-testid="import-csv-file-input"]')
    .setInputFiles([FIXTURE_B]);

  const resultB = await importResponseB;
  await expect(
    page.locator('[data-testid="import-upload-status"]'),
    `Second upload failed. Import API response: ${JSON.stringify(resultB)}`,
  ).toContainText("imported", { timeout: 15_000 });

  // Should remain on the settings page throughout.
  await expect(page).toHaveURL(/\/settings/);
});

test("CSV upload via Settings accepts a second import of the same file", async ({
  authenticatedPage: page,
}) => {
  await page.goto("/settings");
  await page.waitForURL(/\/settings/, { timeout: 15_000 });

  await expect(
    page.locator('[data-testid="import-transactions-section"]'),
  ).toBeVisible({ timeout: 15_000 });

  // Select the first available account before uploading.
  await selectFirstAccountInImportSection(page);

  // Upload files one at a time and wait for each to complete.
  const importResponseA1 = captureImportResponse(page);
  await page
    .locator('[data-testid="import-csv-file-input"]')
    .setInputFiles([FIXTURE_A]);
  const resultA1 = await importResponseA1;
  await expect(
    page.locator('[data-testid="import-upload-status"]'),
    `First upload (A) failed. Import API response: ${JSON.stringify(resultA1)}`,
  ).toContainText("imported", { timeout: 15_000 });

  const importResponseB = captureImportResponse(page);
  await page
    .locator('[data-testid="import-csv-file-input"]')
    .setInputFiles([FIXTURE_B]);
  const resultB = await importResponseB;
  await expect(
    page.locator('[data-testid="import-upload-status"]'),
    `First upload (B) failed. Import API response: ${JSON.stringify(resultB)}`,
  ).toContainText("imported", { timeout: 15_000 });

  // Second upload of the same file — the DB-backed import endpoint accepts it
  // (no server-side duplicate rejection for API accounts; localStorage-based
  // detection only applies to the legacy local-storage path).
  const importResponseA2 = captureImportResponse(page);
  await page
    .locator('[data-testid="import-csv-file-input"]')
    .setInputFiles([FIXTURE_A]);
  const resultA2 = await importResponseA2;
  await expect(
    page.locator('[data-testid="import-upload-status"]'),
    `Second upload (A) failed. Import API response: ${JSON.stringify(resultA2)}`,
  ).toContainText("imported", { timeout: 15_000 });
});
