import path from "path";
import { test, expect } from "./fixtures";

const FIXTURE_CSV = path.join(__dirname, "fixtures/sample-statement.csv");

test("CSV upload imports transactions and navigates to dashboard", async ({
  authenticatedPage: page,
}) => {
  await page.goto("/");

  await page
    .locator('[data-testid="csv-file-input"]')
    .setInputFiles(FIXTURE_CSV, { force: true });

  // Wait for the success message — allow extra time for AI categorisation
  await expect(page.locator('[data-testid="upload-status"]')).toContainText(
    "Imported",
    { timeout: 45_000 },
  );

  await expect(page).toHaveURL(/\/dashboard/);
});

test("CSV upload rejects a duplicate import", async ({
  authenticatedPage: page,
}) => {
  await page.goto("/");

  // First upload
  await page
    .locator('[data-testid="csv-file-input"]')
    .setInputFiles(FIXTURE_CSV, { force: true });
  await expect(page.locator('[data-testid="upload-status"]')).toContainText(
    "Imported",
    { timeout: 45_000 },
  );

  // Second upload of the same file — duplicate detection should block it
  await page
    .locator('[data-testid="csv-file-input"]')
    .setInputFiles(FIXTURE_CSV, { force: true });
  await expect(page.locator('[data-testid="upload-status"]')).toContainText(
    "No new transactions",
    { timeout: 10_000 },
  );
});
