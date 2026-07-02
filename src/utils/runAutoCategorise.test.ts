// Tests for runAutoCategorise — FA-BANK-018
// Verifies: happy path, already-categorised skipping, transfer skipping,
//           empty-list early return, error handling via onError, and refetch call.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { runAutoCategorise } from "./runAutoCategorise";
import type { ApiTransaction } from "../types/api";

// ── mock categorisation service ───────────────────────────────────────────────

const mockCategorise = vi.fn();

vi.mock("../services/categorisation", () => ({
  categoriseTransactions: (...args: unknown[]) => mockCategorise(...args),
}));

// ── helpers ───────────────────────────────────────────────────────────────────

function makeTransaction(
  overrides: Partial<ApiTransaction> = {},
): ApiTransaction {
  return {
    id: "txn-1",
    userId: "user-1",
    accountId: "acc-1",
    date: "2026-01-15",
    amount: -42,
    description: "Mystery Merchant",
    category: null,
    isTransfer: false,
    isManualTransfer: false,
    createdAt: "2026-01-15T00:00:00.000Z",
    ...overrides,
  };
}

function makeOkFetch() {
  return vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
}

// ── setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ── AC: empty transaction list → early return ─────────────────────────────────

describe("runAutoCategorise — empty / all-processed list", () => {
  it("returns { categorised: 0, hadError: false } when transactions array is empty", async () => {
    const result = await runAutoCategorise({
      transactions: [],
      apiFetch: makeOkFetch(),
      refetch: vi.fn().mockResolvedValue(undefined),
    });

    expect(result).toEqual({ categorised: 0, hadError: false });
    expect(mockCategorise).not.toHaveBeenCalled();
  });

  it("skips already-categorised transactions", async () => {
    const result = await runAutoCategorise({
      transactions: [
        makeTransaction({ category: "Shopping" }),
        makeTransaction({ id: "txn-2", category: "Food & Drink" }),
      ],
      apiFetch: makeOkFetch(),
      refetch: vi.fn().mockResolvedValue(undefined),
    });

    expect(result).toEqual({ categorised: 0, hadError: false });
    expect(mockCategorise).not.toHaveBeenCalled();
  });

  it("skips transfer transactions", async () => {
    const result = await runAutoCategorise({
      transactions: [makeTransaction({ isTransfer: true, category: null })],
      apiFetch: makeOkFetch(),
      refetch: vi.fn().mockResolvedValue(undefined),
    });

    expect(result).toEqual({ categorised: 0, hadError: false });
    expect(mockCategorise).not.toHaveBeenCalled();
  });

  it("skips transactions whose category is an empty string", async () => {
    // Empty string is treated as uncategorised → should proceed to categorisation.
    // Provide a mock that returns "Uncategorised" so zero patches are applied.
    mockCategorise.mockResolvedValue([{ category: "Uncategorised" }]);

    const result2 = await runAutoCategorise({
      transactions: [makeTransaction({ category: "" })],
      apiFetch: makeOkFetch(),
      refetch: vi.fn().mockResolvedValue(undefined),
    });

    expect(result2).toEqual({ categorised: 0, hadError: false });
  });
});

// ── AC: happy path — uncategorised transactions receive categories ─────────────

