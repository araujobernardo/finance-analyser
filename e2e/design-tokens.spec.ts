import { test, expect, type Page } from "@playwright/test";

// Design tokens spec verifies that the Option B warm palette CSS variables
// are applied globally. Runs against the public /login page (no auth needed)
// since :root variables load before authentication.

async function getRootToken(page: Page, token: string): Promise<string> {
  return page.evaluate((t: string) => {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(t)
      .trim();
  }, token);
}

test.describe("Option B design tokens (#784)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    // Wait for the page to be ready
    await page.waitForLoadState("domcontentloaded");
  });

  test("background token is warm off-white (#f4f1ed)", async ({ page }) => {
    const bg = await getRootToken(page, "--bg");
    expect(bg).toBe("#f4f1ed");
  });

  test("surface token is warm white (#faf8f5)", async ({ page }) => {
    const surface = await getRootToken(page, "--surface");
    expect(surface).toBe("#faf8f5");
  });

  test("accent token is teal (#0f9d8a)", async ({ page }) => {
    const accent = await getRootToken(page, "--accent");
    expect(accent).toBe("#0f9d8a");
  });

  test("text token is dark green (#1e2a22)", async ({ page }) => {
    const text = await getRootToken(page, "--text");
    expect(text).toBe("#1e2a22");
  });

  test("red token is warm red (#c53030)", async ({ page }) => {
    const red = await getRootToken(page, "--red");
    expect(red).toBe("#c53030");
  });

  test("body uses Nunito font family", async ({ page }) => {
    const fontFamily = await page.evaluate(
      () => getComputedStyle(document.body).fontFamily,
    );
    expect(fontFamily).toContain("Nunito");
  });

  test("sidebar-bg token is defined", async ({ page }) => {
    const sidebarBg = await getRootToken(page, "--sidebar-bg");
    expect(sidebarBg).toBe("#f9f7f4");
  });

  test("shadow-sm token is defined", async ({ page }) => {
    const shadowSm = await getRootToken(page, "--shadow-sm");
    expect(shadowSm).not.toBe("");
  });

  test("category colour tokens are defined", async ({ page }) => {
    const catGroceries = await getRootToken(page, "--cat-groceries");
    const catTransport = await getRootToken(page, "--cat-transport");
    expect(catGroceries).toBe("#4a7c59");
    expect(catTransport).toBe("#2e6b8a");
  });
});
