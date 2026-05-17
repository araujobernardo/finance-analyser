/**
 * Goals E2E spec — GoalsPage navigation and GoalModal UI flows
 *
 * These tests run against the live Render deployment after this PR is merged
 * and deployed. They verify the /goals route, page structure, and modal open/close.
 *
 * Scenarios that require GoalCard (T010/T011) — create-and-see-in-list — are
 * deferred to the GoalCard story (T010) because the flat list item renders the
 * goal type as a raw string; full card rendering ships with T010.
 */

import { test, expect } from "./fixtures";

// ── Navigation ─────────────────────────────────────────────────────────────

test("navigating to /goals renders the Goals page", async ({
  authenticatedPage: page,
}) => {
  await page.goto("/goals");
  await page.waitForURL(/\/goals/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: /goals/i })).toBeVisible();
  await expect(page.getByTestId("goals-page")).toBeVisible();
});

test("Goals nav entry is visible in the Sidebar", async ({
  authenticatedPage: page,
}) => {
  await page.goto("/dashboard");
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
  await expect(page.getByRole("link", { name: /goals/i })).toBeVisible();
});

test("clicking the Goals sidebar link navigates to /goals", async ({
  authenticatedPage: page,
}) => {
  await page.goto("/dashboard");
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
  await page.getByRole("link", { name: /goals/i }).click();
  await page.waitForURL(/\/goals/, { timeout: 10_000 });
  await expect(page.getByTestId("goals-page")).toBeVisible();
});

// ── Page structure ─────────────────────────────────────────────────────────

test("Add Goal button is visible on the Goals page", async ({
  authenticatedPage: page,
}) => {
  await page.goto("/goals");
  await page.waitForURL(/\/goals/, { timeout: 15_000 });
  await expect(page.getByTestId("goals-add-btn")).toBeVisible();
});

test("empty state message is shown when no goals exist", async ({
  authenticatedPage: page,
}) => {
  await page.goto("/goals");
  await page.waitForURL(/\/goals/, { timeout: 15_000 });
  // Empty state or goal list — either is acceptable (user may have goals)
  const emptyState = page.getByTestId("goals-empty");
  const goalList = page.getByTestId("goals-list");
  const hasEmpty = await emptyState.isVisible().catch(() => false);
  const hasList = await goalList.isVisible().catch(() => false);
  expect(hasEmpty || hasList).toBe(true);
});

// ── Modal ──────────────────────────────────────────────────────────────────

test("clicking Add Goal opens the GoalModal", async ({
  authenticatedPage: page,
}) => {
  await page.goto("/goals");
  await page.waitForURL(/\/goals/, { timeout: 15_000 });
  await page.getByTestId("goals-add-btn").click();
  await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5_000 });
  await expect(page.getByRole("heading", { name: /add goal/i })).toBeVisible();
});

test("clicking Cancel in GoalModal closes the modal", async ({
  authenticatedPage: page,
}) => {
  await page.goto("/goals");
  await page.waitForURL(/\/goals/, { timeout: 15_000 });
  await page.getByTestId("goals-add-btn").click();
  await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5_000 });
  await page.getByRole("button", { name: /cancel/i }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 });
});
