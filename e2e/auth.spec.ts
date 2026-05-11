import { test, expect } from "@playwright/test";

const email = process.env.E2E_EMAIL!;
const password = process.env.E2E_PASSWORD!;

test("sign-in and account load", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();

  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 15_000,
  });

  await expect(page.getByText("Failed to load accounts")).not.toBeVisible();

  const accountItems = page.locator(".sidebar-account-name");
  await expect(accountItems.first()).toBeVisible({ timeout: 15_000 });
});
