import { test, expect, FIXTURE_A, FIXTURE_B } from "./fixtures";

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
  await page
    .locator('[data-testid="csv-file-input"]')
    .setInputFiles([FIXTURE_A]);
  await expect(page.locator('[data-testid="upload-status"]')).toContainText(
    "Imported",
    { timeout: 15_000 },
  );

  await page
    .locator('[data-testid="csv-file-input"]')
    .setInputFiles([FIXTURE_B]);
  await expect(page.locator('[data-testid="upload-status"]')).toContainText(
    "Imported",
    { timeout: 15_000 },
  );

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
  await page
    .locator('[data-testid="csv-file-input"]')
    .setInputFiles([FIXTURE_A]);
  await expect(page.locator('[data-testid="upload-status"]')).toContainText(
    "Imported",
    { timeout: 15_000 },
  );

  await page
    .locator('[data-testid="csv-file-input"]')
    .setInputFiles([FIXTURE_B]);
  await expect(page.locator('[data-testid="upload-status"]')).toContainText(
    "Imported",
    { timeout: 15_000 },
  );

  // Second upload of the same file — the DB-backed import endpoint accepts it
  // (no server-side duplicate rejection for API accounts; localStorage-based
  // detection only applies to the legacy local-storage path).
  await page
    .locator('[data-testid="csv-file-input"]')
    .setInputFiles([FIXTURE_A]);
  await expect(page.locator('[data-testid="upload-status"]')).toContainText(
    "Imported",
    { timeout: 15_000 },
  );
});
