import { test, expect } from "./fixtures";

// ── #879: Bank Connection section embedded in Settings ────────────────────────

test("#879: Settings page shows Bank Connection section between Categories and Danger Zone", async ({
  authenticatedPage: page,
}) => {
  await page.getByRole("link", { name: /settings/i }).click();
  await page.waitForURL(/\/settings/);

  await expect(page.getByTestId("bank-connection-section")).toBeVisible();

  // Verify ordering: categories before bank-connection before danger-zone
  const sections = page.locator(
    '[data-testid="categories-section"], [data-testid="bank-connection-section"], [data-testid="danger-zone-section"]',
  );
  await expect(sections.nth(0)).toHaveAttribute(
    "data-testid",
    "categories-section",
  );
  await expect(sections.nth(1)).toHaveAttribute(
    "data-testid",
    "bank-connection-section",
  );
  await expect(sections.nth(2)).toHaveAttribute(
    "data-testid",
    "danger-zone-section",
  );
});

test("#879: Sidebar does not show a Bank Connection nav item", async ({
  authenticatedPage: page,
}) => {
  await page.goto("/dashboard");
  await page.waitForURL(/\/dashboard/);

  // The sidebar should not contain any link to /settings/bank
  await expect(page.locator('a[href*="/settings/bank"]')).not.toBeAttached();
  // And no visible text "Bank Connection" in the sidebar nav
  const sidebar = page.locator(".sidebar");
  await expect(
    sidebar.getByRole("link", { name: /bank connection/i }),
  ).not.toBeAttached();
});

test("#879: /settings/bank route is no longer accessible (no BankConnectionPage)", async ({
  authenticatedPage: page,
}) => {
  await page.goto("/settings/bank");
  // Route is removed — should redirect to 404 or the root dashboard
  // Assert the old BankConnectionPage headline is NOT rendered
  await expect(
    page.getByRole("heading", { name: /bank connection/i }),
  ).not.toBeVisible({ timeout: 5_000 });
});

test("#879: Bank Connection section uses .card.settings-section style", async ({
  authenticatedPage: page,
}) => {
  await page.getByRole("link", { name: /settings/i }).click();
  await page.waitForURL(/\/settings/);

  const section = page.getByTestId("bank-connection-section");
  await expect(section).toBeVisible();
  await expect(section).toHaveClass(/card/);
  await expect(section).toHaveClass(/settings-section/);
});

test("#879: Bank Connection disconnected state shows Connect button with no text inputs", async ({
  authenticatedPage: page,
}) => {
  await page.getByRole("link", { name: /settings/i }).click();
  await page.waitForURL(/\/settings/);

  const section = page.getByTestId("bank-connection-section");
  await expect(section).toBeVisible();

  // When disconnected: connect button present, no text/password inputs for credentials
  const isConnected = await page
    .getByTestId("connection-status-card")
    .isVisible();
  if (!isConnected) {
    await expect(page.getByTestId("connect-submit-btn")).toBeVisible();
    // No credential text inputs (akahuUserId / userToken fields should not exist)
    await expect(
      section.locator('input[type="text"], input[type="password"]'),
    ).toHaveCount(0);
  }
});

// ── #769: Settings — category management and danger zone ──────────────────────

test("Settings page does not show the top info card", async ({
  authenticatedPage: page,
}) => {
  await page.getByRole("link", { name: /settings/i }).click();
  await page.waitForURL(/\/settings/);

  // The top info card with ◎ Finance Analyser was removed per UX brief
  await expect(page.getByText(/◎ Finance Analyser/i)).not.toBeVisible();
});

test("Settings page shows Alert Preferences, Categories, Bank Connection, and Danger Zone sections", async ({
  authenticatedPage: page,
}) => {
  await page.getByRole("link", { name: /settings/i }).click();
  await page.waitForURL(/\/settings/);

  await expect(page.getByTestId("alert-preferences-section")).toBeVisible();
  await expect(page.getByTestId("categories-section")).toBeVisible();
  await expect(page.getByTestId("bank-connection-section")).toBeVisible();
  await expect(page.getByTestId("danger-zone-section")).toBeVisible();
});

test("user can add a category and see it in the list", async ({
  authenticatedPage: page,
}) => {
  await page.getByRole("link", { name: /settings/i }).click();
  await page.waitForURL(/\/settings/);

  const uniqueName = `E2E-Cat-${Date.now()}`;

  await page.getByTestId("category-new-name").fill(uniqueName);
  await page.getByTestId("category-add-btn").click();

  // The new category should appear in the list
  await expect(page.getByDisplayValue(uniqueName)).toBeVisible();
});

