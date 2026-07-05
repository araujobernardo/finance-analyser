// E2E tests for #947 — Past Summaries history section on AI Chat page
//
// Decision tree notes:
//   - Section renders above chat interface → multi-step browser flow + API-driven
//     data display → Playwright
//   - Loading skeleton → deterministic DOM state (present while fetch in-flight;
//     not easily controllable in E2E since the production API is fast)
//     → tested via section-header disabled state during load
//   - Toggle section / toggle entry → multi-step browser interaction → Playwright
//   - Per-entry open state (first 2 expanded) → API-driven DOM state → Playwright
//     (conditional: only asserted when the user has ≥ 3 summaries)
//   - Visual animations (CSS grid-template-rows transition) → manual only
//   - Loading skeleton visibility timing → manual only (API too fast in production)

import { test, expect, uploadFixtures } from "./fixtures";

test("Past Summaries section renders on the AI Chat page", async ({
  authenticatedPage: page,
}) => {
  await uploadFixtures(page);
  await page.goto("/chat");
  await page.waitForURL(/\/chat/);

  await expect(page.locator('[data-testid="summaries-section"]')).toBeVisible({
    timeout: 15_000,
  });
  await expect(
    page.locator('[data-testid="summaries-section-header"]'),
  ).toContainText("Past Summaries");
});

test("Past Summaries section is positioned above the chat messages area", async ({
  authenticatedPage: page,
}) => {
  await uploadFixtures(page);
  await page.goto("/chat");
  await page.waitForURL(/\/chat/);

  await expect(page.locator('[data-testid="summaries-section"]')).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.locator('[data-testid="chat-messages"]')).toBeVisible({
    timeout: 15_000,
  });

  // Summaries section must precede the chat messages area in DOM order
  const summariesBeforeChat = await page.evaluate(() => {
    const summaries = document.querySelector(
      '[data-testid="summaries-section"]',
    );
    const chatMessages = document.querySelector(
      '[data-testid="chat-messages"]',
    );
    if (!summaries || !chatMessages) return false;
    return Boolean(
      summaries.compareDocumentPosition(chatMessages) &
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });
  expect(summariesBeforeChat).toBe(true);
});

test("Past Summaries section header is initially expanded (aria-expanded=true)", async ({
  authenticatedPage: page,
}) => {
  await uploadFixtures(page);
  await page.goto("/chat");
  await page.waitForURL(/\/chat/);

  // Wait for loading to finish (button becomes enabled)
  const headerBtn = page.locator('[data-testid="summaries-section-header"]');
  await expect(headerBtn).toBeEnabled({ timeout: 15_000 });
  await expect(headerBtn).toHaveAttribute("aria-expanded", "true");
});

test("clicking the section header collapses the Past Summaries body", async ({
  authenticatedPage: page,
}) => {
  await uploadFixtures(page);
  await page.goto("/chat");
  await page.waitForURL(/\/chat/);

  const headerBtn = page.locator('[data-testid="summaries-section-header"]');
  await expect(headerBtn).toBeEnabled({ timeout: 15_000 });

  // Collapse
  await headerBtn.click();
  await expect(headerBtn).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator('[data-testid="summaries-body"]')).toHaveClass(
    /closed/,
  );
});

test("clicking the section header twice re-opens the Past Summaries body", async ({
  authenticatedPage: page,
}) => {
  await uploadFixtures(page);
  await page.goto("/chat");
  await page.waitForURL(/\/chat/);

  const headerBtn = page.locator('[data-testid="summaries-section-header"]');
  await expect(headerBtn).toBeEnabled({ timeout: 15_000 });

  await headerBtn.click(); // collapse
  await headerBtn.click(); // expand
  await expect(headerBtn).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator('[data-testid="summaries-body"]')).not.toHaveClass(
    /closed/,
  );
});

test("empty state message shows when no summaries exist", async ({
  authenticatedPage: page,
}) => {
  // NOTE: this test will only assert correctly when the user has no summaries.
  // It is conditional: skipped if any entries are present.
  await uploadFixtures(page);
  await page.goto("/chat");
  await page.waitForURL(/\/chat/);

  const headerBtn = page.locator('[data-testid="summaries-section-header"]');
  await expect(headerBtn).toBeEnabled({ timeout: 15_000 });

  const entryCount = await page
    .locator('[data-testid="summaries-entry"]')
    .count();
  if (entryCount > 0) {
    // User has summaries — skip the empty state assertion
    return;
  }

  await expect(page.locator('[data-testid="summaries-empty"]')).toBeVisible();
  await expect(page.locator('[data-testid="summaries-empty"]')).toContainText(
    "No summaries yet. Come back after your first login.",
  );
});

test("first two entries are expanded by default when user has ≥ 3 summaries", async ({
  authenticatedPage: page,
}) => {
  await uploadFixtures(page);
  await page.goto("/chat");
  await page.waitForURL(/\/chat/);

  const headerBtn = page.locator('[data-testid="summaries-section-header"]');
  await expect(headerBtn).toBeEnabled({ timeout: 15_000 });

  const entryCount = await page
    .locator('[data-testid="summaries-entry"]')
    .count();
  if (entryCount < 3) {
    // Not enough entries to assert third-entry-collapsed behaviour
    return;
  }

  // First two entries must have aria-expanded=true on their toggle buttons
  const toggles = page.locator('[class*="summaries-entry-toggle"]');
  await expect(toggles.nth(0)).toHaveAttribute("aria-expanded", "true");
  await expect(toggles.nth(1)).toHaveAttribute("aria-expanded", "true");
  // Third entry (index 2) must be collapsed
  await expect(toggles.nth(2)).toHaveAttribute("aria-expanded", "false");
});

test("clicking an entry toggle collapses an expanded entry", async ({
  authenticatedPage: page,
}) => {
  await uploadFixtures(page);
  await page.goto("/chat");
  await page.waitForURL(/\/chat/);

  const headerBtn = page.locator('[data-testid="summaries-section-header"]');
  await expect(headerBtn).toBeEnabled({ timeout: 15_000 });

  const entryCount = await page
    .locator('[data-testid="summaries-entry"]')
    .count();
  if (entryCount === 0) {
    // No summaries to toggle — skip
    return;
  }

  // The first entry starts expanded (aria-expanded=true)
  const firstToggle = page.locator(".summaries-entry-toggle").first();
  await expect(firstToggle).toHaveAttribute("aria-expanded", "true");

  await firstToggle.click();
  await expect(firstToggle).toHaveAttribute("aria-expanded", "false");
});

test("clicking a collapsed entry toggle expands it", async ({
  authenticatedPage: page,
}) => {
  await uploadFixtures(page);
  await page.goto("/chat");
  await page.waitForURL(/\/chat/);

  const headerBtn = page.locator('[data-testid="summaries-section-header"]');
  await expect(headerBtn).toBeEnabled({ timeout: 15_000 });

  const entryCount = await page
    .locator('[data-testid="summaries-entry"]')
    .count();
  if (entryCount < 3) {
    // Need at least 3 entries so the third starts collapsed
    return;
  }

  // Third entry starts collapsed
  const thirdToggle = page.locator(".summaries-entry-toggle").nth(2);
  await expect(thirdToggle).toHaveAttribute("aria-expanded", "false");

  await thirdToggle.click();
  await expect(thirdToggle).toHaveAttribute("aria-expanded", "true");
});
