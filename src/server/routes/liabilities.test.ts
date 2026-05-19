/**
 * FA-GOAL-003 T011 — Integration tests for PATCH /api/liabilities/:id route
 *
 * Verifies that recalculateUserGoals is called after a liability is updated so
 * net_worth_milestone goals are recalculated whenever liability values change.
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

vi.mock("../utils/syncLinkedAssets.ts", () => ({
  syncLinkedAssets: vi.fn().mockResolvedValue(undefined),
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
// Build a minimal Express app around liabilitiesRouter
// ---------------------------------------------------------------------------

let app: express.Express;

const FAKE_LIABILITY = {
  id: "liab-001",
  userId: "user-001",
  name: "Credit Card",
  type: "credit_card",
  value: "2000.00",
  linkedAccountId: null,
  autoSync: false,
  balanceClamped: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

beforeEach(async () => {
  vi.resetModules();
  mockRecalculateUserGoals.mockReset();
  mockRecalculateUserGoals.mockResolvedValue(undefined);

  const { db } = await import("../../db/index.ts");

  // PATCH chain: update().set().where().returning() → [FAKE_LIABILITY]
  const returningChain = {
    returning: vi.fn().mockResolvedValue([FAKE_LIABILITY]),
  };
  const whereChain = { where: vi.fn().mockReturnValue(returningChain) };
  const setChain = { set: vi.fn().mockReturnValue(whereChain) };
  (db as unknown as Record<string, unknown>).update = vi
    .fn()
    .mockReturnValue(setChain);

  const { liabilitiesRouter } = await import("./liabilities.ts");
  app = express();
  app.use(express.json());
  app.use("/api/liabilities", liabilitiesRouter);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PATCH /api/liabilities/:id", () => {
  it("calls recalculateUserGoals after updating a liability value", async () => {
    const response = await request(app)
      .patch("/api/liabilities/liab-001")
      .set("Authorization", "Bearer fake-token")
      .send({ value: 1500 });

    expect(response.status).toBe(200);
    expect(mockRecalculateUserGoals).toHaveBeenCalledTimes(1);
    const [calledUserId] = mockRecalculateUserGoals.mock.calls[0]!;
    expect(calledUserId).toBe("user-001");
  });

  it("returns the updated liability in the response body", async () => {
    const response = await request(app)
      .patch("/api/liabilities/liab-001")
      .set("Authorization", "Bearer fake-token")
      .send({ name: "Updated Name" });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("id", "liab-001");
  });

  it("returns 404 when liability does not exist", async () => {
    const { db } = await import("../../db/index.ts");
    // Override update to return empty array (liability not found)
    const returningChain = { returning: vi.fn().mockResolvedValue([]) };
    const whereChain = { where: vi.fn().mockReturnValue(returningChain) };
    const setChain = { set: vi.fn().mockReturnValue(whereChain) };
    (db as unknown as Record<string, unknown>).update = vi
      .fn()
      .mockReturnValue(setChain);

    const response = await request(app)
      .patch("/api/liabilities/nonexistent")
      .set("Authorization", "Bearer fake-token")
      .send({ name: "No such liability" });

    expect(response.status).toBe(404);
    expect(mockRecalculateUserGoals).not.toHaveBeenCalled();
  });
});