test("user can delete a category", async ({ authenticatedPage: page }) => {
  await page.getByRole("link", { name: /settings/i }).click();
  await page.waitForURL(/\/settings/);

  const uniqueName = `E2E-Del-${Date.now()}`;

  // Add a category first
  await page.getByTestId("category-new-name").fill(uniqueName);
  await page.getByTestId("category-add-btn").click();
  const nameInput = page.getByDisplayValue(uniqueName);
  await expect(nameInput).toBeVisible();

  // Find the delete button for the newly created category via the closest list item
  const listItem = nameInput.locator(".."); // parent li
  const deleteBtn = listItem.getByRole("button", { name: /delete category/i });
  await deleteBtn.click();

  await expect(page.getByDisplayValue(uniqueName)).not.toBeVisible();
});

test("danger zone confirm button is disabled until DELETE is typed", async ({
  authenticatedPage: page,
}) => {
  await page.getByRole("link", { name: /settings/i }).click();
  await page.waitForURL(/\/settings/);

  await page.getByTestId("danger-zone-open-btn").click();
  await expect(page.getByTestId("danger-zone-dialog")).toBeVisible();

  // Confirm button is disabled initially
  await expect(page.getByTestId("danger-zone-confirm-btn")).toBeDisabled();

  // Type wrong text — still disabled
  await page.getByTestId("danger-zone-confirm-input").fill("delete");
  await expect(page.getByTestId("danger-zone-confirm-btn")).toBeDisabled();

  // Type exact DELETE — enabled
  await page.getByTestId("danger-zone-confirm-input").fill("DELETE");
  await expect(page.getByTestId("danger-zone-confirm-btn")).toBeEnabled();
});

test("danger zone dialog is dismissed when Cancel is clicked", async ({
  authenticatedPage: page,
}) => {
  await page.getByRole("link", { name: /settings/i }).click();
  await page.waitForURL(/\/settings/);

  await page.getByTestId("danger-zone-open-btn").click();
  await expect(page.getByTestId("danger-zone-dialog")).toBeVisible();

  await page.getByTestId("danger-zone-cancel-btn").click();
  await expect(page.getByTestId("danger-zone-dialog")).not.toBeVisible();
});

// ── #770: Per-account transaction deletion ────────────────────────────────────

test("per-account account selector dropdown is visible in Danger Zone", async ({
  authenticatedPage: page,
}) => {
  await page.getByRole("link", { name: /settings/i }).click();
  await page.waitForURL(/\/settings/);

  await expect(page.getByTestId("account-select-dropdown")).toBeVisible();
});

test("per-account Clear account data button is disabled until account is selected", async ({
  authenticatedPage: page,
}) => {
  await page.getByRole("link", { name: /settings/i }).click();
  await page.waitForURL(/\/settings/);

  // Button is disabled with no account selected
  await expect(page.getByTestId("account-clear-btn")).toBeDisabled();

  // Select the first account option (not the placeholder)
  const dropdown = page.getByTestId("account-select-dropdown");
  const firstOption = dropdown.locator("option").nth(1);
  const firstValue = await firstOption.getAttribute("value");
  if (firstValue) {
    await dropdown.selectOption(firstValue);
    await expect(page.getByTestId("account-clear-btn")).toBeEnabled();
  }
});

test("per-account confirmation dialog names the selected account", async ({
  authenticatedPage: page,
}) => {
  await page.getByRole("link", { name: /settings/i }).click();
  await page.waitForURL(/\/settings/);

  const dropdown = page.getByTestId("account-select-dropdown");
  const firstOption = dropdown.locator("option").nth(1);
  const firstValue = await firstOption.getAttribute("value");
  const firstName = await firstOption.textContent();

  if (firstValue && firstName) {
    await dropdown.selectOption(firstValue);
    await page.getByTestId("account-clear-btn").click();

    // Dialog should be visible and contain the account name
    await expect(page.getByTestId("account-clear-dialog")).toBeVisible();
    await expect(
      page.getByTestId("account-clear-dialog").getByText(firstName.trim()),
    ).toBeVisible();
  }
});

test("per-account confirm button is disabled until DELETE is typed", async ({
  authenticatedPage: page,
}) => {
  await page.getByRole("link", { name: /settings/i }).click();
  await page.waitForURL(/\/settings/);

  const dropdown = page.getByTestId("account-select-dropdown");
  const firstOption = dropdown.locator("option").nth(1);
  const firstValue = await firstOption.getAttribute("value");

  if (firstValue) {
    await dropdown.selectOption(firstValue);
    await page.getByTestId("account-clear-btn").click();

    await expect(page.getByTestId("account-clear-confirm-btn")).toBeDisabled();

    await page.getByTestId("account-clear-confirm-input").fill("delete");
    await expect(page.getByTestId("account-clear-confirm-btn")).toBeDisabled();

    await page.getByTestId("account-clear-confirm-input").fill("DELETE");
    await expect(page.getByTestId("account-clear-confirm-btn")).toBeEnabled();
  }
});

