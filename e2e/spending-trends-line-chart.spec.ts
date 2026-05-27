/**
 * E2E tests for SpendingTrendsLineChart (#790 — Option B: Focus and Fade)
 *
 * The standard fixture only seeds January 2000 data (1 month), so the chart
 * card does not render. Most tests inject a second month of expenses via the
 * API to trigger the ≥2-month guard.
 */
import { test, expect, uploadFixtures } from "./fixtures";

// ── Helper: seed a second month of expense data ────────────────────────────

async function seedSecondMonth(
  page: import("@playwright/test").Page,
): Promise<void> {
  const token = await page.evaluate(
    () => localStorage.getItem("fa-auth-token") ?? "",
  );
  if (!token) return;

  const apiBasePromise = new Promise<string>((resolve) => {
    const handler = (res: import("@playwright/test").Response) => {
      const url = res.url();
      if (url.includes("/api/accounts") && !url.includes("/transactions")) {
        page.off("response", handler);
        resolve(url.replace(/\/api\/accounts.*$/, ""));
      }
    };
    page.on("response", handler);
  });

  await page.goto("/dashboard");
  await page.waitForURL(/\/dashboard/);
  const apiBase = await apiBasePromise;

  const accountsRes = await page.request.get(`${apiBase}/api/accounts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!accountsRes.ok()) return;

  const { accounts } = (await accountsRes.json()) as {
    accounts: { id: string }[];
  };
  if (accounts.length === 0) return;

  // Inject February 2000 expense transactions so the chart has ≥2 months.
  await page.request.post(
    `${apiBase}/api/accounts/${accounts[0].id}/transactions/import`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data: {
        transactions: [
          {
            date: "2000-02-10",
            amount: -80,
            description: "Groceries Feb",
            isTransfer: false,
            isManualTransfer: false,
          },
          {
            date: "2000-02-15",
            amount: -40,
            description: "Transport Feb",
            isTransfer: false,
            isManualTransfer: false,
          },
          {
            date: "2000-02-20",
            amount: -30,
            description: "Dining Feb",
            isTransfer: false,
            isManualTransfer: false,
          },
          {
            date: "2000-02-22",
            amount: -20,
            description: "Entertainment Feb",
            isTransfer: false,
            isManualTransfer: false,
          },
          {
            date: "2000-02-25",
            amount: -15,
            description: "Utilities Feb",
            isTransfer: false,
            isManualTransfer: false,
          },
        ],
      },
    },
  );

  await page.reload();
  await page.waitForURL(/\/dashboard/);
}

// ── Tests ──────────────────────────────────────────────────────────────────

test("spending trends line chart is hidden with only one month of data", async ({
  authenticatedPage: page,
}) => {
  await uploadFixtures(page);
  // Standard fixture = Jan 2000 only → component returns null, card must not be in DOM
  // Wait briefly for the page to stabilise before asserting absence
  await page.waitForTimeout(2_000);
  await expect(
    page.locator('[data-testid="spending-trends-line-chart"]'),
  ).toHaveCount(0);
});

test("spending trends line chart renders with two or more months of data", async ({
  authenticatedPage: page,
}) => {
  await uploadFixtures(page);
  await seedSecondMonth(page);

  await expect(
    page.locator('[data-testid="spending-trends-line-chart"]'),
  ).toBeVisible({ timeout: 15_000 });
});

test("spending trends line chart shows category chips", async ({
  authenticatedPage: page,
}) => {
  await uploadFixtures(page);
  await seedSecondMonth(page);

  const card = page.locator('[data-testid="spending-trends-line-chart"]');
  await expect(card).toBeVisible({ timeout: 15_000 });

  // At least one chip should be rendered
  const chips = card.locator(".stlc-chip");
  await expect(chips.first()).toBeVisible();
});

test("clicking a category chip applies dimmed state", async ({
  authenticatedPage: page,
}) => {
  await uploadFixtures(page);
  await seedSecondMonth(page);

  const card = page.locator('[data-testid="spending-trends-line-chart"]');
  await expect(card).toBeVisible({ timeout: 15_000 });

  // Click the first chip to hide it
  const firstChip = card.locator(".stlc-chip").first();
  await firstChip.click();
  await expect(firstChip).toHaveClass(/stlc-chip--dimmed/);

  // Click again to restore it
  await firstChip.click();
  await expect(firstChip).not.toHaveClass(/stlc-chip--dimmed/);
});

test("spending trends line chart contains an SVG element", async ({
  authenticatedPage: page,
}) => {
  await uploadFixtures(page);
  await seedSecondMonth(page);

  const card = page.locator('[data-testid="spending-trends-line-chart"]');
  await expect(card).toBeVisible({ timeout: 15_000 });
  await expect(card.locator("svg.stlc-svg")).toBeVisible();
});

test("tooltip element is present in the DOM (initially hidden)", async ({
  authenticatedPage: page,
}) => {
  await uploadFixtures(page);
  await seedSecondMonth(page);

  // The tooltip is always in the DOM but with opacity 0 until mousemove
  await expect(
    page.locator('[data-testid="spending-trends-tooltip"]'),
  ).toBeAttached({ timeout: 15_000 });
  await expect(
    page.locator('[data-testid="spending-trends-tooltip"]'),
  ).not.toHaveClass(/stlc-tooltip--visible/);
});
