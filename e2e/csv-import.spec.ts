import path from "path";
import { fileURLToPath } from "url";
import { test, expect } from "./fixtures";

// Two files uploaded together — matching debit/credit triggers transfer
// detection, so needsCat is empty and the Claude API is never called.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_A = path.join(__dirname, "fixtures/sample-statement.csv");
const FIXTURE_B = path.join(__dirname, "fixtures/sample-statement-b.csv");

test("CSV upload imports transactions and navigates to dashboard", async ({
  authenticatedPage: page,
}) => {
  // Navigate directly to /dashboard and wait for the sidebar to be ready
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
  // Navigate directly to /dashboard and wait for the sidebar to be ready
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
