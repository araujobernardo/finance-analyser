import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock the DB module ────────────────────────────────────────────────────────
// Use vi.mock with a factory that doesn't reference top-level variables.
// We return a simple "no results" default that individual tests override with vi.spyOn.

vi.mock("../../db/index.ts", () => ({
  db: {
    select: () => ({ from: () => ({ where: () => Promise.resolve([]) }) }),
    insert: () => ({ values: () => Promise.resolve([]) }),
    update: () => ({ set: () => ({ where: () => Promise.resolve([]) }) }),
  },
}));

// ── Mock encryption utility ───────────────────────────────────────────────────

vi.mock("../utils/encryption.ts", () => ({
  decrypt: vi.fn().mockReturnValue("user_token_testtoken"),
}));

// ── Mock Akahu SDK ────────────────────────────────────────────────────────────

const mockAccountsList = vi.fn();
const mockTransactionsList = vi.fn();
const mockTransactionsListPending = vi.fn();

vi.mock("akahu", () => {
  // Use a class so `new AkahuClient(...)` works correctly
  class AkahuClient {
    accounts = { list: mockAccountsList };
    transactions = {
      list: mockTransactionsList,
      listPending: mockTransactionsListPending,
    };

    constructor(_config: unknown) {}
  }
  return { AkahuClient };
});

// ── Import after mocks ────────────────────────────────────────────────────────

import { syncUserAccounts } from "./akahuSync.ts";
import { decrypt } from "../utils/encryption.ts";
import { db } from "../../db/index.ts";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeConnectionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "conn-1",
    userId: "user-1",
    akahuUserId: "akahu-user-1",
    encryptedUserToken: "encrypted-token",
    connectedAt: new Date(),
    lastSyncedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeLinkRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "link-1",
    userId: "user-1",
    akahuAccountId: "akahu-acc-1",
    financeAccountId: "finance-acc-1",
    akahuAccountName: "Cheque",
    akahuAccountType: "CHECKING",
    lastBalance: null,
    lastTransactionSyncedAt: null,
    syncStatus: "active",
    syncError: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeAkahuAccount(overrides: Record<string, unknown> = {}) {
  return {
    _id: "akahu-acc-1",
    _user: "akahu-user-1",
    _credentials: "cred-1",
    _connection: "conn-1",
    name: "Cheque Account",
    status: "ACTIVE",
    type: "CHECKING",
    attributes: ["TRANSACTIONS"],
    balance: { currency: "NZD", current: 1000.0 },
    refreshed: {},
    ...overrides,
  };
}

function makeTxResult(items: unknown[]) {
  return { cursor: { next: null }, items };
}

// A helper to set up the db.select spy with sequential responses.
// responses[0] = akahuConnections, responses[1] = balance check, ...
function setupSelectSpy(responses: unknown[][]) {
  let callCount = 0;
  vi.spyOn(db, "select").mockImplementation(
    () =>
      ({
        from: () => ({
          where: () => {
            const response = responses[callCount] ?? [];
            callCount++;
            return Promise.resolve(response);
          },
        }),
      }) as unknown as ReturnType<typeof db.select>,
  );
}

function setupUpdateSpy() {
  vi.spyOn(db, "update").mockReturnValue({
    set: () => ({
      where: vi.fn().mockResolvedValue([]),
    }),
  } as unknown as ReturnType<typeof db.update>);
}

