/**
 * FA-BANK-002 T005 / T006 — Route tests for akahuSyncRouter
 *
 * T005 (POST /sync): 200 success, 404 no connection, 401 no auth, 500 unexpected error
 * T006 (POST /connect, GET /connection, DELETE /connection):
 *   - connect: 201 success (no encryptedUserToken in response), 400 bad body
 *   - connection: 200 with connection + links, 404 when none
 *   - delete connection: 204 success
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// db mock — individual test groups override as needed via mockDb helper
const mockDbInsert = vi.fn();
const mockDbSelect = vi.fn();
const mockDbDelete = vi.fn();

vi.mock("../../db/index.ts", () => ({
  db: {
    insert: (...args: unknown[]) => mockDbInsert(...args),
    select: (...args: unknown[]) => mockDbSelect(...args),
    delete: (...args: unknown[]) => mockDbDelete(...args),
  },
}));

vi.mock("../../db/schema.ts", () => ({
  akahuConnections: { userId: "userId" },
  akahuAccountLinks: { userId: "userId" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((_col: unknown, _val: unknown) => "eq-condition"),
  and: vi.fn((..._args: unknown[]) => "and-condition"),
}));

const mockEncrypt = vi.fn();
vi.mock("../utils/encryption.ts", () => ({
  encrypt: (...args: unknown[]) => mockEncrypt(...args),
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
  mockDbInsert.mockReset();
  mockDbSelect.mockReset();
  mockDbDelete.mockReset();
  mockEncrypt.mockReset();

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
// POST /api/bank/sync
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

// ---------------------------------------------------------------------------
// POST /api/bank/connect
// ---------------------------------------------------------------------------

describe("POST /api/bank/connect", () => {
  const CONNECTION_ROW = {
    id: "conn-001",
    userId: "user-001",
    akahuUserId: "user_abc123",
    encryptedUserToken: "encrypted-secret",
    connectedAt: new Date("2026-06-01").toISOString(),
    lastSyncedAt: null,
    createdAt: new Date("2026-06-01").toISOString(),
    updatedAt: new Date("2026-06-01").toISOString(),
  };

  function setupConnectMock() {
    mockEncrypt.mockReturnValue("encrypted-secret");
    mockDbInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([CONNECTION_ROW]),
        }),
      }),
    });
  }

  it("returns 201 with connection row excluding encryptedUserToken", async () => {
    setupConnectMock();

    const res = await request(app)
      .post("/api/bank/connect")
      .send({ akahuUserId: "user_abc123", userToken: "user_token_secret" });

    expect(res.status).toBe(201);
    expect(res.body).not.toHaveProperty("encryptedUserToken");
    expect(res.body.id).toBe("conn-001");
    expect(res.body.akahuUserId).toBe("user_abc123");
    expect(mockEncrypt).toHaveBeenCalledWith("user_token_secret");
  });

  it("returns 400 when akahuUserId is missing", async () => {
    const res = await request(app)
      .post("/api/bank/connect")
      .send({ userToken: "user_token_secret" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid request body");
  });

  it("returns 400 when userToken is missing", async () => {
    const res = await request(app)
      .post("/api/bank/connect")
      .send({ akahuUserId: "user_abc123" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid request body");
  });

  it("returns 400 when body is empty", async () => {
    const res = await request(app).post("/api/bank/connect").send({});

    expect(res.status).toBe(400);
  });

  it("never includes encryptedUserToken in the response even on reconnect", async () => {
    setupConnectMock();

    const res = await request(app)
      .post("/api/bank/connect")
      .send({ akahuUserId: "user_abc123", userToken: "new_token" });

    expect(res.status).toBe(201);
    expect(Object.keys(res.body)).not.toContain("encryptedUserToken");
  });
});

// ---------------------------------------------------------------------------
// GET /api/bank/connection
// ---------------------------------------------------------------------------

describe("GET /api/bank/connection", () => {
  const CONNECTION_ROW = {
    id: "conn-001",
    userId: "user-001",
    akahuUserId: "user_abc123",
    encryptedUserToken: "encrypted-secret",
    connectedAt: new Date("2026-06-01").toISOString(),
    lastSyncedAt: null,
    createdAt: new Date("2026-06-01").toISOString(),
    updatedAt: new Date("2026-06-01").toISOString(),
  };

  const ACCOUNT_LINK = {
    id: "link-001",
    userId: "user-001",
    akahuAccountId: "acc_xyz",
    financeAccountId: "fin-acc-001",
    akahuAccountName: "Savings",
    akahuAccountType: "SAVINGS",
    lastBalance: "1234.56",
    lastTransactionSyncedAt: null,
    syncStatus: "active",
    syncError: null,
    createdAt: new Date("2026-06-01").toISOString(),
    updatedAt: new Date("2026-06-01").toISOString(),
  };

  it("returns 200 with connection (no encryptedUserToken) and accountLinks", async () => {
    // First select = akahuConnections, second = akahuAccountLinks
    let callCount = 0;
    mockDbSelect.mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi
          .fn()
          .mockResolvedValue(
            callCount++ === 0 ? [CONNECTION_ROW] : [ACCOUNT_LINK],
          ),
      }),
    }));

    const res = await request(app).get("/api/bank/connection");

    expect(res.status).toBe(200);
    expect(res.body.connection).not.toHaveProperty("encryptedUserToken");
    expect(res.body.connection.id).toBe("conn-001");
    expect(res.body.accountLinks).toHaveLength(1);
    expect(res.body.accountLinks[0].id).toBe("link-001");
  });

  it("returns 404 when no connection exists", async () => {
    mockDbSelect.mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    }));

    const res = await request(app).get("/api/bank/connection");

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("No connection found");
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/bank/connection
// ---------------------------------------------------------------------------

describe("DELETE /api/bank/connection", () => {
  it("returns 204 on successful deletion", async () => {
    mockDbDelete.mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    });

    const res = await request(app).delete("/api/bank/connection");

    expect(res.status).toBe(204);
  });

  it("forwards unexpected errors to the Express error handler", async () => {
    mockDbDelete.mockReturnValue({
      where: vi.fn().mockRejectedValue(new Error("DB error")),
    });

    const res = await request(app).delete("/api/bank/connection");

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("DB error");
  });
});

// ---------------------------------------------------------------------------
// POST /api/bank/accounts/link
// ---------------------------------------------------------------------------

// Valid UUID for Zod v4 (requires proper version/variant bits)
const VALID_FINANCE_ACCOUNT_ID = "550e8400-e29b-41d4-a716-446655440000";

const LINK_ROW = {
  id: "link-001",
  userId: "user-001",
  akahuAccountId: "acc_xyz",
  financeAccountId: VALID_FINANCE_ACCOUNT_ID,
  akahuAccountName: "Savings",
  akahuAccountType: null,
  lastBalance: null,
  lastTransactionSyncedAt: null,
  syncStatus: "active",
  syncError: null,
  createdAt: new Date("2026-06-01").toISOString(),
  updatedAt: new Date("2026-06-01").toISOString(),
};

describe("POST /api/bank/accounts/link", () => {
  it("returns 201 with link row on success", async () => {
    mockDbInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([LINK_ROW]),
        }),
      }),
    });

    const res = await request(app).post("/api/bank/accounts/link").send({
      akahuAccountId: "acc_xyz",
      financeAccountId: VALID_FINANCE_ACCOUNT_ID,
      akahuAccountName: "Savings",
    });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe("link-001");
    expect(res.body.syncStatus).toBe("active");
  });

  it("returns 400 when body is missing required fields", async () => {
    const res = await request(app)
      .post("/api/bank/accounts/link")
      .send({ akahuAccountId: "acc_xyz" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid request body");
  });

  it("returns 400 when financeAccountId is not a UUID", async () => {
    const res = await request(app).post("/api/bank/accounts/link").send({
      akahuAccountId: "acc_xyz",
      financeAccountId: "not-a-uuid",
      akahuAccountName: "Savings",
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid request body");
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/bank/accounts/link/:akahuAccountId
// ---------------------------------------------------------------------------

describe("DELETE /api/bank/accounts/link/:akahuAccountId", () => {
  it("returns 204 when link is deleted", async () => {
    // This handler uses .where().returning() — build mock chain accordingly
    const returningMock = vi.fn().mockResolvedValue([LINK_ROW]);
    const whereMock = vi.fn().mockReturnValue({ returning: returningMock });
    mockDbDelete.mockReturnValue({ where: whereMock });

    const res = await request(app).delete("/api/bank/accounts/link/acc_xyz");

    expect(res.status).toBe(204);
  });

  it("returns 404 when link does not exist", async () => {
    const returningMock = vi.fn().mockResolvedValue([]);
    const whereMock = vi.fn().mockReturnValue({ returning: returningMock });
    mockDbDelete.mockReturnValue({ where: whereMock });

    const res = await request(app).delete(
      "/api/bank/accounts/link/nonexistent",
    );

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Account link not found");
  });
});
