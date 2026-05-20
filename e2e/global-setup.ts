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

  // Ensure at least one Checking account exists in the DB so the upload hook
  // has a valid account UUID to post transactions to. If accounts already exist
  // they are left untouched. A second account "B" is also created if absent so
  // the transactions-page account-filter test can find both "A" and "B".
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

      const existingNicknames = new Set(body.accounts.map((a) => a.nickname));

      const accountsToCreate = [
        { nickname: "A", accountType: "Checking" },
        { nickname: "B", accountType: "Checking" },
      ].filter((a) => !existingNicknames.has(a.nickname));

      for (const account of accountsToCreate) {
        await page.request.post(`${apiBase}/api/accounts`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          data: account,
        });
      }

      if (accountsToCreate.length > 0) {
        console.log(
          `[global-setup] Created ${accountsToCreate.length} missing account(s): ${accountsToCreate.map((a) => a.nickname).join(", ")}`,
        );
      } else {
        console.log(
          `[global-setup] Accounts already exist (${body.accounts.length} found) — no accounts created.`,
        );
      }
    } else {
      console.warn(
        `[global-setup] Could not fetch accounts for setup (status ${accountsRes.status()}).`,
      );
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
