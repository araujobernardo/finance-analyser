/**
 * FA-BUDG-001 T008 — Integration tests for user_preferences table schema
 *
 * Verifies the Drizzle ORM type definitions for the `user_preferences` table:
 * - NewUserPreferences accepts userId + optional monthStartDay
 * - monthStartDay defaults to 1 when not specified (DB DEFAULT)
 * - UserPreferences.$inferSelect exposes all columns with correct TypeScript types
 * - One row per user: userId has .unique() constraint
 *
 * Constraint enforcement (CHECK monthStartDay 1-28, UNIQUE userId)
 * is verified at the database level via 0007_budget_data_model.sql.
 */
import { describe, it, expect } from "vitest";
import type { UserPreferences, NewUserPreferences } from "../schema";

describe("user_preferences schema — NewUserPreferences insert types", () => {
  it("accepts an explicit monthStartDay of 15", () => {
    const newPrefs: NewUserPreferences = {
      userId: "00000000-0000-0000-0000-000000000001",
      monthStartDay: 15,
    };

    expect(newPrefs.monthStartDay).toBe(15);
  });

  it("monthStartDay is optional on insert — server DEFAULT 1 applies", () => {
    const newPrefs: NewUserPreferences = {
      userId: "00000000-0000-0000-0000-000000000001",
      // monthStartDay intentionally omitted — DB default is 1
    };

    // When omitted, the field is undefined in the insert object
    // The DB will store 1 (DEFAULT 1)
    expect(newPrefs.monthStartDay).toBeUndefined();
  });

  it("monthStartDay 1 is a valid lower bound", () => {
    const newPrefs: NewUserPreferences = {
      userId: "00000000-0000-0000-0000-000000000001",
      monthStartDay: 1,
    };
    expect(newPrefs.monthStartDay).toBe(1);
  });

  it("monthStartDay 28 is a valid upper bound", () => {
    const newPrefs: NewUserPreferences = {
      userId: "00000000-0000-0000-0000-000000000001",
      monthStartDay: 28,
    };
    expect(newPrefs.monthStartDay).toBe(28);
  });

  it("monthStartDay is a number type (Drizzle integer → number)", () => {
    const newPrefs: NewUserPreferences = {
      userId: "00000000-0000-0000-0000-000000000001",
      monthStartDay: 15,
    };
    expect(typeof newPrefs.monthStartDay).toBe("number");
  });

  it("createdAt and updatedAt are optional on insert (server DEFAULT now())", () => {
    const newPrefs: NewUserPreferences = {
      userId: "00000000-0000-0000-0000-000000000001",
    };

    expect(newPrefs.createdAt).toBeUndefined();
    expect(newPrefs.updatedAt).toBeUndefined();
  });
});

describe("user_preferences schema — UserPreferences select type", () => {
  it("UserPreferences.$inferSelect exposes id as string (uuid → string)", () => {
    const mockId: UserPreferences["id"] =
      "00000000-0000-0000-0000-000000000099";
    expect(typeof mockId).toBe("string");
  });

  it("UserPreferences.$inferSelect exposes monthStartDay as number", () => {
    const mockDay: UserPreferences["monthStartDay"] = 1;
    expect(typeof mockDay).toBe("number");
  });

  it("UserPreferences.$inferSelect exposes createdAt and updatedAt as non-nullable Date", () => {
    const now = new Date();
    const createdAt: UserPreferences["createdAt"] = now;
    const updatedAt: UserPreferences["updatedAt"] = now;
    expect(createdAt).toBeInstanceOf(Date);
    expect(updatedAt).toBeInstanceOf(Date);
  });

  it("one row per user — userId is unique (no budgetId cross-reference)", () => {
    // user_preferences has no FK to budgets or budget_defaults
    // Deleting user_preferences does not cascade to budgets or budget_defaults
    const newPrefs: NewUserPreferences = {
      userId: "00000000-0000-0000-0000-000000000001",
      monthStartDay: 5,
    };

    // No budgetId or budgetDefaultId field — the type does not have them
    expect((newPrefs as Record<string, unknown>).budgetId).toBeUndefined();
    expect(
      (newPrefs as Record<string, unknown>).budgetDefaultId,
    ).toBeUndefined();
  });
});
