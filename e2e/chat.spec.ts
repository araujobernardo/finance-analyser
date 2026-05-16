import { test, expect, uploadFixtures } from "./fixtures";

test("chat shows empty state when no transactions are loaded", async ({
  authenticatedPage: page,
}) => {
  await page.goto("/chat");
  await page.waitForURL(/\/chat/);
  await expect(page.locator(".chat-empty")).toBeVisible();
});

test("chat shows the welcome message after data is loaded", async ({
  authenticatedPage: page,
}) => {
  await uploadFixtures(page);
  await page.getByRole("link", { name: /ai chat/i }).click();
  await page.waitForURL(/\/chat/);

  await expect(page.locator('[data-testid="chat-messages"]')).toBeVisible();
  // The initial assistant greeting is always present
  await expect(page.locator(".chat-bubble").first()).toContainText(
    "Ask me anything",
  );
});

test("sending a message receives an AI response", async ({
  authenticatedPage: page,
}) => {
  await uploadFixtures(page);
  await page.getByRole("link", { name: /ai chat/i }).click();
  await page.waitForURL(/\/chat/);

  await page.locator('[data-testid="chat-input"]').fill("Hello");
  await page.locator('[data-testid="chat-send"]').click();

  // User message appears immediately
  await expect(page.locator(".chat-bubble.user")).toBeVisible();

  // Wait for the AI response — allows time for the Haiku API roundtrip
  await expect(
    page.locator(".chat-msg-row:not(.user) .chat-bubble:not(.chat-typing)"),
  ).toHaveCount(2, { timeout: 30_000 });
});
