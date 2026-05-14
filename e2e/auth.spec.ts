import { test, expect, type Page } from "@playwright/test";

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

test("sign-in and account load", async ({ page }) => {
  await signIn(page);

  // Sidebar accounts section loads without an error
  await expect(page.locator(".account-list-error")).not.toBeVisible({
    timeout: 15_000,
  });
  await expect(page.locator(".sidebar-accounts")).toBeVisible();
});

test("sign-out returns to login page", async ({ page }) => {
  await signIn(page);

  await page.getByRole("button", { name: /sign out/i }).click();

  await page.waitForURL((url) => url.pathname.includes("/login"), {
    timeout: 10_000,
  });
  await expect(page).toHaveURL(/\/login/);
});
