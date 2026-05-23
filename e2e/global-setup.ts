import { chromium, type FullConfig } from "@playwright/test";
import fs from "fs";

async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL ?? "http://localhost:5173";
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "[global-setup] E2E_EMAIL and E2E_PASSWORD must be set in your .env file",
    );
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Intercept the login API request to discover the actual API base URL.
  // The app's VITE_API_URL is baked into the Vite bundle at build time and is
  // not available as a Node.js env var at runtime. Listening to the network
  // request made by the app during login reliably gives us the API origin
  // regardless of the deployment topology (monolith vs. split services).
  let apiBase = baseURL;
  page.on("request", (req) => {
    const url = req.url();
    if (url.includes("/api/auth/login")) {
      apiBase = url.replace(/\/api\/auth\/login.*$/, "");
    }
  });

  await page.goto(`${baseURL}/login`);
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 60_000,
  });

  // Clear any pre-existing app data so every test starts from a clean slate.
  // Auth tokens (fa-auth-token, fa-auth-user) are intentionally kept.
  // finance_analyser_active_account must also be cleared — if it holds "all"
  // from a previous session, the upload hook falls back to DEFAULT_ACCOUNT_ID
  // ("default") which does not exist in the DB, causing all imports to fail.
  await page.evaluate(() => {
    const appKeys = [
      "pfa-v3-transactions",
      "pfa-v3-merchants",
      "pfa-v3-budgets",
      "pfa-v3-accounts",
      "pfa-v3-categories",
      "finance_analyser_active_account",
    ];
    appKeys.forEach((k) => localStorage.removeItem(k));
  });

  // Delete all existing accounts so every CI run starts from a clean slate.
  // Account deletion cascades to transactions (onDelete: "cascade" in schema),
  // removing stale fixture data that would otherwise cause imports to be skipped
  // as duplicates on subsequent runs. After deletion, accounts A and B are
  // recreated fresh so fixture seeding in uploadFixtures() always succeeds.
  console.log(`[global-setup] Using API base: ${apiBase}`);

  const token = await page.evaluate(
    () => localStorage.getItem("fa-auth-token") ?? "",
  );

  if (token) {
    const accountsRes = await page.request.get(`${apiBase}/api/accounts`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (accountsRes.ok()) {
      const body = (await accountsRes.json()) as {
        accounts: { id: string; nickname: string }[];
      };

      // Delete every existing account — cascade removes all their transactions.
      for (const account of body.accounts) {
        const deleteRes = await page.request.delete(
          `${apiBase}/api/accounts/${account.id}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!deleteRes.ok() && deleteRes.status() !== 404) {
          console.warn(
            `[global-setup] Could not delete account ${account.id} (status ${deleteRes.status()}).`,
          );
        }
      }

      if (body.accounts.length > 0) {
        console.log(
          `[global-setup] Deleted ${body.accounts.length} existing account(s) — clean slate.`,
        );
      }

      // Create accounts A and B fresh.
      for (const account of [
        { nickname: "A", accountType: "Checking" },
        { nickname: "B", accountType: "Checking" },
      ]) {
        await page.request.post(`${apiBase}/api/accounts`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          data: account,
        });
      }

      console.log("[global-setup] Created accounts A and B.");
    } else {
      console.warn(
        `[global-setup] Could not fetch accounts for setup (status ${accountsRes.status()}).`,
      );
    }

    // Delete all existing budgets so budget E2E tests start from a clean slate.
    // Without this a prior run's "Groceries" budget causes a 409 on the next run
    // and the budget-row never appears, failing the budget spec.
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const budgetsRes = await page.request.get(
      `${apiBase}/api/budgets?year=${year}&month=${month}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (budgetsRes.ok()) {
      const budgets = (await budgetsRes.json()) as { id: string }[];
      for (const budget of budgets) {
        await page.request.delete(`${apiBase}/api/budgets/${budget.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      if (budgets.length > 0) {
        console.log(
          `[global-setup] Deleted ${budgets.length} existing budget(s) for ${year}-${month} — clean slate.`,
        );
      }
    }
  } else {
    console.warn(
      "[global-setup] No auth token found — skipping account setup.",
    );
  }

  fs.mkdirSync(".playwright", { recursive: true });
  await page.context().storageState({ path: ".playwright/auth.json" });
  await browser.close();
}

export default globalSetup;
