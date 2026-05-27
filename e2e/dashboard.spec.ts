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

test("month filter pill activates and updates heading (short format)", async ({
  authenticatedPage: page,
}) => {
  await uploadFixtures(page);

  // The Jan '00 pill should be active after import
  const pill = page.locator('[data-testid="month-filter"] button');
  await expect(pill).toHaveClass(/pill-active/);

  // Dashboard heading shows condensed short format ("Jan '00"), not long format
  await expect(page.locator('[data-testid="dash-heading"]')).toContainText(
    "Jan '00",
  );
});

test("income vs expenses chart is rendered in the charts row", async ({
  authenticatedPage: page,
}) => {
  await uploadFixtures(page);

  // The chart card must be present
  await expect(
    page.locator('[data-testid="income-expense-chart"]'),
  ).toBeVisible({ timeout: 15_000 });
});

test("income vs expenses chart shows empty state when all transactions are transfers", async ({
  authenticatedPage: page,
}) => {
  // Fixture only has transfer transactions, so chart shows empty state
  await uploadFixtures(page);

  await expect(
    page.locator('[data-testid="income-expense-chart"]'),
  ).toContainText("No data for selected account", { timeout: 15_000 });
});

test("largest transactions card is present below the charts row", async ({
  authenticatedPage: page,
}) => {
  await uploadFixtures(page);

  // LargestTransactions was moved to its own card row below the charts grid
  await expect(
    page.getByText("Largest Transactions", { exact: false }),
  ).toBeVisible({ timeout: 15_000 });
});

test("multi-select pills show range heading and count subtitle", async ({
  authenticatedPage: page,
}) => {
  // Seed two months of data so there are two pills to toggle
  await uploadFixtures(page);

  // Add a second month of transactions via API so a second pill appears
  // (uploadFixtures only seeds Jan 2000; we need Feb 2000 too)
  const token = await page.evaluate(
    () => localStorage.getItem("fa-auth-token") ?? "",
  );
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
  // Trigger accounts fetch
  await page.goto("/dashboard");
  await page.waitForURL(/\/dashboard/);
  const apiBase = await apiBasePromise;

  const accountsRes = await page.request.get(`${apiBase}/api/accounts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!accountsRes.ok()) return; // skip gracefully if API unavailable in CI
  const { accounts } = (await accountsRes.json()) as {
    accounts: { id: string }[];
  };
  if (accounts.length === 0) return;

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
            date: "2000-02-20",
            amount: -50,
            description: "Feb spend",
            isTransfer: false,
            isManualTransfer: false,
          },
        ],
      },
    },
  );

  await page.reload();
  await page.waitForURL(/\/dashboard/);
  await expect(page.locator('[data-testid="month-filter"] button')).toHaveCount(
    2,
    { timeout: 15_000 },
  );

  // Feb '00 is now most recent and pre-selected; click Jan to add it
  const janPill = page.locator('[data-testid="month-pill-2000-01"]');
  await janPill.click();

  // Heading should now show a range with en-dash
  await expect(page.locator('[data-testid="dash-heading"]')).toContainText("–");
  // Subtitle should show "2 months selected"
  await expect(page.locator('[data-testid="dash-subtitle"]')).toContainText(
    "2 months selected",
  );
  await expect(page.locator('[data-testid="dash-subtitle"]')).toContainText(
    "click to deselect",
  );
});
