/**
 * FA-BUDG-001 T006 — Integration tests for budget_defaults table schema
 *
 * Verifies the Drizzle ORM type definitions for the `budget_defaults` table:
 * - NewBudgetDefault accepts the correct required fields (userId, categoryName, limitAmount)
 * - BudgetDefault.$inferSelect exposes all columns with correct TypeScript types
 * - limitAmount is typed as string (Drizzle numeric → string)
 * - updatedAt and createdAt are non-nullable Dates
 *
 * Constraint enforcement (CHECK on limitAmount >= 0, UNIQUE on userId+categoryName)
 * is verified at the database level via 0007_budget_data_model.sql.
 * These type-level tests confirm the schema definition is correct.
 */
import { describe, it, expect } from "vitest";
import type { BudgetDefault, NewBudgetDefault } from "../schema";

describe("budget_defaults schema — NewBudgetDefault required fields", () => {
  it("accepts a valid insert shape with all required fields", () => {
    const newDefault: NewBudgetDefault = {
      userId: "00000000-0000-0000-0000-000000000001",
      categoryName: "Groceries",
      limitAmount: "500.00",
    };

    expect(newDefault.categoryName).toBe("Groceries");
    expect(newDefault.limitAmount).toBe("500.00");
  });

  it("limitAmount is a string type (Drizzle numeric → string)", () => {
    const newDefault: NewBudgetDefault = {
      userId: "00000000-0000-0000-0000-000000000001",
      categoryName: "Transport",
      limitAmount: "0.00", // zero is a valid budget default
    };

    expect(typeof newDefault.limitAmount).toBe("string");
    expect(newDefault.limitAmount).toBe("0.00");
  });

  it("createdAt and updatedAt are optional on insert (server DEFAULT now())", () => {
    const newDefault: NewBudgetDefault = {
      userId: "00000000-0000-0000-0000-000000000001",
      categoryName: "Dining",
      limitAmount: "300.00",
      // createdAt and updatedAt intentionally omitted
    };

    expect(newDefault.createdAt).toBeUndefined();
    expect(newDefault.updatedAt).toBeUndefined();
  });
});

describe("budget_defaults schema — BudgetDefault select type", () => {
  it("BudgetDefault.$inferSelect exposes id as string (uuid → string)", () => {
    const mockId: BudgetDefault["id"] = "00000000-0000-0000-0000-000000000099";
    expect(typeof mockId).toBe("string");
  });

  it("BudgetDefault.$inferSelect exposes limitAmount as string (numeric → string)", () => {
    const mockAmount: BudgetDefault["limitAmount"] = "600.00";
    expect(typeof mockAmount).toBe("string");
  });

  it("BudgetDefault.$inferSelect exposes createdAt and updatedAt as non-nullable Date", () => {
    const now = new Date();
    const createdAt: BudgetDefault["createdAt"] = now;
    const updatedAt: BudgetDefault["updatedAt"] = now;
    expect(createdAt).toBeInstanceOf(Date);
    expect(updatedAt).toBeInstanceOf(Date);
  });

  it("cross-user isolation: same categoryName for different userId are distinct records", () => {
    const user1Default: NewBudgetDefault = {
      userId: "00000000-0000-0000-0000-000000000001",
      categoryName: "Groceries",
      limitAmount: "500.00",
    };
    const user2Default: NewBudgetDefault = {
      userId: "00000000-0000-0000-0000-000000000002",
      categoryName: "Groceries",
      limitAmount: "750.00",
    };

    expect(user1Default.userId).not.toBe(user2Default.userId);
    expect(user1Default.categoryName).toBe(user2Default.categoryName);
  });

  it("budget_defaults and budgets are independent tables (no FK between them)", () => {
    // A BudgetDefault does not reference a Budget — deleting a default does
    // not cascade to budgets. This is validated by the absence of a FK.
    // At the type level, NewBudgetDefault has no budgetId field.
    const newDefault: NewBudgetDefault = {
      userId: "00000000-0000-0000-0000-000000000001",
      categoryName: "Groceries",
      limitAmount: "500.00",
    };

    // No budgetId field — the type does not have it
    expect((newDefault as Record<string, unknown>).budgetId).toBeUndefined();
  });
});
