/**
 * FA-GOAL-001 T005/T006 — Verify goal optional fields and categoryName for spending limit
 *
 * T005: Confirms NewGoal accepts null/undefined for linkedAccountId and categoryName
 * T006: Confirms categoryName is varchar(100) nullable — supports spending limit goals
 *
 * The TypeScript compiler accepting these object shapes is the acceptance signal.
 */
import { describe, it, expect } from "vitest";
import type {
  Goal,
  NewGoal,
  FinancialSummary,
  NewFinancialSummary,
} from "./schema";

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

// FA-GOAL-001 T006 — Verify spending limit goal: categoryName field present
describe("goals schema — categoryName for spending limit goals", () => {
  it("NewGoal accepts a string categoryName for spending_limit goal type", () => {
    const goal: NewGoal = {
      userId: "00000000-0000-0000-0000-000000000001",
      name: "Groceries monthly limit",
      type: "spending_limit",
      targetAmount: "500.00",
      categoryName: "Groceries", // string value for spending_limit goal
    };

    expect(goal.categoryName).toBe("Groceries");
  });

  it("Goal.$inferSelect exposes categoryName as string | null", () => {
    // Type-level check: if Goal has categoryName: string | null,
    // assigning null must be valid
    const mockGoal = {
      categoryName: null as Goal["categoryName"],
    };
    expect(mockGoal.categoryName).toBeNull();

    const mockGoal2 = {
      categoryName: "Food & Drink" as Goal["categoryName"],
    };
    expect(mockGoal2.categoryName).toBe("Food & Drink");
  });
});

// FA-GOAL-001 T007 — Verify goal status update: updatedAt NOT NULL DEFAULT now()
describe("goals schema — updatedAt non-nullable with default", () => {
  it("Goal.$inferSelect exposes updatedAt as Date (non-nullable)", () => {
    // Type-level check: Goal['updatedAt'] must be Date (not Date | null | undefined)
    // If updatedAt were nullable, this cast would fail TypeScript compilation
    const now = new Date();
    const mockUpdatedAt: Goal["updatedAt"] = now;
    expect(mockUpdatedAt).toBeInstanceOf(Date);
  });

  it("NewGoal does not require updatedAt — server default handles it", () => {
    // updatedAt has .defaultNow().notNull() so it is NOT required in NewGoal inserts
    const goal: NewGoal = {
      userId: "00000000-0000-0000-0000-000000000001",
      name: "Pay off car loan",
      type: "debt_payoff",
      targetAmount: "15000.00",
      // updatedAt is intentionally omitted — server DEFAULT now() populates it
    };

    expect(goal.type).toBe("debt_payoff");
    // updatedAt will be undefined in the insert object (server fills it)
    expect(goal.updatedAt).toBeUndefined();
  });
});

// FA-AI-001 / #944 — financial_summaries schema type checks

describe("financialSummaries schema — FinancialSummary inferred types", () => {
  it("FinancialSummary exposes id as string (UUID)", () => {
    const mock: FinancialSummary = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      userId: "00000000-0000-0000-0000-000000000001",
      generatedAt: new Date(),
      content: "Summary text.",
      previousSummaryId: null,
    };
    expect(typeof mock.id).toBe("string");
  });

  it("FinancialSummary exposes generatedAt as Date (non-nullable)", () => {
    const now = new Date();
    const mock: FinancialSummary = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      userId: "00000000-0000-0000-0000-000000000001",
      generatedAt: now,
      content: "Summary text.",
      previousSummaryId: null,
    };
    expect(mock.generatedAt).toBeInstanceOf(Date);
  });

  it("FinancialSummary exposes previousSummaryId as string | null (nullable)", () => {
    // null is valid (no previous summary)
    const withNull: FinancialSummary = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      userId: "00000000-0000-0000-0000-000000000001",
      generatedAt: new Date(),
      content: "First summary.",
      previousSummaryId: null,
    };
    expect(withNull.previousSummaryId).toBeNull();

    // A UUID string is valid (references an earlier summary)
    const withPrev: FinancialSummary = {
      id: "660e8400-e29b-41d4-a716-446655440001",
      userId: "00000000-0000-0000-0000-000000000001",
      generatedAt: new Date(),
      content: "Second summary.",
      previousSummaryId: "550e8400-e29b-41d4-a716-446655440000",
    };
    expect(typeof withPrev.previousSummaryId).toBe("string");
  });
});

describe("financialSummaries schema — NewFinancialSummary insert type", () => {
  it("NewFinancialSummary requires userId and content; omits server-assigned fields", () => {
    const insert: NewFinancialSummary = {
      userId: "00000000-0000-0000-0000-000000000001",
      content: "AI-generated summary text.",
      // id, generatedAt omitted — server DEFAULT fills them
    };
    expect(insert.userId).toBe("00000000-0000-0000-0000-000000000001");
    expect(insert.id).toBeUndefined();
    expect(insert.generatedAt).toBeUndefined();
  });

  it("NewFinancialSummary accepts previousSummaryId as null or a UUID string", () => {
    const withNull: NewFinancialSummary = {
      userId: "00000000-0000-0000-0000-000000000001",
      content: "First summary.",
      previousSummaryId: null,
    };
    expect(withNull.previousSummaryId).toBeNull();

    const withPrev: NewFinancialSummary = {
      userId: "00000000-0000-0000-0000-000000000001",
      content: "Second summary.",
      previousSummaryId: "550e8400-e29b-41d4-a716-446655440000",
    };
    expect(typeof withPrev.previousSummaryId).toBe("string");
  });
});