test("per-account confirmation dialog is dismissed when Cancel is clicked", async ({
  authenticatedPage: page,
}) => {
  await page.getByRole("link", { name: /settings/i }).click();
  await page.waitForURL(/\/settings/);

  const dropdown = page.getByTestId("account-select-dropdown");
  const firstOption = dropdown.locator("option").nth(1);
  const firstValue = await firstOption.getAttribute("value");

  if (firstValue) {
    await dropdown.selectOption(firstValue);
    await page.getByTestId("account-clear-btn").click();
    await expect(page.getByTestId("account-clear-dialog")).toBeVisible();

    await page.getByTestId("account-clear-cancel-btn").click();
    await expect(page.getByTestId("account-clear-dialog")).not.toBeVisible();
  }
});

// ── #774: Categories as single source of truth ────────────────────────────────

test("#774: renaming a category in Settings updates the name in the category list", async ({
  authenticatedPage: page,
}) => {
  await page.getByRole("link", { name: /settings/i }).click();
  await page.waitForURL(/\/settings/);

  // Create a category to rename
  const originalName = `E2E-Rename-${Date.now()}`;
  const renamedName = `${originalName}-RENAMED`;

  await page.getByTestId("category-new-name").fill(originalName);
  await page.getByTestId("category-add-btn").click();

  // Wait for the category to appear, then rename it
  const nameInput = page.getByDisplayValue(originalName);
  await expect(nameInput).toBeVisible();
  await nameInput.fill(renamedName);
  await nameInput.press("Enter");

  // The renamed value should now appear in the category list
  await expect(page.getByDisplayValue(renamedName)).toBeVisible();
  await expect(page.getByDisplayValue(originalName)).not.toBeVisible();
});

test("#774: adding a category in Settings makes it appear in Transactions page filter dropdown", async ({
  authenticatedPage: page,
}) => {
  // Add a new category in Settings
  await page.getByRole("link", { name: /settings/i }).click();
  await page.waitForURL(/\/settings/);

  const uniqueName = `E2E-TxnFilter-${Date.now()}`;
  await page.getByTestId("category-new-name").fill(uniqueName);
  await page.getByTestId("category-add-btn").click();
  await expect(page.getByDisplayValue(uniqueName)).toBeVisible();

  // Navigate to Transactions page and check the category filter includes the new category
  await page.getByRole("link", { name: /transactions/i }).click();
  await page.waitForURL(/\/transactions/);

  // The category select filter should include the newly added category as an option
  const catFilter = page.locator("select.txn-select").filter({
    has: page.locator("option[value='all']"),
  });
  await expect(
    catFilter.locator(`option[value="${uniqueName}"]`),
  ).toBeAttached();
});

// ── #781: "Transfer" must never appear as a category ─────────────────────────

test("#781: Settings categories list does not include Transfer", async ({
  authenticatedPage: page,
}) => {
  await page.getByRole("link", { name: /settings/i }).click();
  await page.waitForURL(/\/settings/);

  const categoriesSection = page.getByTestId("categories-section");
  await expect(categoriesSection).toBeVisible();

  // "Transfer" should not appear as a category name anywhere in the section
  await expect(
    categoriesSection.getByDisplayValue("Transfer"),
  ).not.toBeAttached();
});

test("#781: Transactions page category filter does not include Transfer option", async ({
  authenticatedPage: page,
}) => {
  await page.getByRole("link", { name: /transactions/i }).click();
  await page.waitForURL(/\/transactions/);

  // The category filter select should not have a "Transfer" option
  const catFilter = page.locator("select.txn-select").filter({
    has: page.locator("option[value='all']"),
  });

  await expect(
    catFilter.locator("option[value='Transfer'], option:text-is('Transfer')"),
  ).not.toBeAttached();
});

test("#774: deleting a category in Settings removes it from Transactions page filter dropdown", async ({
  authenticatedPage: page,
}) => {
  // Add a category, verify it shows up in Transactions, then delete it
  await page.getByRole("link", { name: /settings/i }).click();
  await page.waitForURL(/\/settings/);

  const uniqueName = `E2E-DelFilter-${Date.now()}`;
  await page.getByTestId("category-new-name").fill(uniqueName);
  await page.getByTestId("category-add-btn").click();

  const nameInput = page.getByDisplayValue(uniqueName);
  await expect(nameInput).toBeVisible();

  // Delete the newly created category
  const listItem = nameInput.locator("..");
  const deleteBtn = listItem.getByRole("button", { name: /delete category/i });
  await deleteBtn.click();
  await expect(page.getByDisplayValue(uniqueName)).not.toBeVisible();

  // Navigate to Transactions page — the deleted category should not appear in the filter
  await page.getByRole("link", { name: /transactions/i }).click();
  await page.waitForURL(/\/transactions/);

  const catFilter = page.locator("select.txn-select").filter({
    has: page.locator("option[value='all']"),
  });
  await expect(
    catFilter.locator(`option[value="${uniqueName}"]`),
  ).not.toBeAttached();
});
