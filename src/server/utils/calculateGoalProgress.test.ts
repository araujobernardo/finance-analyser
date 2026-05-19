/**
 * FA-GOAL-003 T001 — Unit tests for calculateGoalProgress
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

// Minimal Drizzle Db mock — we only care about .update().set().where()
function makeMockDb(onUpdate?: (args: Record<string, unknown>) => void) {
  const whereChain = { where: vi.fn().mockResolvedValue(undefined) };
  const setChain = {
    set: vi.fn((args: Record<string, unknown>) => {
      onUpdate?.(args);
      return whereChain;
    }),
  };
  const updateChain = { update: vi.fn().mockReturnValue(setChain) };
  return updateChain as unknown as Parameters<typeof calculateGoalProgress>[1];
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

describe("calculateGoalProgress — stub types (no-op)", () => {
  it("does not write to DB for debt_payoff goals", async () => {
    const db = makeMockDb();
    const goal = makeGoal({ type: "debt_payoff", linkedAccountId: null });

    await calculateGoalProgress(goal, db, USER_ID);

    expect(
      (db as unknown as { update: ReturnType<typeof vi.fn> }).update,
    ).not.toHaveBeenCalled();
  });

  it("does not write to DB for net_worth_milestone goals", async () => {
    const db = makeMockDb();
    const goal = makeGoal({
      type: "net_worth_milestone",
      linkedAccountId: null,
    });

    await calculateGoalProgress(goal, db, USER_ID);

    expect(
      (db as unknown as { update: ReturnType<typeof vi.fn> }).update,
    ).not.toHaveBeenCalled();
  });

  it("does not write to DB for spending_limit goals", async () => {
    const db = makeMockDb();
    const goal = makeGoal({ type: "spending_limit", linkedAccountId: null });

    await calculateGoalProgress(goal, db, USER_ID);

    expect(
      (db as unknown as { update: ReturnType<typeof vi.fn> }).update,
    ).not.toHaveBeenCalled();
  });
});
