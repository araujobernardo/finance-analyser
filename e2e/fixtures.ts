import path from "path";
import { fileURLToPath } from "url";
import {
  test as base,
  expect,
  type Page,
  type Response,
} from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const FIXTURE_A = path.join(__dirname, "fixtures/sample-statement.csv");
export const FIXTURE_B = path.join(
  __dirname,
  "fixtures/sample-statement-b.csv",
);

// Hard-coded fixture transaction data matching the CSV files.
// Used by uploadFixtures() to seed test data via direct API calls — avoiding
// the UI upload path (which has an accountId-timing sensitivity in CI).
const FIXTURE_A_TRANSACTIONS = [
  {
    date: "2000-01-15",
    amount: -100,
    description: "Transfer to Account B",
    isTransfer: true,
    isManualTransfer: false,
  },
];

const FIXTURE_B_TRANSACTIONS = [
  {
    date: "2000-01-15",
    amount: 100,
    description: "Transfer from Account A",
    isTransfer: true,
    isManualTransfer: false,
  },
];

type AuthFixtures = {
  authenticatedPage: Page;
};

// Use this in all specs except auth.spec.ts.
// Loads the saved auth session from global-setup — no login boilerplate needed.
export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ browser }, provide) => {
    const context = await browser.newContext({
      storageState: ".playwright/auth.json",
    });
    const page = await context.newPage();
    await provide(page);
    await context.close();
  },
});

/**
 * Discovers the backend API base URL by intercepting the first /api/accounts
 * response that the AccountContext makes when the dashboard loads.
 *
 * On Render the frontend (finance-analyser-dmff.onrender.com) and the API
 * (finance-analyser-web-service.onrender.com) are on separate domains.
 * VITE_API_URL is baked into the Vite bundle at build time and is not available
 * as a Node.js env-var at test runtime, so we discover it dynamically.
 */
async function discoverApiBase(page: Page): Promise<string> {
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
 * Seeds both fixture CSV datasets into the DB via direct API calls, then
 * navigates to /dashboard and waits until the app reflects the new data.
 *
 * Uses direct API calls instead of the Sidebar upload UI so that test
 * data seeding is decoupled from the upload UI's accountId-resolution
 * timing. The UI upload behaviour is tested separately in csv-import.spec.ts.
 *
 * Strategy:
 *   1. Navigate to /dashboard — AccountContext fires GET /api/accounts.
 *   2. Intercept that response to learn the API base URL.
 *   3. POST fixture transactions to /api/accounts/:id/transactions/import
 *      for each of the two test accounts (A and B by createdAt order).
 *   4. Reload so React refreshes its transaction data from the DB.
 */
export async function uploadFixtures(page: Page): Promise<void> {
  // Start intercepting before navigation so we capture the first accounts call.
  const apiBasePromise = discoverApiBase(page);

  await page.goto("/dashboard");
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 });

  // Wait for the accounts list to render so we know the API call went out.
  await expect(
    page.locator('[data-testid="account-item"]').first(),
  ).toBeVisible({ timeout: 15_000 });

  const apiBase = await apiBasePromise;

  // Read the auth token from localStorage.
  const token = await page.evaluate(
    () => localStorage.getItem("fa-auth-token") ?? "",
  );
  if (!token) throw new Error("[uploadFixtures] No auth token in localStorage");

  // Fetch the account list from the API to get real UUIDs.
  const accountsRes = await page.request.get(`${apiBase}/api/accounts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!accountsRes.ok()) {
    throw new Error(
      `[uploadFixtures] GET /api/accounts failed: ${accountsRes.status()}`,
    );
  }
  const { accounts } = (await accountsRes.json()) as {
    accounts: { id: string; nickname: string }[];
  };
  if (accounts.length === 0) {
    throw new Error("[uploadFixtures] No accounts found in DB");
  }

  // Import fixture A transactions into the first account (oldest by createdAt).
  const accountA = accounts[0];
  const importA = await page.request.post(
    `${apiBase}/api/accounts/${accountA.id}/transactions/import`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data: { transactions: FIXTURE_A_TRANSACTIONS },
    },
  );
  if (!importA.ok()) {
    throw new Error(
      `[uploadFixtures] Import to account A (${accountA.id}) failed: ${importA.status()} — ${await importA.text()}`,
    );
  }

  // Import fixture B transactions into the second account if one exists,
  // otherwise reuse account A (tests only need data to exist, not exact split).
  const accountB = accounts.length > 1 ? accounts[1] : accounts[0];
  const importB = await page.request.post(
    `${apiBase}/api/accounts/${accountB.id}/transactions/import`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data: { transactions: FIXTURE_B_TRANSACTIONS },
    },
  );
  if (!importB.ok()) {
    throw new Error(
      `[uploadFixtures] Import to account B (${accountB.id}) failed: ${importB.status()} — ${await importB.text()}`,
    );
  }

  // Reload so the React app refreshes its transaction data from the DB.
  await page.reload();
  await page.waitForURL(/\/dashboard/);
  // Wait for the account list to re-appear after reload (data fully loaded).
  await expect(
    page.locator('[data-testid="account-item"]').first(),
  ).toBeVisible({ timeout: 15_000 });
}

export { expect };
// verify-auth-fix: confirms localStorage auth is captured by Playwright storageState
