import { test, expect } from "./fixtures";

// ── helpers ───────────────────────────────────────────────────────────────────

/**
 * Seeds one non-transfer, uncategorised transaction into account A and
 * navigates to the Transactions page.  Returns the API base URL so callers
 * can make additional direct requests if needed.
 */
async function seedUncategorisedAndNavigate(
  page: import("@playwright/test").Page,
) {
  const apiBasePromise: Promise<string> = new Promise((resolve) => {
    const handler = (response: import("@playwright/test").Response) => {
      const url = response.url();
      if (url.includes("/api/accounts") && !url.includes("/transactions")) {
        page.off("response", handler);
        resolve(url.replace(/\/api\/accounts.*$/, ""));
      }
    };
    page.on("response", handler);
  });

  await page.goto("/dashboard");
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
  await expect(
    page.locator('[data-testid="account-item"]').first(),
  ).toBeVisible({ timeout: 15_000 });

  const apiBase = await apiBasePromise;
  const token = await page.evaluate(
    () => localStorage.getItem("fa-auth-token") ?? "",
  );

  // Reset: delete all existing accounts.
  const existingRes = await page.request.get(`${apiBase}/api/accounts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (existingRes.ok()) {
    const { accounts: existing } = (await existingRes.json()) as {
      accounts: { id: string }[];
    };
    for (const acc of existing) {
      await page.request.delete(`${apiBase}/api/accounts/${acc.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  }

  // Create account A.
  await page.request.post(`${apiBase}/api/accounts`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    data: { nickname: "A", accountType: "Checking" },
  });

  await page.evaluate(() => {
    localStorage.setItem("finance_analyser_active_account", "all");
  });

  const accountsRes = await page.request.get(`${apiBase}/api/accounts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const { accounts } = (await accountsRes.json()) as {
    accounts: { id: string }[];
  };
  const accountA = accounts[0];

  // Import one uncategorised non-transfer transaction.
  await page.request.post(
    `${apiBase}/api/accounts/${accountA.id}/transactions/import`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data: {
        transactions: [
          {
            date: "2000-01-15",
            amount: -42,
            description: "Mystery Merchant",
            isTransfer: false,
            isManualTransfer: false,
          },
        ],
      },
    },
  );

  await page.reload();
  await page.waitForURL(/\/dashboard/);
  await expect(
    page.locator('[data-testid="account-item"]').first(),
  ).toBeVisible({ timeout: 15_000 });

  await page.getByRole("link", { name: /transactions/i }).click();
  await page.waitForURL(/\/transactions/);

  return apiBase;
}

// ── tests ─────────────────────────────────────────────────────────────────────

test("AC-1: Auto-Categorise button is present in the filter card when transactions exist", async ({
  authenticatedPage: page,
}) => {
  await seedUncategorisedAndNavigate(page);
  await expect(
    page.locator('[data-testid="auto-categorise-btn"]'),
  ).toBeVisible();
});

test("AC-2: button is enabled when an uncategorised non-transfer row exists", async ({
  authenticatedPage: page,
}) => {
  await seedUncategorisedAndNavigate(page);
  await expect(
    page.locator('[data-testid="auto-categorise-btn"]'),
  ).toBeEnabled();
});

test("AC-2: button is disabled when all non-transfer transactions are already categorised", async ({
  authenticatedPage: page,
}) => {
  const apiBase = await seedUncategorisedAndNavigate(page);

  const token = await page.evaluate(
    () => localStorage.getItem("fa-auth-token") ?? "",
  );

  // Find the transaction we just created.
  const accountsRes = await page.request.get(`${apiBase}/api/accounts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const { accounts } = (await accountsRes.json()) as {
    accounts: { id: string }[];
  };
  const txnRes = await page.request.get(
    `${apiBase}/api/accounts/${accounts[0].id}/transactions`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const { transactions } = (await txnRes.json()) as {
    transactions: { id: string }[];
  };

  // Categorise it via PATCH.
  await page.request.patch(
    `${apiBase}/api/transactions/${transactions[0].id}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data: { category: "Shopping" },
    },
  );

  // Reload so the page sees the updated data.
  await page.reload();
  await page.waitForURL(/\/transactions/);

  await expect(
    page.locator('[data-testid="auto-categorise-btn"]'),
  ).toBeDisabled();
});

test("AC-1: Auto-Categorise button is absent in the empty state (no transactions at all)", async ({
  authenticatedPage: page,
}) => {
  // Navigate directly to Transactions with no data.
  const apiBasePromise: Promise<string> = new Promise((resolve) => {
    const handler = (response: import("@playwright/test").Response) => {
      const url = response.url();
      if (url.includes("/api/accounts") && !url.includes("/transactions")) {
        page.off("response", handler);
        resolve(url.replace(/\/api\/accounts.*$/, ""));
      }
    };
    page.on("response", handler);
  });

  await page.goto("/dashboard");
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
  await expect(
    page.locator('[data-testid="account-item"]').first(),
  ).toBeVisible({ timeout: 15_000 });

  const apiBase = await apiBasePromise;
  const token = await page.evaluate(
    () => localStorage.getItem("fa-auth-token") ?? "",
  );

  // Delete all accounts to guarantee a zero-transaction state.
  const existingRes = await page.request.get(`${apiBase}/api/accounts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (existingRes.ok()) {
    const { accounts: existing } = (await existingRes.json()) as {
      accounts: { id: string }[];
    };
    for (const acc of existing) {
      await page.request.delete(`${apiBase}/api/accounts/${acc.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  }

  await page.reload();
  await page.waitForURL(/\/dashboard/);

  // Create a single account (needed for the Transactions nav link to work).
  await page.request.post(`${apiBase}/api/accounts`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    data: { nickname: "Empty", accountType: "Checking" },
  });

  await page.reload();
  await page.waitForURL(/\/dashboard/);
  await expect(
    page.locator('[data-testid="account-item"]').first(),
  ).toBeVisible({ timeout: 15_000 });

  await page.getByRole("link", { name: /transactions/i }).click();
  await page.waitForURL(/\/transactions/);

  // In the empty-state branch the filter card is not rendered.
  await expect(
    page.locator('[data-testid="auto-categorise-btn"]'),
  ).not.toBeVisible();
});
