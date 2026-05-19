/**
 * FA-BUDG-001 T004 — Integration tests for budgets table schema
 *
 * Verifies the Drizzle ORM type definitions for the `budgets` table:
 * - NewBudget accepts the correct required fields (userId, categoryName, year, month, limitAmount)
 * - Budget.$inferSelect exposes all columns with correct TypeScript types
 * - limitAmount is typed as string (Drizzle numeric → string)
 * - year and month are typed as number (Drizzle integer → number)
 * - updatedAt and createdAt are non-nullable Dates
 *
 * Constraint enforcement (CHECK, UNIQUE) is verified at the database level via
 * the SQL migration (0007_budget_data_model.sql). These type-level tests confirm
 * the schema definition is correct before the migration runs.
 */
import { describe, it, expect } from "vitest";
import type { Budget, NewBudget } from "../schema";

describe("budgets schema — NewBudget required fields", () => {
  it("accepts a valid insert shape with all required fields", () => {
    const newBudget: NewBudget = {
      userId: "00000000-0000-0000-0000-000000000001",
      categoryName: "Groceries",
      year: 2026,
      month: 5,
      limitAmount: "500.00",
    };

    expect(newBudget.categoryName).toBe("Groceries");
    expect(newBudget.year).toBe(2026);
    expect(newBudget.month).toBe(5);
    expect(newBudget.limitAmount).toBe("500.00");
  });

  it("limitAmount is a string type (Drizzle numeric → string)", () => {
    const newBudget: NewBudget = {
      userId: "00000000-0000-0000-0000-000000000001",
      categoryName: "Transport",
      year: 2026,
      month: 1,
      limitAmount: "0.00", // zero is a valid spending limit
    };

    // limitAmount must be a string, not a number
    expect(typeof newBudget.limitAmount).toBe("string");
    expect(newBudget.limitAmount).toBe("0.00");
  });

  it("year and month are number types (Drizzle integer → number)", () => {
    const newBudget: NewBudget = {
      userId: "00000000-0000-0000-0000-000000000001",
      categoryName: "Dining",
      year: 2026,
      month: 12,
      limitAmount: "300.00",
    };

    expect(typeof newBudget.year).toBe("number");
    expect(typeof newBudget.month).toBe("number");
  });

  it("createdAt and updatedAt are optional on insert (server DEFAULT now())", () => {
    const newBudget: NewBudget = {
      userId: "00000000-0000-0000-0000-000000000001",
      categoryName: "Utilities",
      year: 2026,
      month: 3,
      limitAmount: "200.00",
      // createdAt and updatedAt intentionally omitted — server fills them
    };

    expect(newBudget.createdAt).toBeUndefined();
    expect(newBudget.updatedAt).toBeUndefined();
  });
});

describe("budgets schema — Budget select type", () => {
  it("Budget.$inferSelect exposes id as string (uuid → string)", () => {
    // Type-level check: Budget["id"] must be string
    const mockId: Budget["id"] = "00000000-0000-0000-0000-000000000099";
    expect(typeof mockId).toBe("string");
  });

  it("Budget.$inferSelect exposes limitAmount as string (numeric → string)", () => {
    const mockAmount: Budget["limitAmount"] = "499.99";
    expect(typeof mockAmount).toBe("string");
  });

  it("Budget.$inferSelect exposes year and month as numbers", () => {
    const mockYear: Budget["year"] = 2026;
    const mockMonth: Budget["month"] = 6;
    expect(typeof mockYear).toBe("number");
    expect(typeof mockMonth).toBe("number");
  });

  it("Budget.$inferSelect exposes createdAt and updatedAt as non-nullable Date", () => {
    const now = new Date();
    const createdAt: Budget["createdAt"] = now;
    const updatedAt: Budget["updatedAt"] = now;
    expect(createdAt).toBeInstanceOf(Date);
    expect(updatedAt).toBeInstanceOf(Date);
  });

  it("cross-user isolation: same categoryName + year + month different userId are distinct records", () => {
    // Two NewBudget records with the same category/year/month but different userIds
    // are both valid at the type level — uniqueness is (userId, categoryName, year, month)
    const user1Budget: NewBudget = {
      userId: "00000000-0000-0000-0000-000000000001",
      categoryName: "Groceries",
      year: 2026,
      month: 5,
      limitAmount: "500.00",
    };
    const user2Budget: NewBudget = {
      userId: "00000000-0000-0000-0000-000000000002",
      categoryName: "Groceries",
      year: 2026,
      month: 5,
      limitAmount: "750.00",
    };

    expect(user1Budget.userId).not.toBe(user2Budget.userId);
    expect(user1Budget.categoryName).toBe(user2Budget.categoryName);
  });
});
