/**
 * FA-766 — Unit tests for detectTransfers
 *
 * All DB interactions are mocked so these tests run without a real database.
 * The tests verify:
 *   - Early exit when no IDs are provided
 *   - Transfer flagging when a mirror transaction exists in another account
 *   - No flagging when no mirror exists
 *   - No flagging when all inserted rows are already flagged
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { detectTransfers } from "./detectTransfers";

// ---------------------------------------------------------------------------
// DB mock factory
// ---------------------------------------------------------------------------

/**
 * Builds a minimal Drizzle mock that supports the select/update chains used
 * by detectTransfers.
 *
 * @param newRows  — rows returned for the "fetch newly inserted" query
 * @param matchRow — row returned for the "find mirror in another account" query
 *                   (undefined = no match found)
 */
function makeMockDb(
  newRows: Array<{ id: string; date: string; amount: string }>,
  matchRow?: { id: string },
) {
  const updateSet = vi.fn().mockReturnValue({
    where: vi.fn().mockResolvedValue([]),
  });
  const updateChain = {
    update: vi.fn().mockReturnValue({ set: updateSet }),
  };

  // The second select call (looking for the mirror) returns at most one row.
  let selectCallCount = 0;
  const selectChain = {
    select: vi.fn().mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        // First call: fetch the newly inserted rows
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(newRows),
          }),
        };
      }
      // Subsequent calls: look for mirror transactions (one per new row)
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi
              .fn()
              .mockResolvedValue(matchRow !== undefined ? [matchRow] : []),
          }),
        }),
      };
    }),
  };

  const db = { ...selectChain, ...updateChain };
  return {
    db: db as unknown as Parameters<typeof detectTransfers>[3],
    updateSet,
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const USER_ID = "user-001";
const ACCOUNT_ID = "acct-001";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("detectTransfers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns immediately when insertedIds is empty — no DB queries", async () => {
    const { db, updateSet } = makeMockDb([]);

    await detectTransfers(USER_ID, ACCOUNT_ID, [], db);

    expect(updateSet).not.toHaveBeenCalled();
  });

  it("flags both sides when a mirror transaction is found in another account", async () => {
    const newRows = [
      { id: "tx-new-001", date: "2024-03-15", amount: "-100.00" },
    ];
    const matchRow = { id: "tx-mirror-001" };
    const { db, updateSet } = makeMockDb(newRows, matchRow);

    await detectTransfers(USER_ID, ACCOUNT_ID, ["tx-new-001"], db);

    // update().set() should have been called once to flag both transactions
    expect(updateSet).toHaveBeenCalledOnce();
    expect(updateSet).toHaveBeenCalledWith({
      isTransfer: true,
      category: null,
    });
  });

  it("does not call update when no mirror transaction is found", async () => {
    const newRows = [
      { id: "tx-new-002", date: "2024-03-15", amount: "-50.00" },
    ];
    const { db, updateSet } = makeMockDb(newRows, undefined);

    await detectTransfers(USER_ID, ACCOUNT_ID, ["tx-new-002"], db);

    expect(updateSet).not.toHaveBeenCalled();
  });

  it("processes multiple new rows — flags each that has a mirror", async () => {
    // Two new rows: first has a mirror, second does not
    const newRows = [
      { id: "tx-new-001", date: "2024-03-15", amount: "-100.00" },
      { id: "tx-new-002", date: "2024-03-16", amount: "-75.00" },
    ];

    let mirrorCallCount = 0;
    const updateSet = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    });

    let selectCallCount = 0;
    const db = {
      select: vi.fn().mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(newRows),
            }),
          };
        }
        mirrorCallCount++;
        // First mirror lookup: match found; second: no match
        const match = mirrorCallCount === 1 ? [{ id: "tx-mirror-001" }] : [];
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(match),
            }),
          }),
        };
      }),
      update: vi.fn().mockReturnValue({ set: updateSet }),
    } as unknown as Parameters<typeof detectTransfers>[3];

    await detectTransfers(
      USER_ID,
      ACCOUNT_ID,
      ["tx-new-001", "tx-new-002"],
      db,
    );

    // Only one update — for the first row that had a mirror
    expect(updateSet).toHaveBeenCalledOnce();
  });

  it("skips already-flagged rows — isTransfer filter in first query", async () => {
    // The DB mock returns no rows (all were already flagged — filtered out by the query)
    const { db, updateSet } = makeMockDb([]);

    await detectTransfers(USER_ID, ACCOUNT_ID, ["tx-already-flagged"], db);

    expect(updateSet).not.toHaveBeenCalled();
  });
});
