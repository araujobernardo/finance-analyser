import { test, expect, uploadFixtures } from "./fixtures";

test("sidebar has All Accounts row and no dashboard filter pills", async ({
  authenticatedPage: page,
}) => {
  await uploadFixtures(page);

  // The "All Accounts" clickable section header must exist
  await expect(
    page.locator('[data-testid="account-all-accounts"]'),
  ).toBeVisible();

  // Dashboard must NOT have the old account filter pills (removed in #755)
  await expect(page.locator(".dash-acct-pills")).not.toBeVisible();
});

test("clicking All Accounts row shows upload-to fallback label", async ({
  authenticatedPage: page,
}) => {
  await uploadFixtures(page);

  // Click the All Accounts row to ensure it is selected
  await page.locator('[data-testid="account-all-accounts"]').click();

  // Upload-to label should show the fallback when "all" is active
  const label = page.locator('[data-testid="upload-to-label"]');
  await expect(label).toContainText("select an account");
});

test("clicking an individual account row updates the upload-to label", async ({
  authenticatedPage: page,
}) => {
  await uploadFixtures(page);

  // First click All Accounts to start from a known state
  await page.locator('[data-testid="account-all-accounts"]').click();

  // Then click the first individual account row
  const firstAccountRow = page.locator('[data-testid="account-item"]').first();
  await expect(firstAccountRow).toBeVisible({ timeout: 10_000 });
  const accountName = await firstAccountRow.textContent();
  await firstAccountRow.click();

  // Upload-to label should now show the selected account name
  const label = page.locator('[data-testid="upload-to-label"]');
  if (accountName) {
    const cleanName = accountName.replace(/[✎]/g, "").trim();
    await expect(label).toContainText(cleanName.slice(0, 5)); // partial match for robustness
  }
});

test("individual account rows are indented under All Accounts", async ({
  authenticatedPage: page,
}) => {
  await uploadFixtures(page);

  // Each account row should have the indented class
  const rows = page.locator('[data-testid="account-item"]');
  const count = await rows.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    await expect(rows.nth(i)).toHaveClass(/sidebar-account-row--indented/);
  }
});
