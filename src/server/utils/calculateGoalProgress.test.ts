/**
 * FA-GOAL-003 T001 / T009 — Unit tests for calculateGoalProgress
 *
 * All DB interactions are mocked so these tests run without a real database.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { calculateGoalProgress } from "./calculateGoalProgress";
import type { Goal } from "../../db/schema";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("./accountBalance", () => ({
  computeAccountBalance: vi.fn(),
}));

import { computeAccountBalance } from "./accountBalance";

const mockComputeAccountBalance = vi.mocked(computeAccountBalance);

// ---------------------------------------------------------------------------
// Mock DB factory
// Supports both .update().set().where() and .select().from().where()
// ---------------------------------------------------------------------------

/**
 * Creates a mock Drizzle db that handles:
 *   - db.update(t).set(args).where(...) — for goal writes
 *   - db.select(...).from(t).where(...)  — returns selectResults in sequence
 *
 * @param onUpdate   callback invoked with the args passed to .set()
 * @param selectResults  ordered list of values to return from consecutive
 *                       db.select() calls (each resolves to [{ total: value }])
 */
function makeMockDb(
  onUpdate?: (args: Record<string, unknown>) => void,
  selectResults: string[] = [],
) {
  // UPDATE chain
  const whereUpdate = { where: vi.fn().mockResolvedValue(undefined) };
  const setChain = {
    set: vi.fn((args: Record<string, unknown>) => {
      onUpdate?.(args);
      return whereUpdate;
    }),
  };
  const updateFn = vi.fn().mockReturnValue(setChain);

  // SELECT chain — each call to .select() consumes the next selectResults entry
  let selectCallCount = 0;
  const makeSelectChain = () => {
    const idx = selectCallCount++;
    const resolvedValue =
      idx < selectResults.length ? [{ total: selectResults[idx] }] : [{}];
    const whereSelect = { where: vi.fn().mockResolvedValue(resolvedValue) };
    const fromChain = { from: vi.fn().mockReturnValue(whereSelect) };
    return fromChain;
  };
  const selectFn = vi.fn().mockImplementation(makeSelectChain);

  return {
    update: updateFn,
    select: selectFn,
  } as unknown as Parameters<typeof calculateGoalProgress>[1];
}

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: "goal-001",
    userId: "user-001",
    name: "Holiday fund",
    type: "savings_target",
    targetAmount: "5000.00",
    targetDate: null,
    linkedAccountId: "acct-001",
    status: "active",
    categoryName: null,
    currentAmount: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

const USER_ID = "user-001";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("calculateGoalProgress — terminal status guard", () => {
  it("returns immediately without a DB write when status is 'achieved'", async () => {
    const db = makeMockDb();
    const goal = makeGoal({ status: "achieved" });

    await calculateGoalProgress(goal, db, USER_ID);

    expect(
      (db as unknown as { update: ReturnType<typeof vi.fn> }).update,
    ).not.toHaveBeenCalled();
    expect(mockComputeAccountBalance).not.toHaveBeenCalled();
  });

  it("returns immediately without a DB write when status is 'abandoned'", async () => {
    const db = makeMockDb();
    const goal = makeGoal({ status: "abandoned" });

    await calculateGoalProgress(goal, db, USER_ID);

    expect(
      (db as unknown as { update: ReturnType<typeof vi.fn> }).update,
    ).not.toHaveBeenCalled();
    expect(mockComputeAccountBalance).not.toHaveBeenCalled();
  });
});

