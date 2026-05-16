import { test, expect, uploadFixtures } from "./fixtures";

test("budget section is hidden when no budgets are set", async ({
  authenticatedPage: page,
}) => {
  await uploadFixtures(page);
  await expect(
    page.locator('[data-testid="budget-section"]'),
  ).not.toBeVisible();
});

test("setting a budget in settings shows it on the dashboard", async ({
  authenticatedPage: page,
}) => {
  await uploadFixtures(page);

  // Navigate to settings and set a $500 budget for Groceries
  await page.getByRole("link", { name: /settings/i }).click();
  await page.waitForURL(/\/settings/);

  await page
    .locator('[data-category="Groceries"] input[type="number"]')
    .fill("500");

  await page.locator('[data-testid="budget-save"]').click();
  await expect(page.locator('[data-testid="settings-flash"]')).toContainText(
    "saved",
    { timeout: 5_000 },
  );

  // Navigate to dashboard and verify the budget section appears
  await page.getByRole("link", { name: /dashboard/i }).click();
  await page.waitForURL(/\/dashboard/);

  await expect(page.locator('[data-testid="budget-section"]')).toBeVisible();
  await expect(page.locator('[data-testid="budget-section"]')).toContainText(
    "Groceries",
  );
  await expect(page.locator('[data-testid="budget-section"]')).toContainText(
    "$500.00",
  );
});
