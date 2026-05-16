import { test, expect } from "./fixtures";

const NAV_LINKS = [
  { label: /dashboard/i, path: "/dashboard" },
  { label: /transactions/i, path: "/transactions" },
  { label: /ai chat/i, path: "/chat" },
  { label: /settings/i, path: "/settings" },
];

test("sidebar navigation reaches all main sections", async ({
  authenticatedPage: page,
}) => {
  await page.goto("/");

  for (const { label, path } of NAV_LINKS) {
    await page.getByRole("link", { name: label }).click();
    await page.waitForURL((url) => url.pathname.startsWith(path), {
      timeout: 10_000,
    });
    await expect(page).toHaveURL(new RegExp(path));
  }
});
