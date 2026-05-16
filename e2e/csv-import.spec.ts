import { test, expect, FIXTURE_A, FIXTURE_B } from "./fixtures";

test("CSV upload imports transactions and navigates to dashboard", async ({
  authenticatedPage: page,
}) => {
  await page.goto("/dashboard");
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
  await expect(page.locator('[data-testid="csv-file-input"]')).toBeAttached();

  await page
    .locator('[data-testid="csv-file-input"]')
    .setInputFiles([FIXTURE_A, FIXTURE_B]);

  await expect(page.locator('[data-testid="upload-status"]')).toContainText(
    "Imported",
    { timeout: 15_000 },
  );

  await expect(page).toHaveURL(/\/dashboard/);
});

test("CSV upload rejects a duplicate import", async ({
  authenticatedPage: page,
}) => {
  await page.goto("/dashboard");
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
  await expect(page.locator('[data-testid="csv-file-input"]')).toBeAttached();

  await page
    .locator('[data-testid="csv-file-input"]')
    .setInputFiles([FIXTURE_A, FIXTURE_B]);
  await expect(page.locator('[data-testid="upload-status"]')).toContainText(
    "Imported",
    { timeout: 15_000 },
  );

  // Second upload of the same files — duplicate detection should block it
  await page
    .locator('[data-testid="csv-file-input"]')
    .setInputFiles([FIXTURE_A, FIXTURE_B]);
  await expect(page.locator('[data-testid="upload-status"]')).toContainText(
    "No new transactions",
    { timeout: 10_000 },
  );
});