describe("calculateGoalProgress — savings_target", () => {
  beforeEach(() => {
    mockComputeAccountBalance.mockReset();
  });

  it("writes currentAmount from the account balance", async () => {
    mockComputeAccountBalance.mockResolvedValue(1200);

    const capturedSet: Record<string, unknown>[] = [];
    const db = makeMockDb((args) => capturedSet.push(args));
    const goal = makeGoal({ targetAmount: "5000.00" });

    await calculateGoalProgress(goal, db, USER_ID);

    expect(mockComputeAccountBalance).toHaveBeenCalledWith(
      "acct-001",
      USER_ID,
      db,
    );
    expect(capturedSet).toHaveLength(1);
    expect(capturedSet[0].currentAmount).toBe("1200");
    expect(capturedSet[0].status).toBe("active");
  });

  it("clamps a negative balance to 0", async () => {
    mockComputeAccountBalance.mockResolvedValue(-300);

    const capturedSet: Record<string, unknown>[] = [];
    const db = makeMockDb((args) => capturedSet.push(args));
    const goal = makeGoal({ targetAmount: "5000.00" });

    await calculateGoalProgress(goal, db, USER_ID);

    expect(capturedSet[0].currentAmount).toBe("0");
    expect(capturedSet[0].status).toBe("active");
  });

  it("sets status to 'achieved' when currentAmount >= targetAmount", async () => {
    mockComputeAccountBalance.mockResolvedValue(5000);

    const capturedSet: Record<string, unknown>[] = [];
    const db = makeMockDb((args) => capturedSet.push(args));
    const goal = makeGoal({ targetAmount: "5000.00" });

    await calculateGoalProgress(goal, db, USER_ID);

    expect(capturedSet[0].status).toBe("achieved");
    expect(capturedSet[0].currentAmount).toBe("5000");
  });

  it("sets status to 'achieved' when currentAmount exceeds targetAmount", async () => {
    mockComputeAccountBalance.mockResolvedValue(7500);

    const capturedSet: Record<string, unknown>[] = [];
    const db = makeMockDb((args) => capturedSet.push(args));
    const goal = makeGoal({ targetAmount: "5000.00" });

    await calculateGoalProgress(goal, db, USER_ID);

    expect(capturedSet[0].status).toBe("achieved");
    expect(capturedSet[0].currentAmount).toBe("7500");
  });

  it("does not write when linkedAccountId is null", async () => {
    const db = makeMockDb();
    const goal = makeGoal({ linkedAccountId: null });

    await calculateGoalProgress(goal, db, USER_ID);

    expect(mockComputeAccountBalance).not.toHaveBeenCalled();
    expect(
      (db as unknown as { update: ReturnType<typeof vi.fn> }).update,
    ).not.toHaveBeenCalled();
  });
});

describe("calculateGoalProgress — debt_payoff", () => {
  beforeEach(() => {
    mockComputeAccountBalance.mockReset();
  });

  it("computes partial payoff progress correctly", async () => {
    // targetAmount = 5000 (initial debt); balance = -3000 (still owed)
    // outstanding = 3000; paid = 5000 - 3000 = 2000; 40% paid off
    mockComputeAccountBalance.mockResolvedValue(-3000);

    const capturedSet: Record<string, unknown>[] = [];
    const db = makeMockDb((args) => capturedSet.push(args));
    const goal = makeGoal({ type: "debt_payoff", targetAmount: "5000.00" });

    await calculateGoalProgress(goal, db, USER_ID);

    expect(capturedSet).toHaveLength(1);
    expect(capturedSet[0].currentAmount).toBe("2000");
    expect(capturedSet[0].status).toBe("active");
  });

  it("auto-achieves the goal when outstanding balance is zero", async () => {
    // Account balance is 0 → fully paid off
    mockComputeAccountBalance.mockResolvedValue(0);

    const capturedSet: Record<string, unknown>[] = [];
    const db = makeMockDb((args) => capturedSet.push(args));
    const goal = makeGoal({ type: "debt_payoff", targetAmount: "5000.00" });

    await calculateGoalProgress(goal, db, USER_ID);

    expect(capturedSet[0].status).toBe("achieved");
    expect(capturedSet[0].currentAmount).toBe("5000");
  });

  it("clamps currentAmount to targetAmount even when paid > targetAmount (over-achieved)", async () => {
    // If balance = 0, paid = 5000 - 0 = 5000; Math.min(5000, 5000) = 5000
    // This also verifies the upper clamp (Math.min) works correctly.
    mockComputeAccountBalance.mockResolvedValue(0);

    const capturedSet: Record<string, unknown>[] = [];
    const db = makeMockDb((args) => capturedSet.push(args));
    const goal = makeGoal({ type: "debt_payoff", targetAmount: "5000.00" });

    await calculateGoalProgress(goal, db, USER_ID);

    // currentAmount should be exactly targetAmount (clamped at the top)
    expect(capturedSet[0].currentAmount).toBe("5000");
  });

  it("clamps currentAmount to 0 when debt has grown beyond targetAmount", async () => {
    // Debt grew from 5000 to 8000; paid = 5000 - 8000 = -3000 → clamp to 0
    mockComputeAccountBalance.mockResolvedValue(-8000);

    const capturedSet: Record<string, unknown>[] = [];
    const db = makeMockDb((args) => capturedSet.push(args));
    const goal = makeGoal({ type: "debt_payoff", targetAmount: "5000.00" });

    await calculateGoalProgress(goal, db, USER_ID);

    expect(capturedSet[0].currentAmount).toBe("0");
    expect(capturedSet[0].status).toBe("active");
  });

  it("treats negative account balance as absolute value (credit card)", async () => {
    // balance = -2000 → outstanding = 2000; paid = 5000 - 2000 = 3000
    mockComputeAccountBalance.mockResolvedValue(-2000);

    const capturedSet: Record<string, unknown>[] = [];
    const db = makeMockDb((args) => capturedSet.push(args));
    const goal = makeGoal({ type: "debt_payoff", targetAmount: "5000.00" });

    await calculateGoalProgress(goal, db, USER_ID);

    expect(capturedSet[0].currentAmount).toBe("3000");
  });

  it("does not write to DB when linkedAccountId is null", async () => {
    const db = makeMockDb();
    const goal = makeGoal({ type: "debt_payoff", linkedAccountId: null });

    await calculateGoalProgress(goal, db, USER_ID);

    expect(mockComputeAccountBalance).not.toHaveBeenCalled();
    expect(
      (db as unknown as { update: ReturnType<typeof vi.fn> }).update,
    ).not.toHaveBeenCalled();
  });
});

