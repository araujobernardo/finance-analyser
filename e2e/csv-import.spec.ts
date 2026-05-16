import path from "path";
import { test, expect } from "./fixtures";

// Two files uploaded together — matching debit/credit triggers transfer
// detection, so needsCat is empty and the Claude API is never called.
const FIXTURE_A = path.join(__dirname, "fixtures/sample-statement.csv");
const FIXTURE_B = path.join(__dirname, "fixtures/sample-statement-b.csv");

test("CSV upload imports transactions and navigates to dashboard", async ({
  authenticatedPage: page,
}) => {
  await page.goto("/");

  await page
    .locator('[data-testid="csv-file-input"]')
    .setInputFiles([FIXTURE_A, FIXTURE_B], { force: true });

  await expect(page.locator('[data-testid="upload-status"]')).toContainText(
    "Imported",
    { timeout: 15_000 },
  );

  await expect(page).toHaveURL(/\/dashboard/);
});

test("CSV upload rejects a duplicate import", async ({
  authenticatedPage: page,
}) => {
  await page.goto("/");

  await page
    .locator('[data-testid="csv-file-input"]')
    .setInputFiles([FIXTURE_A, FIXTURE_B], { force: true });
  await expect(page.locator('[data-testid="upload-status"]')).toContainText(
    "Imported",
    { timeout: 15_000 },
  );

  // Second upload of the same files — duplicate detection should block it
  await page
    .locator('[data-testid="csv-file-input"]')
    .setInputFiles([FIXTURE_A, FIXTURE_B], { force: true });
  await expect(page.locator('[data-testid="upload-status"]')).toContainText(
    "No new transactions",
    { timeout: 10_000 },
  );
});
