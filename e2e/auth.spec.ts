import { test, expect, type Page } from "@playwright/test";

// Auth spec tests the login/logout UI itself — it must start unauthenticated,
// so it imports directly from @playwright/test (not from fixtures.ts).

const email = process.env.E2E_EMAIL!;
const password = process.env.E2E_PASSWORD!;

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 15_000,
  });
}

test("valid credentials reach the dashboard", async ({ page }) => {
  await signIn(page);
  await expect(page).not.toHaveURL(/\/login/);
  await expect(page.locator(".sidebar-accounts")).toBeVisible();
});

test("sign out returns to the login page", async ({ page }) => {
  await signIn(page);
  await page.getByRole("button", { name: /sign out/i }).click();
  await page.waitForURL((url) => url.pathname.includes("/login"), {
    timeout: 10_000,
  });
  await expect(page).toHaveURL(/\/login/);
});
