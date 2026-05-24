import { test, expect, uploadFixtures } from "./fixtures";

// ── #761: AddBudgetModal redesign validation scenarios ────────────────────────

test("Add Budget modal shows context hint and inline validation errors", async ({
  authenticatedPage: page,
}) => {
  // Navigate to the Budget page
  await page.getByRole("link", { name: /budget/i }).click();
  await page.waitForURL(/\/budget/);

  // Open the modal
  await page.getByRole("button", { name: /\+ add budget/i }).click();

  // Context hint banner is visible
  await expect(
    page.getByText(/set a monthly spending limit for a category/i),
  ).toBeVisible();

  // Submit with empty fields — both errors appear
  await page.getByRole("button", { name: "Add Budget", exact: true }).click();
  await expect(page.getByText(/category is required/i)).toBeVisible();
  await expect(page.getByText(/please enter a valid limit/i)).toBeVisible();

  // Fill category — category error clears
  await page.getByTestId("budget-modal-category-input").fill("Groceries");
  await expect(page.getByText(/category is required/i)).not.toBeVisible();

  // Fill limit — limit error clears
  await page.getByTestId("budget-modal-limit-input").fill("300");
  await expect(page.getByText(/please enter a valid limit/i)).not.toBeVisible();

  // Cancel closes the modal without saving
  await page.getByRole("button", { name: /cancel/i }).click();
  await expect(
    page.getByText(/set a monthly spending limit for a category/i),
  ).not.toBeVisible();
});

test("budget section is hidden when no budgets are set", async ({
  authenticatedPage: page,
}) => {
  await uploadFixtures(page);
  await expect(
    page.locator('[data-testid="budget-section"]'),
  ).not.toBeVisible();
});

// Fix #732 — rewritten to use the Budget page modal UI (SettingsPage inputs
// were removed in FA-CORE-001). BudgetSummaryWidget (PR #735 / fix #734)
// is now deployed to production, so this test runs live.
test("setting a budget via Budget page shows it on the dashboard", async ({
  authenticatedPage: page,
}) => {
  await uploadFixtures(page);

  // Navigate to the Budget page (modal-based workflow, not SettingsPage)
  await page.getByRole("link", { name: /budget/i }).click();
  await page.waitForURL(/\/budget/);

  // Open the Add Budget modal
  await page.getByRole("button", { name: /\+ add budget/i }).click();

  // Fill in category name and limit amount using the input IDs (robust
  // against label ambiguity in the mounted app).
  await page.locator("#budget-category").fill("Groceries");
  await page.locator("#budget-limit").fill("500");

  // Submit the form — use exact match to avoid strict-mode collision with
  // the page-level "+ Add Budget" button that remains visible in the DOM.
  // Wait for BOTH the POST (budget created) and the subsequent GET refetch
  // (budget list reloaded) to complete before asserting on the UI.
  // This handles Render cold-start latency where the DB round-trip can take 15–20s.
  const budgetSavedPromise = page.waitForResponse(
    (resp) =>
      resp.url().includes("/api/budgets") && resp.request().method() === "POST",
    { timeout: 30_000 },
  );
  const budgetRefetchPromise = page.waitForResponse(
    (resp) =>
      resp.url().includes("/api/budgets") && resp.request().method() === "GET",
    { timeout: 30_000 },
  );
  await page.getByRole("button", { name: "Add Budget", exact: true }).click();
  await budgetSavedPromise;
  await budgetRefetchPromise;

  // Verify the budget row appears on the Budget page.
  // Use a generous timeout in case the UI re-renders after the refetch.
  await expect(
    page.locator('[data-testid^="budget-row-"]').first(),
  ).toBeVisible({ timeout: 20_000 });

  // Navigate to dashboard and verify the budget section appears.
  // Reload the dashboard to ensure the BudgetContext re-fetches from the server
  // (avoiding any stale client-side state after the budget was added).
  await page.goto("/dashboard");
  await page.waitForURL(/\/dashboard/);
  await page.waitForLoadState("networkidle");

  // BudgetSummaryWidget renders once BudgetContext loads the fresh budget list.
  await expect(page.locator('[data-testid="budget-section"]')).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.locator('[data-testid="budget-section"]')).toContainText(
    "Groceries",
  );
  await expect(page.locator('[data-testid="budget-section"]')).toContainText(
    "$500.00",
  );
});