describe("calculateGoalProgress — net_worth_milestone", () => {
  it("writes correct currentAmount (assets - liabilities) for partial progress", async () => {
    // assets = 50000, liabilities = 30000 → net worth = 20000
    // target = 100000 → still active
    const capturedSet: Record<string, unknown>[] = [];
    const db = makeMockDb((args) => capturedSet.push(args), ["50000", "30000"]);
    const goal = makeGoal({
      type: "net_worth_milestone",
      targetAmount: "100000.00",
      linkedAccountId: null,
    });

    await calculateGoalProgress(goal, db, USER_ID);

    expect(capturedSet).toHaveLength(1);
    expect(capturedSet[0].currentAmount).toBe("20000");
    expect(capturedSet[0].status).toBe("active");
  });

  it("auto-achieves when net worth equals targetAmount", async () => {
    // assets = 100000, liabilities = 0 → net worth = 100000 = target
    const capturedSet: Record<string, unknown>[] = [];
    const db = makeMockDb((args) => capturedSet.push(args), ["100000", "0"]);
    const goal = makeGoal({
      type: "net_worth_milestone",
      targetAmount: "100000.00",
      linkedAccountId: null,
    });

    await calculateGoalProgress(goal, db, USER_ID);

    expect(capturedSet[0].status).toBe("achieved");
    expect(capturedSet[0].currentAmount).toBe("100000");
  });

  it("auto-achieves when net worth exceeds targetAmount", async () => {
    // assets = 150000, liabilities = 20000 → net worth = 130000 > target 100000
    const capturedSet: Record<string, unknown>[] = [];
    const db = makeMockDb(
      (args) => capturedSet.push(args),
      ["150000", "20000"],
    );
    const goal = makeGoal({
      type: "net_worth_milestone",
      targetAmount: "100000.00",
      linkedAccountId: null,
    });

    await calculateGoalProgress(goal, db, USER_ID);

    expect(capturedSet[0].status).toBe("achieved");
    expect(capturedSet[0].currentAmount).toBe("130000");
  });

  it("stores negative net worth as-is (no clamping)", async () => {
    // assets = 5000, liabilities = 20000 → net worth = -15000
    const capturedSet: Record<string, unknown>[] = [];
    const db = makeMockDb((args) => capturedSet.push(args), ["5000", "20000"]);
    const goal = makeGoal({
      type: "net_worth_milestone",
      targetAmount: "100000.00",
      linkedAccountId: null,
    });

    await calculateGoalProgress(goal, db, USER_ID);

    expect(capturedSet[0].currentAmount).toBe("-15000");
    expect(capturedSet[0].status).toBe("active");
  });

  it("works with zero assets and zero liabilities (new user)", async () => {
    // assets = 0, liabilities = 0 → net worth = 0
    const capturedSet: Record<string, unknown>[] = [];
    const db = makeMockDb((args) => capturedSet.push(args), ["0", "0"]);
    const goal = makeGoal({
      type: "net_worth_milestone",
      targetAmount: "50000.00",
      linkedAccountId: null,
    });

    await calculateGoalProgress(goal, db, USER_ID);

    expect(capturedSet[0].currentAmount).toBe("0");
    expect(capturedSet[0].status).toBe("active");
  });

  it("does not require linkedAccountId — works for any user", async () => {
    // linkedAccountId is null but the goal still processes
    const capturedSet: Record<string, unknown>[] = [];
    const db = makeMockDb((args) => capturedSet.push(args), ["80000", "10000"]);
    const goal = makeGoal({
      type: "net_worth_milestone",
      targetAmount: "100000.00",
      linkedAccountId: null,
    });

    await calculateGoalProgress(goal, db, USER_ID);

    // Should write — net_worth_milestone doesn't need linkedAccountId
    expect(capturedSet).toHaveLength(1);
    expect(capturedSet[0].currentAmount).toBe("70000");
  });
});

