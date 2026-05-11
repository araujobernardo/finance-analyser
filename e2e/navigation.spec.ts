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

const NAV_LINKS = [
  { label: /dashboard/i, path: "/dashboard" },
  { label: /transactions/i, path: "/transactions" },
  { label: /ai chat/i, path: "/chat" },
  { label: /settings/i, path: "/settings" },
];

test("sidebar navigation reaches all main sections", async ({ page }) => {
  await signIn(page);

  for (const { label, path } of NAV_LINKS) {
    await page.getByRole("link", { name: label }).click();
    await page.waitForURL((url) => url.pathname.startsWith(path), {
      timeout: 10_000,
    });
    await expect(page).toHaveURL(new RegExp(path));
  }
});