function setupInsertSpy() {
  const mockValues = vi.fn().mockResolvedValue([]);
  vi.spyOn(db, "insert").mockReturnValue({
    values: mockValues,
  } as unknown as ReturnType<typeof db.insert>);
  return mockValues;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("syncUserAccounts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAccountsList.mockResolvedValue([]);
    mockTransactionsList.mockResolvedValue(makeTxResult([]));
    mockTransactionsListPending.mockResolvedValue([]);
  });

  it("throws when no akahuConnections row exists for the user", async () => {
    // All selects return empty — no connection found
    setupSelectSpy([[]]);
    setupUpdateSpy();

    await expect(syncUserAccounts("user-1")).rejects.toThrow(
      "No Akahu connection found",
    );
  });

  it("calls decrypt with the encryptedUserToken from the connection row", async () => {
    // Connection found; no account links
    setupSelectSpy([[makeConnectionRow()], [], []]);
    setupUpdateSpy();

    await syncUserAccounts("user-1");

    expect(decrypt).toHaveBeenCalledWith("encrypted-token");
  });

  it("returns zero counts when no account links exist", async () => {
    setupSelectSpy([[makeConnectionRow()], []]);
    setupUpdateSpy();
    mockAccountsList.mockResolvedValue([]);

    const result = await syncUserAccounts("user-1");

    expect(result).toEqual({
      accountsSynced: 0,
      transactionsAdded: 0,
      errors: [],
    });
  });

  it("increments accountsSynced and transactionsAdded on a successful sync", async () => {
    // Responses: connection, (balance update — no link found), links, (dedup — not found)
    setupSelectSpy([
      [makeConnectionRow()], // akahuConnections
      [], // balance update check (no link for account)
      [makeLinkRow()], // akahuAccountLinks
      [], // dedup check — no existing transaction
    ]);
    setupUpdateSpy();
    setupInsertSpy();

    mockAccountsList.mockResolvedValue([makeAkahuAccount()]);
    mockTransactionsList.mockResolvedValue(
      makeTxResult([
        {
          _id: "tx-1",
          _account: "akahu-acc-1",
          _user: "u1",
          date: "2026-01-15",
          amount: -50,
          description: "Coffee",
        },
      ]),
    );

    const result = await syncUserAccounts("user-1");

    expect(result.accountsSynced).toBe(1);
    expect(result.transactionsAdded).toBe(1);
    expect(result.errors).toEqual([]);
  });

  it("skips insertion when a transaction already exists (dedup)", async () => {
    // Dedup check returns an existing transaction
    setupSelectSpy([
      [makeConnectionRow()], // connection
      [], // balance update
      [makeLinkRow()], // links
      [{ id: "existing-tx" }], // dedup found — skip insert
    ]);
    setupUpdateSpy();
    const mockValues = setupInsertSpy();

    mockAccountsList.mockResolvedValue([makeAkahuAccount()]);
    mockTransactionsList.mockResolvedValue(
      makeTxResult([
        {
          _id: "tx-1",
          _account: "akahu-acc-1",
          _user: "u1",
          date: "2026-01-15",
          amount: -50,
          description: "Coffee",
        },
      ]),
    );

    const result = await syncUserAccounts("user-1");

    expect(mockValues).not.toHaveBeenCalled();
    expect(result.transactionsAdded).toBe(0);
  });

  it("a per-account error does not stop other accounts from syncing", async () => {
    const link1 = makeLinkRow({ akahuAccountId: "akahu-acc-1" });
    const link2 = makeLinkRow({ id: "link-2", akahuAccountId: "akahu-acc-2" });

    setupSelectSpy([
      [makeConnectionRow()], // connection
      [], // balance update acc-1
      [], // balance update acc-2
      [link1, link2], // links
    ]);
    setupUpdateSpy();

    mockAccountsList.mockResolvedValue([
      makeAkahuAccount({ _id: "akahu-acc-1" }),
      makeAkahuAccount({ _id: "akahu-acc-2" }),
    ]);

    let txCallCount = 0;
    mockTransactionsList.mockImplementation(() => {
      txCallCount++;
      if (txCallCount === 1) {
        return Promise.reject(new Error("Network timeout"));
      }
      return Promise.resolve(makeTxResult([]));
    });

    const result = await syncUserAccounts("user-1");

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.error).toBe("Network timeout");
    expect(result.accountsSynced).toBe(1);
  });
});
