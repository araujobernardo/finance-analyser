/**
 * FA-GOAL-001 T005 — Verify net worth milestone goal: optional fields are nullable
 *
 * Confirms that NewGoal accepts null / undefined for linkedAccountId and categoryName,
 * meaning a net worth milestone goal can be stored with only the required fields.
 *
 * The TypeScript compiler accepting these object shapes is the acceptance signal.
 */
import { describe, it, expect } from "vitest";
import type { NewGoal } from "./schema";

describe("goals schema — optional fields nullable", () => {
  it("NewGoal accepts null for linkedAccountId (net worth milestone goal)", () => {
    const goal: NewGoal = {
      userId: "00000000-0000-0000-0000-000000000001",
      name: "Reach $100k net worth",
      type: "net_worth_milestone",
      targetAmount: "100000.00",
      targetDate: null,
      linkedAccountId: null, // nullable — no .notNull() in schema
      status: "active",
      categoryName: null, // nullable — no .notNull() in schema
      currentAmount: null, // nullable — no .notNull() in schema
    };

    // If this compiles without error, the type constraint is correct
    expect(goal.linkedAccountId).toBeNull();
    expect(goal.categoryName).toBeNull();
  });

  it("NewGoal accepts undefined for optional fields (omitted entirely)", () => {
    const goal: NewGoal = {
      userId: "00000000-0000-0000-0000-000000000001",
      name: "Reach $100k net worth",
      type: "net_worth_milestone",
      targetAmount: "100000.00",
    };

    // Only required fields — optional fields can be entirely omitted
    expect(goal.name).toBe("Reach $100k net worth");
    expect(goal.linkedAccountId).toBeUndefined();
    expect(goal.categoryName).toBeUndefined();
  });
});
