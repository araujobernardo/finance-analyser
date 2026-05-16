import { test, expect, uploadFixtures } from "./fixtures";

test("empty state renders when no data is loaded", async ({
  authenticatedPage: page,
}) => {
  await page.goto("/dashboard");
  await expect(page.locator(".dash-empty")).toBeVisible({ timeout: 10_000 });
});

test("dashboard renders month filter and summary stats after import", async ({
  authenticatedPage: page,
}) => {
  await uploadFixtures(page);

  // Month filter shows the imported month
  await expect(page.locator('[data-testid="month-filter"]')).toBeVisible();
  await expect(
    page.locator('[data-testid="month-filter"] button'),
  ).toContainText("Jan '00");

  // Summary stats grid is rendered
  await expect(page.locator('[data-testid="summary-stats"]')).toBeVisible();
});

test("transfer notice appears when transfers are detected", async ({
  authenticatedPage: page,
}) => {
  await uploadFixtures(page);

  await expect(page.locator('[data-testid="transfer-notice"]')).toBeVisible();
  await expect(page.locator('[data-testid="transfer-notice"]')).toContainText(
    "transfers detected",
  );
});

test("month filter pill activates and updates heading", async ({
  authenticatedPage: page,
}) => {
  await uploadFixtures(page);

  // The Jan '00 pill should be active after import
  const pill = page.locator('[data-testid="month-filter"] button');
  await expect(pill).toHaveClass(/pill-active/);

  // Dashboard heading reflects the selected month
  await expect(page.locator(".dash-heading")).toContainText("January 2000");
});
