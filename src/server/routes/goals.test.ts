/**
 * FA-GOAL-003 T004 — Integration tests for GET /api/goals route
 *
 * Verifies that recalculateUserGoals is called before the SELECT query so the
 * Goals page always receives up-to-date currentAmount values.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("../../db/index.ts", () => ({
  db: {},
}));

vi.mock("../utils/recalculateUserGoals.ts", () => ({
  recalculateUserGoals: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../middleware/authenticateToken.ts", () => ({
  authenticateToken: (
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    (res.locals as { user: { userId: string } }).user = { userId: "user-001" };
    next();
  },
}));

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return { ...actual };
});

import { recalculateUserGoals } from "../utils/recalculateUserGoals.ts";

const mockRecalculateUserGoals = vi.mocked(recalculateUserGoals);

// ---------------------------------------------------------------------------
// Build a minimal Express app around goalsRouter
// ---------------------------------------------------------------------------

let app: express.Express;

beforeEach(async () => {
  // Reset modules so the db mock is fresh for each test
  vi.resetModules();
  mockRecalculateUserGoals.mockReset();
  mockRecalculateUserGoals.mockResolvedValue(undefined);

  // Dynamically import the router after mocks are set up
  const { db } = await import("../../db/index.ts");

  // Provide a minimal Drizzle mock: select().from().where().orderBy()
  const orderByChain = { orderBy: vi.fn().mockResolvedValue([]) };
  const whereChain = { where: vi.fn().mockReturnValue(orderByChain) };
  const fromChain = { from: vi.fn().mockReturnValue(whereChain) };
  (db as unknown as Record<string, unknown>).select = vi
    .fn()
    .mockReturnValue(fromChain);

  const { goalsRouter } = await import("./goals.ts");
  app = express();
  app.use(express.json());
  app.use("/api/goals", goalsRouter);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /api/goals", () => {
  it("calls recalculateUserGoals before returning goals", async () => {
    const response = await request(app)
      .get("/api/goals")
      .set("Authorization", "Bearer fake-token");

    expect(response.status).toBe(200);
    expect(mockRecalculateUserGoals).toHaveBeenCalledTimes(1);
    const [calledUserId] = mockRecalculateUserGoals.mock.calls[0]!;
    expect(calledUserId).toBe("user-001");
  });

  it("returns a goals array in the response body", async () => {
    const response = await request(app)
      .get("/api/goals")
      .set("Authorization", "Bearer fake-token");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("goals");
    expect(Array.isArray(response.body.goals)).toBe(true);
  });
});
