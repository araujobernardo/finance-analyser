/**
 * FA-GOAL-003 T002 — Unit tests for recalculateUserGoals
 *
 * All DB interactions are mocked so these tests run without a real database.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { recalculateUserGoals } from "./recalculateUserGoals";
import type { Goal } from "../../db/schema";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("./calculateGoalProgress", () => ({
  calculateGoalProgress: vi.fn().mockResolvedValue(undefined),
}));

import { calculateGoalProgress } from "./calculateGoalProgress";

const mockCalculateGoalProgress = vi.mocked(calculateGoalProgress);

// Minimal Drizzle Db mock — only .select().from().where() chain needed
function makeMockDb(goalsToReturn: Goal[]) {
  const whereChain = {
    where: vi.fn().mockResolvedValue(goalsToReturn),
  };
  const fromChain = {
    from: vi.fn().mockReturnValue(whereChain),
  };
  const selectChain = {
    select: vi.fn().mockReturnValue(fromChain),
  };
  return selectChain as unknown as Parameters<typeof recalculateUserGoals>[1];
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

describe("recalculateUserGoals", () => {
  beforeEach(() => {
    mockCalculateGoalProgress.mockReset();
    mockCalculateGoalProgress.mockResolvedValue(undefined);
  });

  it("calls calculateGoalProgress for each active goal", async () => {
    const goal1 = makeGoal({ id: "goal-001" });
    const goal2 = makeGoal({ id: "goal-002", name: "Emergency fund" });
    const db = makeMockDb([goal1, goal2]);

    await recalculateUserGoals(USER_ID, db);

    expect(mockCalculateGoalProgress).toHaveBeenCalledTimes(2);
    expect(mockCalculateGoalProgress).toHaveBeenCalledWith(goal1, db, USER_ID);
    expect(mockCalculateGoalProgress).toHaveBeenCalledWith(goal2, db, USER_ID);
  });

  it("does not call calculateGoalProgress when there are no active goals", async () => {
    const db = makeMockDb([]);

    await recalculateUserGoals(USER_ID, db);

    expect(mockCalculateGoalProgress).not.toHaveBeenCalled();
  });

  it("calls calculateGoalProgress for a single active goal", async () => {
    const goal = makeGoal();
    const db = makeMockDb([goal]);

    await recalculateUserGoals(USER_ID, db);

    expect(mockCalculateGoalProgress).toHaveBeenCalledTimes(1);
    expect(mockCalculateGoalProgress).toHaveBeenCalledWith(goal, db, USER_ID);
  });

  it("processes goals sequentially (awaits each before the next)", async () => {
    const order: string[] = [];
    mockCalculateGoalProgress.mockImplementation(async (goal: Goal) => {
      order.push(goal.id);
    });

    const goal1 = makeGoal({ id: "goal-001" });
    const goal2 = makeGoal({ id: "goal-002" });
    const db = makeMockDb([goal1, goal2]);

    await recalculateUserGoals(USER_ID, db);

    expect(order).toEqual(["goal-001", "goal-002"]);
  });
});
