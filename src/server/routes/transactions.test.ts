/**
 * FA-GOAL-003 T005/T006 — Integration tests for transaction route handlers
 *
 * T005: Verifies that recalculateUserGoals is called after syncLinkedAssets when a
 * new transaction is created, and that syncLinkedAssets still runs (FA-NW-004 not regressed).
 *
 * T006: Verifies that recalculateUserGoals is called in the import, PATCH, and DELETE handlers.
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

vi.mock("../utils/syncLinkedAssets.ts", () => ({
  syncLinkedAssets: vi.fn().mockResolvedValue(undefined),
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

import { syncLinkedAssets } from "../utils/syncLinkedAssets.ts";
import { recalculateUserGoals } from "../utils/recalculateUserGoals.ts";

const mockSyncLinkedAssets = vi.mocked(syncLinkedAssets);
const mockRecalculateUserGoals = vi.mocked(recalculateUserGoals);

// ---------------------------------------------------------------------------
// Build a minimal Express app with a mocked db
// ---------------------------------------------------------------------------

const ACCOUNT_ID = "acct-001";
const USER_ID = "user-001";

const FAKE_TRANSACTION = {
  id: "txn-001",
  userId: USER_ID,
  accountId: ACCOUNT_ID,
  date: "2026-05-19",
  amount: "100",
  description: "Coffee",
  category: null,
  isTransfer: false,
  isManualTransfer: false,
  createdAt: new Date("2026-05-19"),
};

let app: express.Express;

beforeEach(async () => {
  vi.resetModules();
  mockSyncLinkedAssets.mockReset();
  mockSyncLinkedAssets.mockResolvedValue(undefined);
  mockRecalculateUserGoals.mockReset();
  mockRecalculateUserGoals.mockResolvedValue(undefined);

  const { db } = await import("../../db/index.ts");
  const dbMock = db as unknown as Record<string, unknown>;

  // .select({ id: accounts.id }).from(accounts).where(...)  → returns [{id}]
  const accountWhereChain = {
    where: vi.fn().mockResolvedValue([{ id: ACCOUNT_ID }]),
  };
  const accountFromChain = { from: vi.fn().mockReturnValue(accountWhereChain) };
  const selectChain = { select: vi.fn().mockReturnValue(accountFromChain) };
  dbMock.select = selectChain.select;

  // .insert(transactions).values(...).returning()  → returns [FAKE_TRANSACTION]
  const returningChain = {
    returning: vi.fn().mockResolvedValue([FAKE_TRANSACTION]),
  };
  const valuesChain = { values: vi.fn().mockReturnValue(returningChain) };
  const insertChain = { insert: vi.fn().mockReturnValue(valuesChain) };
  dbMock.insert = insertChain.insert;

  const { transactionsRouter } = await import("./transactions.ts");
  app = express();
  app.use(express.json());
  app.use(
    "/api/accounts/:accountId/transactions",
    (req, _res, next) => {
      // Inject accountId param since mergeParams needs the parent router
      req.params["accountId"] = ACCOUNT_ID;
      next();
    },
    transactionsRouter,
  );
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/accounts/:accountId/transactions (single create)", () => {
  const VALID_BODY = {
    date: "2026-05-19",
    amount: 100,
    description: "Coffee",
  };

  it("calls syncLinkedAssets after inserting a transaction", async () => {
    await request(app)
      .post(`/api/accounts/${ACCOUNT_ID}/transactions`)
      .send(VALID_BODY)
      .set("Authorization", "Bearer fake-token");

    expect(mockSyncLinkedAssets).toHaveBeenCalledTimes(1);
  });

  it("calls recalculateUserGoals after syncLinkedAssets", async () => {
    const callOrder: string[] = [];
    mockSyncLinkedAssets.mockImplementation(async () => {
      callOrder.push("syncLinkedAssets");
    });
    mockRecalculateUserGoals.mockImplementation(async () => {
      callOrder.push("recalculateUserGoals");
    });

    await request(app)
      .post(`/api/accounts/${ACCOUNT_ID}/transactions`)
      .send(VALID_BODY)
      .set("Authorization", "Bearer fake-token");

    expect(callOrder).toEqual(["syncLinkedAssets", "recalculateUserGoals"]);
  });

  it("returns 201 with the created transaction", async () => {
    const response = await request(app)
      .post(`/api/accounts/${ACCOUNT_ID}/transactions`)
      .send(VALID_BODY)
      .set("Authorization", "Bearer fake-token");

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("id", "txn-001");
  });
});

describe("POST /import — CSV import triggers goal recalculation", () => {
  it("calls recalculateUserGoals after bulk import", async () => {
    const response = await request(app)
      .post(`/api/accounts/${ACCOUNT_ID}/transactions/import`)
      .send({
        transactions: [
          {
            date: "2026-05-19",
            amount: 100,
            description: "Coffee",
          },
        ],
      })
      .set("Authorization", "Bearer fake-token");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("imported");
    expect(mockRecalculateUserGoals).toHaveBeenCalledTimes(1);
  });

  it("does not call recalculateUserGoals when import has zero valid rows", async () => {
    const response = await request(app)
      .post(`/api/accounts/${ACCOUNT_ID}/transactions/import`)
      .send({ transactions: [] })
      .set("Authorization", "Bearer fake-token");

    expect(response.status).toBe(200);
    expect(mockRecalculateUserGoals).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// PATCH and DELETE (transactionOpsRouter) tests
// ---------------------------------------------------------------------------

let opsApp: express.Express;

beforeEach(async () => {
  const { db } = await import("../../db/index.ts");
  const dbMock = db as unknown as Record<string, unknown>;

  // .update(transactions).set(...).where(...).returning() → returns [FAKE_TRANSACTION]
  const updateReturningChain = {
    returning: vi.fn().mockResolvedValue([FAKE_TRANSACTION]),
  };
  const updateWhereChain = {
    where: vi.fn().mockReturnValue(updateReturningChain),
  };
  const updateSetChain = { set: vi.fn().mockReturnValue(updateWhereChain) };
  const updateChain = { update: vi.fn().mockReturnValue(updateSetChain) };

  // .delete(transactions).where(...).returning() → returns [FAKE_TRANSACTION]
  const deleteReturningChain = {
    returning: vi.fn().mockResolvedValue([FAKE_TRANSACTION]),
  };
  const deleteWhereChain = {
    where: vi.fn().mockReturnValue(deleteReturningChain),
  };
  const deleteChain = { delete: vi.fn().mockReturnValue(deleteWhereChain) };

  dbMock.update = updateChain.update;
  dbMock.delete = deleteChain.delete;

  const { transactionOpsRouter } = await import("./transactions.ts");
  opsApp = express();
  opsApp.use(express.json());
  opsApp.use("/api/transactions", transactionOpsRouter);
});

describe("PATCH /api/transactions/:id — editing a transaction triggers goal recalculation", () => {
  it("calls recalculateUserGoals after the update", async () => {
    const res = await request(opsApp)
      .patch("/api/transactions/txn-001")
      .send({ category: "Food" })
      .set("Authorization", "Bearer fake-token");

    expect(res.status).toBe(200);
    expect(mockRecalculateUserGoals).toHaveBeenCalled();
  });
});

describe("DELETE /api/transactions/:id — deleting a transaction triggers goal recalculation", () => {
  it("calls recalculateUserGoals after the delete", async () => {
    const res = await request(opsApp)
      .delete("/api/transactions/txn-001")
      .set("Authorization", "Bearer fake-token");

    expect(res.status).toBe(204);
    expect(mockRecalculateUserGoals).toHaveBeenCalled();
  });
});
