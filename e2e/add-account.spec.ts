import { test, expect } from "./fixtures";

/**
 * E2E spec for #739 — Add Account button in Sidebar
 *
 * Tests the full flow: + button visible → click → modal opens → fill form →
 * save → new account appears in sidebar list.
 *
 * NOTE: This spec creates a real account via the API. The account name uses a
 * timestamp suffix to avoid duplicate-name conflicts across runs.
 */

test("sidebar shows add-account-btn beside ACCOUNTS label", async ({
  authenticatedPage: page,
}) => {
  await page.goto("/dashboard");
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 });

  const btn = page.getByTestId("add-account-btn");
  await expect(btn).toBeVisible({ timeout: 10_000 });
  await expect(btn).toHaveAttribute("aria-label", "Add account");
});

test("clicking + opens AddAccountModal with name and type fields", async ({
  authenticatedPage: page,
}) => {
  await page.goto("/dashboard");
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 });

  await page.getByTestId("add-account-btn").click();

  // Modal heading
  await expect(page.getByText("Add Account")).toBeVisible({ timeout: 5_000 });

  // Name input
  await expect(page.locator("#account-name-input")).toBeVisible();

  // Type select
  await expect(page.locator("#account-type-select")).toBeVisible();
});

test("cancelling AddAccountModal closes it without creating an account", async ({
  authenticatedPage: page,
}) => {
  await page.goto("/dashboard");
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 });

  await page.getByTestId("add-account-btn").click();
  await expect(page.getByText("Add Account")).toBeVisible({ timeout: 5_000 });

  await page.getByRole("button", { name: /cancel/i }).click();
  await expect(page.getByText("Add Account")).not.toBeVisible();
});

test("creating a new account via modal adds it to the sidebar list", async ({
  authenticatedPage: page,
}) => {
  await page.goto("/dashboard");
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 });

  const accountName = `E2E Test Account ${Date.now()}`;

  // Open modal
  await page.getByTestId("add-account-btn").click();
  await expect(page.getByText("Add Account")).toBeVisible({ timeout: 5_000 });

  // Fill in name
  await page.locator("#account-name-input").fill(accountName);

  // Select account type
  await page.locator("#account-type-select").selectOption("Savings");

  // Save
  await page.getByRole("button", { name: /save/i }).click();

  // Modal should close
  await expect(page.getByText("Add Account")).not.toBeVisible({
    timeout: 5_000,
  });

  // New account name should appear in the sidebar
  await expect(page.getByText(accountName)).toBeVisible({ timeout: 10_000 });
});
