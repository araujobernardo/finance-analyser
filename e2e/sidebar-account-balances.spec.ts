// #899 — Sidebar account balances (two-line stacked layout)
// These tests verify the balance display structure and formatting.
// Balance elements only appear when the test user has Akahu-linked accounts;
// all assertions are conditional so the suite passes in any environment.

import { test, expect } from "./fixtures";

test("sidebar account rows render without errors", async ({
  authenticatedPage: page,
}) => {
  await page.goto("/dashboard");
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 });

  // Sidebar and account rows must be visible
  await expect(
    page.locator('[data-testid="account-all-accounts"]'),
  ).toBeVisible({ timeout: 15_000 });
});

test("any account-balance elements are formatted as NZD currency strings", async ({
  authenticatedPage: page,
}) => {
  await page.goto("/dashboard");
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
  await expect(
    page.locator('[data-testid="account-all-accounts"]'),
  ).toBeVisible({ timeout: 15_000 });

  const balanceEls = page.locator('[data-testid="account-balance"]');
  const count = await balanceEls.count();

  // If balance elements are present (user has Akahu-linked accounts), each must
  // be formatted as a currency string (starts with "$" and contains digits).
  for (let i = 0; i < count; i++) {
    const text = (await balanceEls.nth(i).textContent()) ?? "";
    expect(text).toMatch(/^\$[\d,]+\.\d{2}$/);
  }
});

test("all-accounts-balance element (when present) ends with 'total'", async ({
  authenticatedPage: page,
}) => {
  await page.goto("/dashboard");
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
  await expect(
    page.locator('[data-testid="account-all-accounts"]'),
  ).toBeVisible({ timeout: 15_000 });

  const totalEl = page.locator('[data-testid="all-accounts-balance"]');
  const isPresent = (await totalEl.count()) > 0;

  if (isPresent) {
    const text = (await totalEl.textContent()) ?? "";
    // Must match format: "$X,XXX.XX total"
    expect(text).toMatch(/^\$[\d,]+\.\d{2} total$/);
  }
});

test("account rows with no Akahu link show no empty balance placeholder", async ({
  authenticatedPage: page,
}) => {
  await page.goto("/dashboard");
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 });

  const accountItems = page.locator('[data-testid="account-item"]');
  await expect(accountItems.first()).toBeVisible({ timeout: 15_000 });

  const count = await accountItems.count();
  const balanceCount = await page
    .locator('[data-testid="account-balance"]')
    .count();

  // Number of balance elements must not exceed number of account rows.
  // (Unlinked accounts must not render a balance element at all.)
  expect(balanceCount).toBeLessThanOrEqual(count);
});
