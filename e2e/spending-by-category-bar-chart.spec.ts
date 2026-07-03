/**
 * E2E tests for the Spending by Category horizontal bar chart (issue #926).
 *
 * AC coverage:
 *   AC1  — bar chart present, SVG donut absent
 *   AC3  — legend items show category name, dollar amount, and percentage
 *   AC4  — clicking a legend item highlights it; clicking again deselects
 *   AC5  — empty state message shown when no categorised expenses exist
 *
 * Skipped (manual):
 *   AC2  — sort order (highest→lowest) is a positional/visual check; Recharts
 *           SVG bars don't expose stable testid attributes for order assertions.
 *           The sort is enforced in code and covered by unit tests.
 *   AC6  — responsive layout quality is visual; covered manually.
 */
import { test, expect, uploadFixtures } from "./fixtures";
import type { Response } from "@playwright/test";

// ── helpers ──────────────────────────────────────────────────────────────────

/**
 * Discovers the backend API base URL by intercepting the next
 * /api/accounts response (same strategy as uploadFixtures internals).
 */
function discoverApiBase(
  page: import("@playwright/test").Page,
): Promise<string> {
  return new Promise((resolve) => {
    const handler = (response: Response) => {
      const url = response.url();
      if (url.includes("/api/accounts") && !url.includes("/transactions")) {
        page.off("response", handler);
        resolve(url.replace(/\/api\/accounts.*$/, ""));
      }
    };
    page.on("response", handler);
  });
}

/**
 * Inject categorised expense transactions into the first account so the
 * Spending by Category card shows real data.
 *
 * Assumes the page is already authenticated and the dashboard has been loaded
 * at least once (so accounts exist after uploadFixtures).
 */
async function seedCategoryExpenses(
  page: import("@playwright/test").Page,
): Promise<void> {
  const token = await page.evaluate(
    () => localStorage.getItem("fa-auth-token") ?? "",
  );
  if (!token) throw new Error("[seedCategoryExpenses] No auth token");

  const apiBasePromise = discoverApiBase(page);
  await page.goto("/dashboard");
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
  const apiBase = await apiBasePromise;

  const accountsRes = await page.request.get(`${apiBase}/api/accounts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!accountsRes.ok())
    throw new Error("[seedCategoryExpenses] GET accounts failed");

  const { accounts } = (await accountsRes.json()) as {
    accounts: { id: string }[];
  };
  if (accounts.length === 0)
    throw new Error("[seedCategoryExpenses] No accounts");

  const importRes = await page.request.post(
    `${apiBase}/api/accounts/${accounts[0].id}/transactions/import`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data: {
        transactions: [
          {
            date: "2000-01-10",
            amount: -200,
            description: "Countdown supermarket",
            category: "Groceries",
            isTransfer: false,
            isManualTransfer: false,
          },
          {
            date: "2000-01-12",
            amount: -80,
            description: "Shell petrol",
            category: "Transport",
            isTransfer: false,
            isManualTransfer: false,
          },
        ],
      },
    },
  );
  if (!importRes.ok()) {
    throw new Error(
      `[seedCategoryExpenses] import failed: ${importRes.status()} — ${await importRes.text()}`,
    );
  }

  await page.reload();
  await page.waitForURL(/\/dashboard/);
  await expect(
    page.locator('[data-testid="account-item"]').first(),
  ).toBeVisible({ timeout: 15_000 });
}

// ── AC5 ──────────────────────────────────────────────────────────────────────

test("spending-by-category shows empty state when no expense data exists (#926 AC5)", async ({
  authenticatedPage: page,
}) => {
  // uploadFixtures resets to transfer-only transactions — no expense categories.
  await uploadFixtures(page);

  // Select the Jan 2000 month pill (seeded by uploadFixtures).
  const pill = page.locator('[data-testid="month-filter"] button').first();
  await expect(pill).toBeVisible({ timeout: 15_000 });
  // Pill may already be active; ensure it is.
  if (!(await pill.getAttribute("class"))?.includes("pill-active")) {
    await pill.click();
  }

  await expect(page.locator('[data-testid="spending-cat-empty"]')).toBeVisible({
    timeout: 10_000,
  });
  await expect(
    page.locator('[data-testid="spending-cat-empty"]'),
  ).toContainText("No expense data for selected period");
});

// ── AC1, AC3, AC4 ────────────────────────────────────────────────────────────

test("spending-by-category bar chart is present and donut is absent (#926 AC1)", async ({
  authenticatedPage: page,
}) => {
  await uploadFixtures(page);
  await seedCategoryExpenses(page);

  // Select the Jan 2000 pill.
  const pill = page.locator('[data-testid="month-pill-2000-01"]');
  await expect(pill).toBeVisible({ timeout: 15_000 });
  if (!(await pill.getAttribute("class"))?.includes("pill-active")) {
    await pill.click();
  }

  // Bar chart column must be present.
  await expect(page.locator('[data-testid="cat-bar-chart"]')).toBeVisible({
    timeout: 10_000,
  });

  // SVG donut wrapper must be completely absent.
  await expect(
    page.locator('[data-testid="donut-svg-wrapper"]'),
  ).not.toBeAttached();
});

test("spending-by-category legend shows name, amount, and percentage (#926 AC3)", async ({
  authenticatedPage: page,
}) => {
  await uploadFixtures(page);
  await seedCategoryExpenses(page);

  const pill = page.locator('[data-testid="month-pill-2000-01"]');
  await expect(pill).toBeVisible({ timeout: 15_000 });
  if (!(await pill.getAttribute("class"))?.includes("pill-active")) {
    await pill.click();
  }

  // Expect at least one legend item to be visible.
  const legendItem = page.locator(".dash-cat-legend-item").first();
  await expect(legendItem).toBeVisible({ timeout: 10_000 });

  // Each legend item must show name, dollar amount, and percentage.
  await expect(legendItem.locator(".dash-cat-legend-name")).toBeVisible();
  await expect(legendItem.locator(".dash-cat-legend-val")).toBeVisible();
  await expect(legendItem.locator(".dash-cat-legend-pct")).toBeVisible();

  // The Groceries entry (highest spend at $200) should be present and first.
  const groceriesItem = page.locator(
    '[data-testid="cat-legend-item-Groceries"]',
  );
  await expect(groceriesItem).toBeVisible();
  await expect(groceriesItem.locator(".dash-cat-legend-val")).toContainText(
    "200",
  );
  await expect(groceriesItem.locator(".dash-cat-legend-pct")).toContainText(
    "%",
  );
});

test("clicking a category legend item highlights it and clicking again deselects (#926 AC4)", async ({
  authenticatedPage: page,
}) => {
  await uploadFixtures(page);
  await seedCategoryExpenses(page);

  const pill = page.locator('[data-testid="month-pill-2000-01"]');
  await expect(pill).toBeVisible({ timeout: 15_000 });
  if (!(await pill.getAttribute("class"))?.includes("pill-active")) {
    await pill.click();
  }

  const groceriesItem = page.locator(
    '[data-testid="cat-legend-item-Groceries"]',
  );
  await expect(groceriesItem).toBeVisible({ timeout: 10_000 });

  // Initially no item is active (no --active modifier class).
  await expect(groceriesItem).not.toHaveClass(/dash-cat-legend-item--active/);

  // First click — Groceries becomes active.
  await groceriesItem.click();
  await expect(groceriesItem).toHaveClass(/dash-cat-legend-item--active/);

  // Second click — deselects; --active class removed.
  await groceriesItem.click();
  await expect(groceriesItem).not.toHaveClass(/dash-cat-legend-item--active/);
});
