/**
 * Net Worth E2E spec — AssetModal backdrop (bug #551)
 *
 * Automatable scenarios:
 *   1. Navigate to /net-worth — verify page is visible
 *   2. Click "Add" button in Assets section — AssetModal opens (dialog visible)
 *   3. AssetModal has role="dialog" and aria-modal="true"
 *   4. Clicking the backdrop (outside the panel) closes the modal
 *
 * Manual-only scenarios (not automatable):
 *   - Visual backdrop dimming: CSS rendering quality — Playwright has no reliable
 *     cross-browser colour assertion for computed background-color on the overlay.
 *     Verified visually: rgba(0,0,0,0.6) overlay is now defined in index.css.
 */

import { test, expect } from "./fixtures";

test("net-worth page is reachable and asset list is visible", async ({
  authenticatedPage: page,
}) => {
  await page.goto("/net-worth");
  await page.waitForURL(/\/net-worth/, { timeout: 15_000 });
  await expect(page.locator('[data-testid="net-worth-page"]')).toBeVisible();
  await expect(page.locator('[data-testid="asset-list"]')).toBeVisible();
});

test("clicking Add button opens the AssetModal dialog", async ({
  authenticatedPage: page,
}) => {
  await page.goto("/net-worth");
  await page.waitForURL(/\/net-worth/, { timeout: 15_000 });

  // Click the "+ Add" button in the Assets section
  await page.locator('[data-testid="add-asset-btn"]').click();

  // The modal should now be visible with correct ARIA attributes
  const dialog = page.locator('[data-testid="asset-modal-backdrop"]');
  await expect(dialog).toBeVisible({ timeout: 5_000 });
  await expect(dialog).toHaveAttribute("role", "dialog");
  await expect(dialog).toHaveAttribute("aria-modal", "true");
});

test("clicking the AssetModal backdrop closes the modal", async ({
  authenticatedPage: page,
}) => {
  await page.goto("/net-worth");
  await page.waitForURL(/\/net-worth/, { timeout: 15_000 });

  // Open the modal
  await page.locator('[data-testid="add-asset-btn"]').click();
  const dialog = page.locator('[data-testid="asset-modal-backdrop"]');
  await expect(dialog).toBeVisible({ timeout: 5_000 });

  // Click the backdrop at a position outside the panel (top-left corner of the overlay)
  await dialog.click({ position: { x: 10, y: 10 } });

  // Modal should be gone
  await expect(dialog).not.toBeVisible({ timeout: 5_000 });
});
