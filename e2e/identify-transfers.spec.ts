import { test, expect } from "./fixtures";

// ── helper ─────────────────────────────────────────────────────────────────────

/**
 * Seeds two accounts (A and B) with a matching debit/credit pair on the same
 * date and amount. Returns { apiBase, token, accountAId, accountBId, txnAId, txnBId }.
 * The pair is a confirmed match (same payee keyword "INTERNET BANKING TRANSFER").
 */
async function seedTransferPairAndNavigate(
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

  // Create accounts A and B.
  const createA = await page.request.post(`${apiBase}/api/accounts`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    data: { nickname: "Main", accountType: "Checking" },
  });
  const createB = await page.request.post(`${apiBase}/api/accounts`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    data: { nickname: "Savings", accountType: "Savings" },
  });
  const { account: accountA } = (await createA.json()) as {
    account: { id: string };
  };
  const { account: accountB } = (await createB.json()) as {
    account: { id: string };
  };

  await page.evaluate(() => {
    localStorage.setItem("finance_analyser_active_account", "all");
  });

  // Import debit from A and credit to B — same date, same absolute amount.
  const importA = await page.request.post(
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
            amount: -500,
            description: "INTERNET BANKING TRANSFER TO SAVINGS",
            isTransfer: false,
            isManualTransfer: false,
          },
        ],
      },
    },
  );
  const importB = await page.request.post(
    `${apiBase}/api/accounts/${accountB.id}/transactions/import`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data: {
        transactions: [
          {
            date: "2000-01-15",
            amount: 500,
            description: "INTERNET BANKING TRANSFER FROM MAIN",
            isTransfer: false,
            isManualTransfer: false,
          },
        ],
      },
    },
  );

  const { transactions: txnsA } = (await (
    await page.request.get(
      `${apiBase}/api/accounts/${accountA.id}/transactions`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
  ).json()) as { transactions: { id: string }[] };

  const { transactions: txnsB } = (await (
    await page.request.get(
      `${apiBase}/api/accounts/${accountB.id}/transactions`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
  ).json()) as { transactions: { id: string }[] };

  void importA;
  void importB;

  await page.reload();
  await page.waitForURL(/\/dashboard/);
  await expect(
    page.locator('[data-testid="account-item"]').first(),
  ).toBeVisible({ timeout: 15_000 });

  await page.getByRole("link", { name: /transactions/i }).click();
  await page.waitForURL(/\/transactions/);

  return {
    apiBase,
    token,
    accountAId: accountA.id,
    accountBId: accountB.id,
    txnAId: txnsA[0]?.id ?? "",
    txnBId: txnsB[0]?.id ?? "",
  };
}

// ── tests ──────────────────────────────────────────────────────────────────────

test("AC-1: Identify Transfers button is present in the filter card when transactions exist", async ({
  authenticatedPage: page,
}) => {
  await seedTransferPairAndNavigate(page);
  await expect(
    page.locator('[data-testid="identify-transfers-btn"]'),
  ).toBeVisible();
});

test("AC-7: clicking the button opens the inline strip when transfer pairs are found", async ({
  authenticatedPage: page,
}) => {
  await seedTransferPairAndNavigate(page);

  await page.locator('[data-testid="identify-transfers-btn"]').click();

  await expect(
    page.locator('[data-testid="identify-transfers-strip"]'),
  ).toBeVisible({ timeout: 10_000 });
});

test("AC-4: confirmed pairs are pre-checked in the strip", async ({
  authenticatedPage: page,
}) => {
  await seedTransferPairAndNavigate(page);

  await page.locator('[data-testid="identify-transfers-btn"]').click();
  await expect(
    page.locator('[data-testid="identify-transfers-strip"]'),
  ).toBeVisible({ timeout: 10_000 });

  // The confirmed pair checkbox should be checked
  const pairCheckboxes = page.locator(".txn-identify-strip__pair-check");
  await expect(pairCheckboxes.first()).toBeChecked();
});

test("AC-11: Cancel closes the strip without making any changes", async ({
  authenticatedPage: page,
}) => {
  await seedTransferPairAndNavigate(page);

  await page.locator('[data-testid="identify-transfers-btn"]').click();
  await expect(
    page.locator('[data-testid="identify-transfers-strip"]'),
  ).toBeVisible({ timeout: 10_000 });

  await page.locator('[data-testid="identify-transfers-cancel"]').click();

  await expect(
    page.locator('[data-testid="identify-transfers-strip"]'),
  ).not.toBeVisible();
  // Transactions should remain in the list (not marked as transfers)
  const rowCount = page.locator('[data-testid="txn-row-count"]');
  await expect(rowCount).toContainText(/[1-9]/);
});

test("AC-8/AC-9: Mark as Transfers PATCHes the pair and shows success toast", async ({
  authenticatedPage: page,
}) => {
  await seedTransferPairAndNavigate(page);

  await page.locator('[data-testid="identify-transfers-btn"]').click();
  await expect(
    page.locator('[data-testid="identify-transfers-strip"]'),
  ).toBeVisible({ timeout: 10_000 });

  await page.locator('[data-testid="identify-transfers-mark"]').click();

  // Success toast should appear
  await expect(page.locator(".txn-toast:not(.txn-toast--error)")).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.locator(".txn-toast")).toContainText(/Marked.*pair/);

  // Strip should close after marking
  await expect(
    page.locator('[data-testid="identify-transfers-strip"]'),
  ).not.toBeVisible();
});

test("AC-16: already-marked transfers are excluded from the scan (toast shown)", async ({
  authenticatedPage: page,
}) => {
  const { apiBase, token, txnAId } = await seedTransferPairAndNavigate(page);

  // Pre-mark txnA as a transfer so neither transaction qualifies as unpaired
  await page.request.patch(`${apiBase}/api/transactions/${txnAId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    data: { isTransfer: true },
  });

  await page.reload();
  await page.waitForURL(/\/transactions/);

  await page.locator('[data-testid="identify-transfers-btn"]').click();

  // Since the debit side is already a transfer, no pairs should be found
  await expect(page.locator(".txn-toast")).toBeVisible({ timeout: 10_000 });
  await expect(page.locator(".txn-toast")).toContainText(
    "No transfer pairs found.",
  );
  await expect(
    page.locator('[data-testid="identify-transfers-strip"]'),
  ).not.toBeVisible();
});
