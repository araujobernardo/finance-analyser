import { describe, it, expect, vi, beforeEach } from "vitest";
import { categoriseTransactions, CATEGORIES } from "./categorisation";
import type { Transaction } from "../utils/csvParser";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTransaction(description: string, amount = -10): Transaction {
  return { date: new Date("2024-03-15"), description, amount };
}

function mockFetchSuccess(categories: string[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: "text", text: JSON.stringify(categories) }],
      }),
    }),
  );
}

function mockFetchFailure(status = 500) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      status,
      json: async () => ({}),
    }),
  );
}

function mockFetchNetworkError() {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("categoriseTransactions", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    // Provide a fake API key so the service doesn't short-circuit
    vi.stubEnv("VITE_CLAUDE_API_KEY", "test-key");
  });

  // Happy path ─────────────────────────────────────────────────────────────────

  it("returns transactions with categories from the API", async () => {
    const txns = [
      makeTransaction("COUNTDOWN SUPERMARKET"),
      makeTransaction("UBER EATS"),
    ];
    mockFetchSuccess(["Groceries", "Dining"]);

    const result = await categoriseTransactions(txns);

    expect(result[0].category).toBe("Groceries");
    expect(result[1].category).toBe("Dining");
  });

  it("preserves all original transaction fields", async () => {
    const txn = { date: new Date("2024-06-01"), description: "PETROL STATION", amount: -85.5, balance: 200 };
    mockFetchSuccess(["Transport"]);

    const [result] = await categoriseTransactions([txn]);

    expect(result.date).toEqual(txn.date);
    expect(result.description).toBe("PETROL STATION");
    expect(result.amount).toBe(-85.5);
    expect(result.balance).toBe(200);
    expect(result.category).toBe("Transport");
  });

  it("handles an empty transaction list without calling fetch", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await categoriseTransactions([]);

    expect(result).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("only accepts categories from the allowed list", async () => {
    const txns = [makeTransaction("SOMETHING"), makeTransaction("ELSE")];
    // API returns one valid and one invalid category
    mockFetchSuccess(["Groceries", "InvalidCategory"]);

    const result = await categoriseTransactions(txns);

    expect(result[0].category).toBe("Groceries");
    expect(result[1].category).toBe("Uncategorised");
  });

  it("sends descriptions truncated to 200 characters", async () => {
    const longDesc = "A".repeat(300);
    const txns = [makeTransaction(longDesc)];
    let capturedBody: string | null = null;

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
        capturedBody = init.body as string;
        return { ok: true, json: async () => ({ content: [{ type: "text", text: '["Other"]' }] }) };
      }),
    );

    await categoriseTransactions(txns);

    expect(capturedBody).not.toBeNull();
    const body = JSON.parse(capturedBody!);
    expect(body.messages[0].content).toContain("A".repeat(200));
    expect(body.messages[0].content).not.toContain("A".repeat(201));
  });

  // No API key ──────────────────────────────────────────────────────────────────

  it("falls back to Uncategorised when VITE_CLAUDE_API_KEY is not set", async () => {
    vi.stubEnv("VITE_CLAUDE_API_KEY", "");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const txns = [makeTransaction("SUPERMARKET"), makeTransaction("PETROL")];
    const result = await categoriseTransactions(txns);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.every((t) => t.category === "Uncategorised")).toBe(true);
  });

  // API error paths ─────────────────────────────────────────────────────────────

  it("falls back to Uncategorised on a non-OK API response", async () => {
    mockFetchFailure(429);

    const txns = [makeTransaction("CAFE"), makeTransaction("TAXI")];
    const result = await categoriseTransactions(txns);

    expect(result.every((t) => t.category === "Uncategorised")).toBe(true);
  });

  it("falls back to Uncategorised on a network error", async () => {
    mockFetchNetworkError();

    const txns = [makeTransaction("SHOP")];
    const result = await categoriseTransactions(txns);

    expect(result[0].category).toBe("Uncategorised");
  });

  it("falls back to Uncategorised when the API returns malformed JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ content: [{ type: "text", text: "not json at all" }] }),
      }),
    );

    const txns = [makeTransaction("UNKNOWN")];
    const result = await categoriseTransactions(txns);

    expect(result[0].category).toBe("Uncategorised");
  });

  it("falls back to Uncategorised when the API returns a non-array", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ content: [{ type: "text", text: '"Groceries"' }] }),
      }),
    );

    const txns = [makeTransaction("SUPERMARKET")];
    const result = await categoriseTransactions(txns);

    expect(result[0].category).toBe("Uncategorised");
  });

  // Batching ────────────────────────────────────────────────────────────────────

  it("splits large sets into batches of 50 and makes multiple API calls", async () => {
    const txns = Array.from({ length: 110 }, (_, i) => makeTransaction(`Shop ${i}`));
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: "text", text: JSON.stringify(Array(50).fill("Other")) }],
      }),
    });
    vi.stubGlobal("fetch", fetchSpy);

    const result = await categoriseTransactions(txns);

    // 110 txns → batches of 50, 50, 10 → 3 calls
    expect(fetchSpy).toHaveBeenCalledTimes(3);
    expect(result).toHaveLength(110);
    expect(result.every((t) => t.category === "Other")).toBe(true);
  });

  // CATEGORIES export ───────────────────────────────────────────────────────────

  it("exports a non-empty CATEGORIES list containing known categories", () => {
    expect(CATEGORIES).toContain("Groceries");
    expect(CATEGORIES).toContain("Transport");
    expect(CATEGORIES).not.toContain("Uncategorised");
    expect(CATEGORIES.length).toBeGreaterThan(0);
  });
});