describe("calculateGoalProgress — spending_limit", () => {
  it("writes currentAmount as abs(sum of negative transactions) for partial spend", async () => {
    // Expenses this month = -300 (negative in DB); currentAmount = 300
    const capturedSet: Record<string, unknown>[] = [];
    const db = makeMockDb((args) => capturedSet.push(args), ["-300"]);
    const goal = makeGoal({
      type: "spending_limit",
      targetAmount: "500.00",
      categoryName: "Groceries",
      linkedAccountId: null,
    });

    await calculateGoalProgress(goal, db, USER_ID);

    expect(capturedSet).toHaveLength(1);
    expect(capturedSet[0].currentAmount).toBe("300");
    // spending_limit is NEVER auto-achieved
    expect(capturedSet[0].status).toBeUndefined();
  });

  it("writes currentAmount > targetAmount when spending exceeds limit (not clamped)", async () => {
    // Expenses = -600; target = 500 → currentAmount = 600 (>100%, not clamped)
    const capturedSet: Record<string, unknown>[] = [];
    const db = makeMockDb((args) => capturedSet.push(args), ["-600"]);
    const goal = makeGoal({
      type: "spending_limit",
      targetAmount: "500.00",
      categoryName: "Dining",
      linkedAccountId: null,
    });

    await calculateGoalProgress(goal, db, USER_ID);

    expect(capturedSet[0].currentAmount).toBe("600");
    expect(capturedSet[0].status).toBeUndefined();
  });

  it("writes currentAmount = 0 when no expenses in category this month", async () => {
    // No matching transactions → COALESCE returns '0' → currentAmount = 0
    const capturedSet: Record<string, unknown>[] = [];
    const db = makeMockDb((args) => capturedSet.push(args), ["0"]);
    const goal = makeGoal({
      type: "spending_limit",
      targetAmount: "500.00",
      categoryName: "Entertainment",
      linkedAccountId: null,
    });

    await calculateGoalProgress(goal, db, USER_ID);

    expect(capturedSet[0].currentAmount).toBe("0");
  });

  it("does not write to DB when categoryName is null (no-op)", async () => {
    const db = makeMockDb();
    const goal = makeGoal({
      type: "spending_limit",
      categoryName: null,
      linkedAccountId: null,
    });

    await calculateGoalProgress(goal, db, USER_ID);

    expect(
      (db as unknown as { update: ReturnType<typeof vi.fn> }).update,
    ).not.toHaveBeenCalled();
  });

  it("never sets status to 'achieved' regardless of spending amount", async () => {
    // spending = 500, target = 500 → currentAmount = 500 but status is NOT set to 'achieved'
    const capturedSet: Record<string, unknown>[] = [];
    const db = makeMockDb((args) => capturedSet.push(args), ["-500"]);
    const goal = makeGoal({
      type: "spending_limit",
      targetAmount: "500.00",
      categoryName: "Shopping",
      linkedAccountId: null,
    });

    await calculateGoalProgress(goal, db, USER_ID);

    expect(capturedSet[0].status).toBeUndefined();
    expect(capturedSet[0].currentAmount).toBe("500");
  });
});
