import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock the DB module ────────────────────────────────────────────────────────
// Use vi.mock with a factory that doesn't reference top-level variables.
// We return a simple "no results" default that individual tests override with vi.spyOn.

vi.mock("../../db/index.ts", () => ({
  db: {
    select: () => ({ from: () => ({ where: () => Promise.resolve([]) }) }),
    insert: () => ({
      values: () => ({
        onConflictDoUpdate: () => Promise.resolve([]),
      }),
    }),
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
// responses[0] = akahuConnections, responses[1] = akahuAccountLinks (filtered), ...
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

/**
 * Sets up the db.insert spy supporting both:
 *   - upsert chain: .insert().values().onConflictDoUpdate()
 *   - plain insert chain: .insert().values()
 *
 * Returns the mockValues fn so tests can assert on transaction inserts.
 */
function setupInsertSpy() {
  const mockOnConflictDoUpdate = vi.fn().mockResolvedValue([]);
  const mockValues = vi.fn().mockReturnValue({
    onConflictDoUpdate: mockOnConflictDoUpdate,
    // also resolves directly when no chaining (plain insert)
    then: (resolve: (v: unknown[]) => void) => resolve([]),
  });
  vi.spyOn(db, "insert").mockReturnValue({
    values: mockValues,
  } as unknown as ReturnType<typeof db.insert>);
  return { mockValues, mockOnConflictDoUpdate };
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
    setupInsertSpy();

    await expect(syncUserAccounts("user-1")).rejects.toThrow(
      "No Akahu connection found",
    );
  });

  it("calls decrypt with the encryptedUserToken from the connection row", async () => {
    // Connection found; no account links
    setupSelectSpy([[makeConnectionRow()], []]);
    setupUpdateSpy();
    setupInsertSpy();

    await syncUserAccounts("user-1");

    expect(decrypt).toHaveBeenCalledWith("encrypted-token");
  });

  it("returns zero counts when no account links exist", async () => {
    setupSelectSpy([[makeConnectionRow()], []]);
    setupUpdateSpy();
    setupInsertSpy();
    mockAccountsList.mockResolvedValue([]);

    const result = await syncUserAccounts("user-1");

    expect(result).toEqual({
      accountsSynced: 0,
      transactionsAdded: 0,
      errors: [],
    });
  });

  it("upserts a discovery row for each Akahu account returned by the SDK", async () => {
    // Two Akahu accounts, no existing Finance Analyser links
    setupSelectSpy([[makeConnectionRow()], []]);
    setupUpdateSpy();
    const { mockValues, mockOnConflictDoUpdate } = setupInsertSpy();

    mockAccountsList.mockResolvedValue([
      makeAkahuAccount({ _id: "akahu-acc-1", name: "Cheque" }),
      makeAkahuAccount({ _id: "akahu-acc-2", name: "Savings" }),
    ]);

    await syncUserAccounts("user-1");

    // insert called twice — once per Akahu account
    expect(mockValues).toHaveBeenCalledTimes(2);
    // onConflictDoUpdate chained on each upsert
    expect(mockOnConflictDoUpdate).toHaveBeenCalledTimes(2);
  });

  it("upserts account name and balance but does not overwrite financeAccountId on conflict", async () => {
    setupSelectSpy([[makeConnectionRow()], []]);
    setupUpdateSpy();
    const { mockOnConflictDoUpdate } = setupInsertSpy();

    mockAccountsList.mockResolvedValue([
      makeAkahuAccount({
        _id: "akahu-acc-1",
        name: "Updated Name",
        balance: { currency: "NZD", current: 999.99 },
      }),
    ]);

    await syncUserAccounts("user-1");

    // The set clause must NOT include financeAccountId (we don't overwrite mappings)
    const setArg = mockOnConflictDoUpdate.mock.calls[0]?.[0]?.set as
      | Record<string, unknown>
      | undefined;
    expect(setArg).toBeDefined();
    expect(setArg).toHaveProperty("akahuAccountName", "Updated Name");
    expect(setArg).toHaveProperty("lastBalance", "999.99");
    expect(setArg).not.toHaveProperty("financeAccountId");
  });

  it("increments accountsSynced and transactionsAdded on a successful sync", async () => {
    // Responses: connection row, then linked accounts (financeAccountId not null)
    setupSelectSpy([
      [makeConnectionRow()], // akahuConnections
      [makeLinkRow()], // akahuAccountLinks (mapped rows only)
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
    setupSelectSpy([
      [makeConnectionRow()], // connection
      [makeLinkRow()], // links
      [{ id: "existing-tx" }], // dedup found — skip insert
    ]);
    setupUpdateSpy();
    const { mockValues } = setupInsertSpy();

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

    // insert.values is called once per discovered Akahu account (upsert), but
    // NOT called again for the transaction because the dedup check found a match.
    // The upsert for akahu-acc-1 = 1 call; tx insert = 0 (deduped)
    const txInsertCalls = mockValues.mock.calls.filter(
      (call) => !("onConflictDoUpdate" in (call[0] ?? {})),
    );
    // All transaction insert calls would NOT have onConflictDoUpdate logic.
    // Since dedup fires, only the upsert is called (1 upsert for 1 account).
    expect(mockValues).toHaveBeenCalledTimes(1); // only upsert, no tx insert
    expect(result.transactionsAdded).toBe(0);
    void txInsertCalls; // suppress unused-variable warning
  });

  it("a per-account error does not stop other accounts from syncing", async () => {
    const link1 = makeLinkRow({ akahuAccountId: "akahu-acc-1" });
    const link2 = makeLinkRow({ id: "link-2", akahuAccountId: "akahu-acc-2" });

    setupSelectSpy([
      [makeConnectionRow()], // connection
      [link1, link2], // links
    ]);
    setupUpdateSpy();
    setupInsertSpy();

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

  it("follows cursor pagination to collect all transaction pages", async () => {
    // Three select calls: connection, linked accounts, then two dedup checks (one per tx)
    setupSelectSpy([
      [makeConnectionRow()], // connection
      [makeLinkRow()], // links
      [], // dedup for page-1 tx
      [], // dedup for page-2 tx
    ]);
    setupUpdateSpy();
    setupInsertSpy();

    mockAccountsList.mockResolvedValue([makeAkahuAccount()]);

    // First call returns page 1 with cursor pointing to page 2;
    // second call returns page 2 with a null cursor (end of results).
    let listCallCount = 0;
    mockTransactionsList.mockImplementation(() => {
      listCallCount++;
      if (listCallCount === 1) {
        return Promise.resolve({
          items: [
            {
              _id: "tx-1",
              _account: "akahu-acc-1",
              _user: "u1",
              date: "2025-07-01",
              amount: -10,
              description: "Page 1 tx",
            },
          ],
          cursor: { next: "cursor-page-2" },
        });
      }
      return Promise.resolve({
        items: [
          {
            _id: "tx-2",
            _account: "akahu-acc-1",
            _user: "u1",
            date: "2025-08-01",
            amount: -20,
            description: "Page 2 tx",
          },
        ],
        cursor: { next: null },
      });
    });

    const result = await syncUserAccounts("user-1");

    // Both pages fetched — 2 transactions added
    expect(mockTransactionsList).toHaveBeenCalledTimes(2);
    expect(result.transactionsAdded).toBe(2);
    expect(result.accountsSynced).toBe(1);
  });

  it("skips transaction sync for unlinked accounts (financeAccountId is null)", async () => {
    // linkRows returns empty (all accounts unlinked) — no transaction processing
    setupSelectSpy([
      [makeConnectionRow()], // connection
      [], // akahuAccountLinks with isNotNull filter = empty (no mapped accounts)
    ]);
    setupUpdateSpy();
    setupInsertSpy();

    mockAccountsList.mockResolvedValue([
      makeAkahuAccount({ _id: "akahu-acc-1" }),
    ]);

    const result = await syncUserAccounts("user-1");

    // Discovered account upserted, but no transactions synced
    expect(result.accountsSynced).toBe(0);
    expect(result.transactionsAdded).toBe(0);
    expect(result.errors).toEqual([]);
    // Transactions.list should NOT have been called since no linked accounts
    expect(mockTransactionsList).not.toHaveBeenCalled();
  });
});