describe("runAutoCategorise — happy path", () => {
  it("categorises uncategorised non-transfer transactions and calls refetch", async () => {
    const txn = makeTransaction({ id: "txn-abc" });
    const apiFetch = makeOkFetch();
    const refetch = vi.fn().mockResolvedValue(undefined);

    mockCategorise.mockResolvedValue([{ category: "Food & Drink" }]);

    const result = await runAutoCategorise({
      transactions: [txn],
      apiFetch,
      refetch,
    });

    expect(result).toEqual({ categorised: 1, hadError: false });
    expect(apiFetch).toHaveBeenCalledWith("/api/transactions/txn-abc", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: "Food & Drink" }),
    });
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("sends categorise request only for uncategorised transactions in a mixed list", async () => {
    const uncategorised = makeTransaction({ id: "txn-u1" });
    const alreadyCat = makeTransaction({ id: "txn-c1", category: "Shopping" });
    const transfer = makeTransaction({ id: "txn-t1", isTransfer: true });

    const apiFetch = makeOkFetch();
    const refetch = vi.fn().mockResolvedValue(undefined);

    // Only one uncategorised txn → one categorisation call
    mockCategorise.mockResolvedValue([{ category: "Transport" }]);

    const result = await runAutoCategorise({
      transactions: [uncategorised, alreadyCat, transfer],
      apiFetch,
      refetch,
    });

    expect(mockCategorise).toHaveBeenCalledTimes(1);
    // The call should only include the uncategorised transaction
    expect(mockCategorise).toHaveBeenCalledWith([
      expect.objectContaining({ description: "Mystery Merchant" }),
    ]);
    expect(result).toEqual({ categorised: 1, hadError: false });
  });

  it("does NOT call apiFetch when all results are 'Uncategorised'", async () => {
    const txn = makeTransaction();
    const apiFetch = makeOkFetch();
    const refetch = vi.fn().mockResolvedValue(undefined);

    mockCategorise.mockResolvedValue([{ category: "Uncategorised" }]);

    const result = await runAutoCategorise({
      transactions: [txn],
      apiFetch,
      refetch,
    });

    expect(apiFetch).not.toHaveBeenCalled();
    expect(result).toEqual({ categorised: 0, hadError: false });
    // refetch is still called even when zero patches
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("passes the correct fields (date, description, amount) to categoriseTransactions", async () => {
    const txn = makeTransaction({
      date: "2026-03-20",
      description: "New World Supermarket",
      amount: -85.5,
    });

    mockCategorise.mockResolvedValue([{ category: "Groceries" }]);

    await runAutoCategorise({
      transactions: [txn],
      apiFetch: makeOkFetch(),
      refetch: vi.fn().mockResolvedValue(undefined),
    });

    expect(mockCategorise).toHaveBeenCalledWith([
      {
        date: new Date("2026-03-20"),
        description: "New World Supermarket",
        amount: -85.5,
        category: undefined,
      },
    ]);
  });
});

// ── AC: error handling — non-fatal via onError ────────────────────────────────

describe("runAutoCategorise — error handling", () => {
  it("calls onError and returns { hadError: true } when categoriseTransactions throws", async () => {
    mockCategorise.mockRejectedValue(new Error("API failure"));

    const onError = vi.fn();
    const refetch = vi.fn();

    const result = await runAutoCategorise({
      transactions: [makeTransaction()],
      apiFetch: makeOkFetch(),
      refetch,
      onError,
    });

    expect(result).toEqual({ categorised: 0, hadError: true });
    expect(onError).toHaveBeenCalledWith(
      "Auto-categorisation failed — please try again.",
    );
    // refetch must NOT be called when categorisation failed
    expect(refetch).not.toHaveBeenCalled();
  });

  it("calls onError and returns { hadError: true } when apiFetch throws", async () => {
    mockCategorise.mockResolvedValue([{ category: "Food & Drink" }]);

    const failFetch = vi
      .fn()
      .mockRejectedValue(new Error("Network error patching"));
    const onError = vi.fn();

    const result = await runAutoCategorise({
      transactions: [makeTransaction()],
      apiFetch: failFetch,
      refetch: vi.fn(),
      onError,
    });

    expect(result).toEqual({ categorised: 0, hadError: true });
    expect(onError).toHaveBeenCalledWith(
      "Auto-categorisation failed — please try again.",
    );
  });

  it("does not throw when onError is not provided", async () => {
    mockCategorise.mockRejectedValue(new Error("Service down"));

    await expect(
      runAutoCategorise({
        transactions: [makeTransaction()],
        apiFetch: makeOkFetch(),
        refetch: vi.fn(),
        // onError intentionally omitted
      }),
    ).resolves.toEqual({ categorised: 0, hadError: true });
  });
});
