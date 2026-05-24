import { test, expect } from "./fixtures";

// ── #769: Settings — category management and danger zone ──────────────────────

test("Settings page does not show the top info card", async ({
  authenticatedPage: page,
}) => {
  await page.getByRole("link", { name: /settings/i }).click();
  await page.waitForURL(/\/settings/);

  // The top info card with ◎ Finance Analyser was removed per UX brief
  await expect(page.getByText(/◎ Finance Analyser/i)).not.toBeVisible();
});

test("Settings page shows Alert Preferences, Categories, and Danger Zone sections", async ({
  authenticatedPage: page,
}) => {
  await page.getByRole("link", { name: /settings/i }).click();
  await page.waitForURL(/\/settings/);

  await expect(page.getByTestId("alert-preferences-section")).toBeVisible();
  await expect(page.getByTestId("categories-section")).toBeVisible();
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
