// FA-GOAL-004 T003 — Unit tests for getGoalStatus utility

import { describe, it, expect } from "vitest";
import { getGoalStatus } from "../getGoalStatus";
import type { ApiGoal } from "../../types/api";

function makeGoal(overrides: Partial<ApiGoal> = {}): ApiGoal {
  return {
    id: "g1",
    userId: "u1",
    name: "Test Goal",
    type: "savings_target",
    targetAmount: "1000",
    targetDate: "2026-12-31",
    linkedAccountId: null,
    categoryName: null,
    currentAmount: "500",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-05-19T00:00:00.000Z",
    ...overrides,
  };
}

const today = new Date("2026-05-19");

describe("getGoalStatus — null cases", () => {
  it("returns null when targetDate is null", () => {
    expect(getGoalStatus(makeGoal({ targetDate: null }), today)).toBeNull();
  });

  it("returns null when targetAmount is 0", () => {
    expect(getGoalStatus(makeGoal({ targetAmount: "0" }), today)).toBeNull();
  });

  it("returns null when currentAmount is null", () => {
    expect(getGoalStatus(makeGoal({ currentAmount: null }), today)).toBeNull();
  });

  it("returns null when createdAt date equals targetDate", () => {
    expect(
      getGoalStatus(
        makeGoal({
          createdAt: "2026-12-31T00:00:00.000Z",
          targetDate: "2026-12-31",
        }),
        today,
      ),
    ).toBeNull();
  });
});

describe("getGoalStatus — spending_limit goals", () => {
  it("returns on_track when spend ratio < 0.80", () => {
    expect(
      getGoalStatus(
        makeGoal({
          type: "spending_limit",
          targetAmount: "1000",
          currentAmount: "700",
        }),
        today,
      ),
    ).toBe("on_track");
  });

  it("returns at_risk when spend ratio >= 0.80 and < 1.00", () => {
    expect(
      getGoalStatus(
        makeGoal({
          type: "spending_limit",
          targetAmount: "1000",
          currentAmount: "850",
        }),
        today,
      ),
    ).toBe("at_risk");
  });

  it("returns at_risk at exact 0.80 boundary", () => {
    expect(
      getGoalStatus(
        makeGoal({
          type: "spending_limit",
          targetAmount: "1000",
          currentAmount: "800",
        }),
        today,
      ),
    ).toBe("at_risk");
  });

  it("returns behind when spend ratio >= 1.00", () => {
    expect(
      getGoalStatus(
        makeGoal({
          type: "spending_limit",
          targetAmount: "1000",
          currentAmount: "1000",
        }),
        today,
      ),
    ).toBe("behind");
  });

  it("returns behind when spend exceeds target", () => {
    expect(
      getGoalStatus(
        makeGoal({
          type: "spending_limit",
          targetAmount: "1000",
          currentAmount: "1200",
        }),
        today,
      ),
    ).toBe("behind");
  });
});

describe("getGoalStatus — time-based goals (savings_target)", () => {
  // Goal: 2026-01-01 → 2026-12-31 (364 days). today = 2026-05-19 (138 days elapsed)
  // expectedProgress = 138/364 ≈ 0.379
  // on_track: actualProgress >= expectedProgress - 0.10 → >= 0.279 → currentAmount >= 279
  // at_risk: actualProgress >= 0.129 → currentAmount >= 129
  // behind: actualProgress < 0.129 → currentAmount < 129

  it("returns on_track when actualProgress close to expected", () => {
    // currentAmount = 500 → actualProgress = 0.5 > expectedProgress 0.379 → gap = -0.121 <= 0.10
    expect(getGoalStatus(makeGoal({ currentAmount: "500" }), today)).toBe(
      "on_track",
    );
  });

  it("returns on_track when exact gap is 0 (ahead of schedule)", () => {
    // currentAmount = 1000 → actualProgress = 1.0, gap = 0.379 - 1.0 = negative
    expect(getGoalStatus(makeGoal({ currentAmount: "1000" }), today)).toBe(
      "on_track",
    );
  });

  it("returns at_risk when gap is between 0.10 and 0.25", () => {
    // expectedProgress ≈ 0.379, need gap in (0.10, 0.25]
    // gap = 0.379 - actual → actual = 0.379 - 0.20 = 0.179 → currentAmount ≈ 179
    expect(getGoalStatus(makeGoal({ currentAmount: "179" }), today)).toBe(
      "at_risk",
    );
  });

  it("returns behind when gap > 0.25", () => {
    // expectedProgress ≈ 0.379, need actualProgress < 0.379 - 0.25 = 0.129 → currentAmount < 129
    expect(getGoalStatus(makeGoal({ currentAmount: "100" }), today)).toBe(
      "behind",
    );
  });

  it("works for net_worth_milestone type", () => {
    expect(
      getGoalStatus(
        makeGoal({ type: "net_worth_milestone", currentAmount: "500" }),
        today,
      ),
    ).toBe("on_track");
  });

  it("works for debt_payoff type", () => {
    expect(
      getGoalStatus(
        makeGoal({ type: "debt_payoff", currentAmount: "100" }),
        today,
      ),
    ).toBe("behind");
  });
});
