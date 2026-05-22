import { test, expect, uploadFixtures } from "./fixtures";

test("budget section is hidden when no budgets are set", async ({
  authenticatedPage: page,
}) => {
  await uploadFixtures(page);
  await expect(
    page.locator('[data-testid="budget-section"]'),
  ).not.toBeVisible();
});

// Fix #732 — rewritten to use the Budget page modal UI (SettingsPage inputs
// were removed in FA-CORE-001). The dashboard assertion is guarded by
// test.fixme until BudgetSummaryWidget (PR #735 / fix #734) is deployed to
// production — the E2E suite runs against the live Render URL, so
// data-testid="budget-section" only exists there after that PR ships.
test.fixme("setting a budget via Budget page shows it on the dashboard", async ({
  authenticatedPage: page,
}) => {
  await uploadFixtures(page);

  // Navigate to the Budget page (modal-based workflow, not SettingsPage)
  await page.getByRole("link", { name: /budget/i }).click();
  await page.waitForURL(/\/budget/);

  // Open the Add Budget modal
  await page.getByRole("button", { name: /\+ add budget/i }).click();

  // Fill in category name and limit amount using accessible labels
  await page.getByLabel(/category/i).fill("Groceries");
  await page.getByLabel(/monthly limit/i).fill("500");

  // Submit the form
  await page.getByRole("button", { name: /add budget/i }).click();

  // Verify the budget row appears on the Budget page
  await expect(
    page.locator('[data-testid^="budget-row-"]').first(),
  ).toBeVisible({ timeout: 10_000 });

  // Navigate to dashboard and verify the budget section appears
  // (requires BudgetSummaryWidget to be deployed — see PR #735)
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
