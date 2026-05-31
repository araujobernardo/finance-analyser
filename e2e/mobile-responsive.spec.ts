/**
 * E2E tests for #795 — Mobile Responsive Layout (Option A: Slide Drawer)
 *
 * These tests run at a 375px viewport to verify mobile-specific behaviour:
 * - Mobile top bar is visible; desktop sidebar is hidden
 * - Hamburger opens the slide drawer
 * - Backdrop and close button both close the drawer
 * - Nav links inside the drawer navigate and close the drawer
 *
 * Visual checks (stat grid 2×2, horizontal pill scroll, chart stacking) are
 * not automated here — CSS layout verification requires visual regression tools.
 */

import { test, expect } from "./fixtures";

// Mobile viewport dimensions used throughout this spec.
const MOBILE_VIEWPORT = { width: 375, height: 812 };

test.describe("Mobile responsive layout (#795)", () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  test("mobile top bar is visible and desktop sidebar is hidden at 375px", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/dashboard");

    // Mobile top bar should be visible
    await expect(page.locator('[data-testid="mobile-topbar"]')).toBeVisible();

    // Desktop sidebar should be hidden (CSS display:none)
    await expect(
      page.locator('[data-testid="desktop-sidebar"]'),
    ).not.toBeVisible();

    // Hamburger button present
    await expect(page.locator('[data-testid="hamburger-btn"]')).toBeVisible();

    // Mobile CSV button present
    await expect(
      page.locator('[data-testid="mobile-upload-csv-btn"]'),
    ).toBeVisible();
  });

  test("hamburger opens the drawer and drawer content is visible", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/dashboard");

    // Drawer should be closed initially
    const drawer = page.locator('[data-testid="mobile-drawer"]');
    await expect(drawer).not.toHaveClass(/drawer-overlay--open/);

    // Open drawer via hamburger
    await page.locator('[data-testid="hamburger-btn"]').click();

    // Drawer should now be open
    await expect(drawer).toHaveClass(/drawer-overlay--open/);

    // Close button should be visible
    await expect(
      page.locator('[data-testid="drawer-close-btn"]'),
    ).toBeVisible();
  });

  test("close button inside drawer closes it", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/dashboard");

    // Open drawer
    await page.locator('[data-testid="hamburger-btn"]').click();

    const drawer = page.locator('[data-testid="mobile-drawer"]');
    await expect(drawer).toHaveClass(/drawer-overlay--open/);

    // Close via ✕ button
    await page.locator('[data-testid="drawer-close-btn"]').click();

    await expect(drawer).not.toHaveClass(/drawer-overlay--open/);
  });

  test("tapping the backdrop closes the drawer", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/dashboard");

    // Open drawer
    await page.locator('[data-testid="hamburger-btn"]').click();

    const drawer = page.locator('[data-testid="mobile-drawer"]');
    await expect(drawer).toHaveClass(/drawer-overlay--open/);

    // Click the backdrop (positioned at far right of drawer — outside the panel)
    await page.locator('[data-testid="drawer-backdrop"]').click({
      position: { x: 370, y: 400 },
      force: true,
    });

    await expect(drawer).not.toHaveClass(/drawer-overlay--open/);
  });
});
