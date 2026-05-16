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

  fs.mkdirSync(".playwright", { recursive: true });
  await page.context().storageState({ path: ".playwright/auth.json" });
  await browser.close();
}

export default globalSetup;
