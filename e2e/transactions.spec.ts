import { test, expect, uploadFixtures } from "./fixtures";

test("transactions page shows empty table by default (transfers hidden)", async ({
  authenticatedPage: page,
}) => {
  await uploadFixtures(page);
  await page.getByRole("link", { name: /transactions/i }).click();
  await page.waitForURL(/\/transactions/);

  await expect(page.locator('[data-testid="txn-row-count"]')).toContainText(
    "0 rows",
  );
  await expect(page.locator(".txn-empty")).toBeVisible();
});

test("enabling Show transfers reveals the fixture transactions", async ({
  authenticatedPage: page,
}) => {
  await uploadFixtures(page);
  await page.getByRole("link", { name: /transactions/i }).click();
  await page.waitForURL(/\/transactions/);

  await page.locator('[data-testid="show-transfers"]').check();

  await expect(page.locator('[data-testid="txn-row-count"]')).toContainText(
    "2 rows",
  );
  await expect(page.locator('[data-testid="txn-table"] tbody tr')).toHaveCount(
    2,
  );
});

test("month filter contains the imported month", async ({
  authenticatedPage: page,
}) => {
  await uploadFixtures(page);
  await page.getByRole("link", { name: /transactions/i }).click();
  await page.waitForURL(/\/transactions/);

  const monthSelect = page.locator("select.txn-select").first();
  await expect(monthSelect.locator("option")).toContainText("January 2000");
});

test("account filter lists both fixture accounts", async ({
  authenticatedPage: page,
}) => {
  await uploadFixtures(page);
  await page.getByRole("link", { name: /transactions/i }).click();
  await page.waitForURL(/\/transactions/);

  // Two accounts imported — account filter select should be visible
  const accountSelect = page.locator("select.txn-select").nth(1);
  await expect(accountSelect).toBeVisible();
  await expect(accountSelect.locator("option")).toContainText([
    "0000000-01",
    "2222222-02",
  ]);
});
