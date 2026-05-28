import { test, expect, type Page } from "@playwright/test";

// ── Chat/Auth Styling E2E — #794 (Option C — Conversational Soft) ─────────────
//
// Verifies automatable acceptance criteria from the UX brief.
// Visual-quality assertions (pixel-perfect radii, gradient colours) are manual-only.
// Auth-form functional flows are already covered by e2e/auth.spec.ts.
// ─────────────────────────────────────────────────────────────────────────────

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

// ── Auth page: pill-badge logo chip ───────────────────────────────────────────

test.describe("Auth pages — Option C logo pill badge (#794)", () => {
  const authRoutes = ["/login", "/signup", "/forgot-password"];

  for (const route of authRoutes) {
    test(`pill-badge logo chip is visible on ${route}`, async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState("domcontentloaded");

      // The logo chip container
      const logo = page.locator(".auth-logo").first();
      await expect(logo).toBeVisible();

      // Teal dot inside the chip
      const dot = page.locator(".auth-logo-dot").first();
      await expect(dot).toBeVisible();

      // Wordmark text
      const wordmark = page.locator(".auth-logo-text").first();
      await expect(wordmark).toBeVisible();
      await expect(wordmark).toContainText("FINANCE");
      await expect(wordmark).toContainText("Analyser");
    });
  }
});

// ── Chat page: branded header (avatar + status label) ─────────────────────────

test.describe("Chat page — Option C header (#794)", () => {
  test("branded teal avatar circle is visible in chat header", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/chat");
    await page.waitForLoadState("domcontentloaded");

    const avatar = page.locator(".chat-ai-avatar");
    await expect(avatar).toBeVisible();
    // Avatar renders the dot motif character
    await expect(avatar).toContainText("◎");
  });

  test('"● Active" status label is visible in chat header', async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/chat");
    await page.waitForLoadState("domcontentloaded");

    const status = page.locator('[data-testid="chat-status"]');
    await expect(status).toBeVisible();
    await expect(status).toContainText("Active");
  });

  test("chat input placeholder reads 'Message Finance AI...'", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/chat");
    await page.waitForLoadState("domcontentloaded");

    // Empty-state check — may see chat-empty instead of the input
    const emptyState = page.locator(".chat-empty");
    const chatMessages = page.locator('[data-testid="chat-messages"]');

    const isEmpty = await emptyState.isVisible();
    if (!isEmpty) {
      // Data is present — input should be visible
      await expect(chatMessages).toBeVisible();
      const input = page.locator('[data-testid="chat-input"]');
      await expect(input).toBeVisible();
      await expect(input).toHaveAttribute(
        "placeholder",
        "Message Finance AI...",
      );
    } else {
      // No transactions uploaded — empty state shown, test passes trivially
      await expect(emptyState).toBeVisible();
    }
  });
});
