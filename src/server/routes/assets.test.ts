/**
 * FA-GOAL-003 T010 — Integration tests for PATCH /api/assets/:id route
 *
 * Verifies that recalculateUserGoals is called after an asset is updated so
 * net_worth_milestone goals are recalculated whenever asset values change.
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
// Build a minimal Express app around assetsRouter
// ---------------------------------------------------------------------------

let app: express.Express;

const FAKE_ASSET = {
  id: "asset-001",
  userId: "user-001",
  name: "Savings Account",
  type: "savings",
  value: "5000.00",
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

  // PATCH chain: update().set().where().returning() → [FAKE_ASSET]
  const returningChain = {
    returning: vi.fn().mockResolvedValue([FAKE_ASSET]),
  };
  const whereChain = { where: vi.fn().mockReturnValue(returningChain) };
  const setChain = { set: vi.fn().mockReturnValue(whereChain) };
  (db as unknown as Record<string, unknown>).update = vi
    .fn()
    .mockReturnValue(setChain);

  const { assetsRouter } = await import("./assets.ts");
  app = express();
  app.use(express.json());
  app.use("/api/assets", assetsRouter);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PATCH /api/assets/:id", () => {
  it("calls recalculateUserGoals after updating an asset value", async () => {
    const response = await request(app)
      .patch("/api/assets/asset-001")
      .set("Authorization", "Bearer fake-token")
      .send({ value: 6000 });

    expect(response.status).toBe(200);
    expect(mockRecalculateUserGoals).toHaveBeenCalledTimes(1);
    const [calledUserId] = mockRecalculateUserGoals.mock.calls[0]!;
    expect(calledUserId).toBe("user-001");
  });

  it("returns the updated asset in the response body", async () => {
    const response = await request(app)
      .patch("/api/assets/asset-001")
      .set("Authorization", "Bearer fake-token")
      .send({ name: "Updated Name" });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("id", "asset-001");
  });

  it("returns 404 when asset does not exist", async () => {
    const { db } = await import("../../db/index.ts");
    // Override update to return empty array (asset not found)
    const returningChain = { returning: vi.fn().mockResolvedValue([]) };
    const whereChain = { where: vi.fn().mockReturnValue(returningChain) };
    const setChain = { set: vi.fn().mockReturnValue(whereChain) };
    (db as unknown as Record<string, unknown>).update = vi
      .fn()
      .mockReturnValue(setChain);

    const response = await request(app)
      .patch("/api/assets/nonexistent")
      .set("Authorization", "Bearer fake-token")
      .send({ name: "No such asset" });

    expect(response.status).toBe(404);
    expect(mockRecalculateUserGoals).not.toHaveBeenCalled();
  });
});
