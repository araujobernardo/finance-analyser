import { test, expect, uploadFixtures } from "./fixtures";

test("budget section is hidden when no budgets are set", async ({
  authenticatedPage: page,
}) => {
  await uploadFixtures(page);
  await expect(
    page.locator('[data-testid="budget-section"]'),
  ).not.toBeVisible();
});

test("setting a budget on the budget page shows it on the dashboard", async ({
  authenticatedPage: page,
}) => {
  await uploadFixtures(page);

  // Navigate to the Budget page
  await page.getByRole("link", { name: /budget/i }).click();
  await page.waitForURL(/\/budget/);

  // Open the Add Budget modal
  await page.getByRole("button", { name: /\+ add budget/i }).click();
  await expect(page.getByRole("dialog", { name: /add budget/i })).toBeVisible();

  // Fill in category name and monthly limit
  await page.locator("#budget-category").fill("Groceries");
  await page.locator("#budget-limit").fill("500");

  // Submit the form
  await page.getByRole("button", { name: /^add budget$/i }).click();

  // Modal should close after successful submission
  await expect(
    page.getByRole("dialog", { name: /add budget/i }),
  ).not.toBeVisible({ timeout: 5_000 });

  // Navigate to dashboard and verify the budget section appears
  await page.getByRole("link", { name: /dashboard/i }).click();
  await page.waitForURL(/\/dashboard/);

  await expect(page.locator('[data-testid="budget-section"]')).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.locator('[data-testid="budget-section"]')).toContainText(
    "Groceries",
  );
  await expect(page.locator('[data-testid="budget-section"]')).toContainText(
    "$500.00",
  );
});
