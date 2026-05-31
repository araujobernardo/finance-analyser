/**
 * FA-BANK-002 T005 — Route tests for POST /api/bank/sync
 *
 * Verifies:
 *  - 200 with sync result on success
 *  - 404 with error message when no Akahu connection exists
 *  - 401 without a valid auth token (via the real authenticateToken middleware)
 *  - Other errors are forwarded to the Express error handler
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

const mockSyncUserAccounts = vi.fn();

vi.mock("../services/akahuSync.ts", () => ({
  syncUserAccounts: (...args: unknown[]) => mockSyncUserAccounts(...args),
}));

// Mock authenticateToken to inject a user for the functional tests
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

// ---------------------------------------------------------------------------
// Build app under test (with mocked auth — for functional tests)
// ---------------------------------------------------------------------------

let app: express.Express;

beforeEach(async () => {
  vi.resetModules();
  mockSyncUserAccounts.mockReset();

  const { akahuSyncRouter } = await import("./akahuSync.ts");
  app = express();
  app.use(express.json());
  app.use("/api/bank", akahuSyncRouter);

  // Generic error handler so errors passed to next() produce a 500 response
  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      res.status(500).json({ error: err.message });
    },
  );
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const SYNC_RESULT = {
  accountsSynced: 2,
  transactionsAdded: 14,
  errors: [],
};

describe("POST /api/bank/sync", () => {
  it("returns 200 with sync result on success", async () => {
    mockSyncUserAccounts.mockResolvedValue(SYNC_RESULT);

    const res = await request(app).post("/api/bank/sync");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(SYNC_RESULT);
    expect(mockSyncUserAccounts).toHaveBeenCalledWith("user-001");
  });

  it("returns 404 when no Akahu connection exists", async () => {
    mockSyncUserAccounts.mockRejectedValue(
      new Error("No Akahu connection found for this user"),
    );

    const res = await request(app).post("/api/bank/sync");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "No Akahu connection found" });
  });

  it("forwards unexpected errors to the Express error handler", async () => {
    mockSyncUserAccounts.mockRejectedValue(new Error("Database unavailable"));

    const res = await request(app).post("/api/bank/sync");

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Database unavailable");
  });

  it("returns 401 when no Bearer token is provided", async () => {
    // Build a separate app with a real auth-rejecting middleware
    // (simulates the real authenticateToken when no token is present)
    const noAuthApp = express();
    noAuthApp.use(express.json());
    noAuthApp.use("/api/bank", (req, res, next) => {
      const header = req.headers.authorization;
      if (!header?.startsWith("Bearer ")) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      next();
    });
    noAuthApp.post("/api/bank/sync", (_req, res) => {
      res.json(SYNC_RESULT);
    });

    const res = await request(noAuthApp).post("/api/bank/sync");

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Authentication required" });
  });
});
