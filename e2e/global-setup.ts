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
  await page.evaluate(() => {
    const appKeys = [
      "pfa-v3-transactions",
      "pfa-v3-merchants",
      "pfa-v3-budgets",
      "pfa-v3-accounts",
      "pfa-v3-categories",
    ];
    appKeys.forEach((k) => localStorage.removeItem(k));
  });

  // Delete all accounts from the DB for this test user so that fixture data
  // from a previous CI run does not accumulate across runs.
  // Deleting an account cascades to its transactions (onDelete: "cascade").
  // All e2e tests that need data call uploadFixtures() to re-import it, so
  // clearing accounts is always safe here.
  const token = await page.evaluate(
    () => localStorage.getItem("fa-auth-token") ?? "",
  );

  console.log(`[global-setup] Using API base: ${apiBase}`);

  if (token) {
    const accountsRes = await page.request.get(`${apiBase}/api/accounts`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (accountsRes.ok()) {
      const body = (await accountsRes.json()) as {
        accounts: { id: string }[];
      };
      for (const account of body.accounts) {
        await page.request.delete(`${apiBase}/api/accounts/${account.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      console.log(
        `[global-setup] Deleted ${body.accounts.length} account(s) from DB.`,
      );
    } else {
      console.warn(
        `[global-setup] Could not fetch accounts for cleanup (status ${accountsRes.status()}).`,
      );
    }
  } else {
    console.warn("[global-setup] No auth token found — skipping DB cleanup.");
  }

  fs.mkdirSync(".playwright", { recursive: true });
  await page.context().storageState({ path: ".playwright/auth.json" });
  await browser.close();
}

export default globalSetup;
