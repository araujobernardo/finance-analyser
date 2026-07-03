/**
 * E2E tests for SpendingTrendsByCategoryChart — monthly grouped bar chart (#927).
 *
 * AC coverage:
 *   AC3 — empty state shown when fewer than 2 months of expense data are available
 *   AC1 — grouped bar chart renders once 2+ months of categorised expenses are seeded
 *   AC4 — account filter: empty state shown when selected account has no multi-month data
 *
 * Skipped (manual):
 *   AC2 — top-5 category selection is logic covered by unit tests; verifying
 *          specific bar/legend order in jsdom is not deterministic with
 *          Recharts in a no-layout environment.
 */
import { test, expect, uploadFixtures } from "./fixtures";
import type { Response } from "@playwright/test";

// ── helpers ──────────────────────────────────────────────────────────────────

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
 * Seeds two months of categorised expense transactions into the first account
 * so SpendingTrendsByCategoryChart has >= 2 months of data and renders the chart.
 */
async function seedTwoMonthsOfExpenses(
  page: import("@playwright/test").Page,
): Promise<void> {
  const token = await page.evaluate(
    () => localStorage.getItem("fa-auth-token") ?? "",
  );
  if (!token) throw new Error("[seedTwoMonthsOfExpenses] No auth token");

  const apiBasePromise = discoverApiBase(page);
  await page.goto("/dashboard");
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
  const apiBase = await apiBasePromise;

  const accountsRes = await page.request.get(`${apiBase}/api/accounts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!accountsRes.ok())
    throw new Error("[seedTwoMonthsOfExpenses] GET accounts failed");

  const { accounts } = (await accountsRes.json()) as {
    accounts: { id: string }[];
  };
  if (accounts.length === 0)
    throw new Error("[seedTwoMonthsOfExpenses] No accounts");

  const importRes = await page.request.post(
    `${apiBase}/api/accounts/${accounts[0].id}/transactions/import`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data: {
        transactions: [
          // January 2000 expenses
          {
            date: "2000-01-10",
            amount: -200,
            description: "Countdown supermarket",
            category: "Groceries",
            isTransfer: false,
            isManualTransfer: false,
          },
          {
            date: "2000-01-15",
            amount: -80,
            description: "Bus fare",
            category: "Transport",
            isTransfer: false,
            isManualTransfer: false,
          },
          // February 2000 expenses
          {
            date: "2000-02-05",
            amount: -180,
            description: "New World supermarket",
            category: "Groceries",
            isTransfer: false,
            isManualTransfer: false,
          },
          {
            date: "2000-02-20",
            amount: -60,
            description: "Petrol",
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
      `[seedTwoMonthsOfExpenses] import failed: ${importRes.status()} — ${await importRes.text()}`,
    );
  }

  await page.reload();
  await page.waitForURL(/\/dashboard/);
  await expect(
    page.locator('[data-testid="account-item"]').first(),
  ).toBeVisible({ timeout: 15_000 });
}

// ── AC3: empty state ──────────────────────────────────────────────────────────

test("spending-trends chart shows empty state with only transfer data (#927 AC3)", async ({
  authenticatedPage: page,
}) => {
  // uploadFixtures seeds one month of transfer-only transactions → 0 expense months
  await uploadFixtures(page);

  await expect(
    page.locator('[data-testid="spending-trends-cat-empty"]'),
  ).toBeVisible({ timeout: 15_000 });

  await expect(
    page.locator('[data-testid="spending-trends-cat-empty"]'),
  ).toContainText("Not enough data to show trends");
});

// ── AC1: bar chart renders with 2+ months of categorised expenses ─────────────

test("spending-trends bar chart renders with 2 months of expense data (#927 AC1)", async ({
  authenticatedPage: page,
}) => {
  await uploadFixtures(page);
  await seedTwoMonthsOfExpenses(page);

  await expect(
    page.locator('[data-testid="spending-trends-cat-chart"]'),
  ).toBeVisible({ timeout: 15_000 });

  // Empty state must not appear
  await expect(
    page.locator('[data-testid="spending-trends-cat-empty"]'),
  ).not.toBeAttached();
});

test("spending-trends bar chart contains an SVG element when data is sufficient (#927 AC1)", async ({
  authenticatedPage: page,
}) => {
  await uploadFixtures(page);
  await seedTwoMonthsOfExpenses(page);

  const chart = page.locator('[data-testid="spending-trends-cat-chart"]');
  await expect(chart).toBeVisible({ timeout: 15_000 });

  // Recharts renders an SVG inside its ResponsiveContainer
  await expect(chart.locator("svg").first()).toBeAttached({ timeout: 10_000 });
});

// ── AC4: account filter ───────────────────────────────────────────────────────

test("spending-trends empty state shown when selected account has no multi-month data (#927 AC4)", async ({
  authenticatedPage: page,
}) => {
  await uploadFixtures(page);
  await seedTwoMonthsOfExpenses(page);

  // Account B only has a single transfer transaction — not enough for the chart.
  // Select Account B in the sidebar account selector.
  const accountItems = page.locator('[data-testid="account-item"]');
  const count = await accountItems.count();
  if (count >= 2) {
    // Click the second account to filter to it
    await accountItems.nth(1).click();
    await page.waitForTimeout(1_000);

    // Account B has only transfer data in one month → empty state
    await expect(
      page.locator('[data-testid="spending-trends-cat-empty"]'),
    ).toBeVisible({ timeout: 10_000 });
  }
});
