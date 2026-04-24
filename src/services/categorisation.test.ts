import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  categoriseTransactions,
  CATEGORIES,
  _clientFactory,
} from "./categorisation";
import type { Transaction } from "../utils/csvParser";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTransaction(description: string, amount = -10): Transaction {
  return { date: new Date("2024-03-15"), description, amount };
}

// ── Mock setup ────────────────────────────────────────────────────────────────

const mockCreate = vi.fn();

function mockApiSuccess(categories: string[]) {
  mockCreate.mockResolvedValue({
    content: [{ type: "text", text: JSON.stringify(categories) }],
  });
}

function mockApiFailure() {
  mockCreate.mockRejectedValue(new Error("API error"));
}

const originalCreate = _clientFactory.create;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("VITE_ANTHROPIC_API_KEY", "test-key");
  localStorage.clear();
  // Replace the client factory so no real HTTP calls are made
  _clientFactory.create = () => ({ messages: { create: mockCreate } });
});

afterEach(() => {
  vi.unstubAllEnvs();
  // Restore the real factory
  _clientFactory.create = originalCreate;
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("categoriseTransactions", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // Happy path ─────────────────────────────────────────────────────────────────

  it("returns transactions with categories from the API", async () => {
    const txns = [
      makeTransaction("COUNTDOWN SUPERMARKET"),
      makeTransaction("UBER EATS"),
    ];
    mockApiSuccess(["Groceries", "Dining"]);

    const result = await categoriseTransactions(txns);

    expect(result[0].category).toBe("Groceries");
    expect(result[1].category).toBe("Dining");
  });

  it("preserves all original transaction fields", async () => {
    const txn = {
      date: new Date("2024-06-01"),
      description: "PETROL STATION",
      amount: -85.5,
      balance: 200,
    };
    mockApiSuccess(["Transport"]);

    const [result] = await categoriseTransactions([txn]);

    expect(result.date).toEqual(txn.date);
    expect(result.description).toBe("PETROL STATION");
    expect(result.amount).toBe(-85.5);
    expect(result.balance).toBe(200);
    expect(result.category).toBe("Transport");
  });

  it("handles an empty transaction list without calling the API", async () => {
    const result = await categoriseTransactions([]);

    expect(result).toEqual([]);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("only accepts categories from the allowed list", async () => {
    const txns = [makeTransaction("SOMETHING"), makeTransaction("ELSE")];
    mockApiSuccess(["Groceries", "InvalidCategory"]);

    const result = await categoriseTransactions(txns);

    expect(result[0].category).toBe("Groceries");
    expect(result[1].category).toBe("Uncategorised");
  });

  it("sends descriptions truncated to 200 characters", async () => {
    const longDesc = "A".repeat(300);
    const txns = [makeTransaction(longDesc)];
    mockApiSuccess(["Other"]);

    await categoriseTransactions(txns);

    const prompt = mockCreate.mock.calls[0][0].messages[0].content as string;
    expect(prompt).toContain("A".repeat(200));
    expect(prompt).not.toContain("A".repeat(201));
  });

  // No API key ──────────────────────────────────────────────────────────────────

  it("falls back to Uncategorised when VITE_ANTHROPIC_API_KEY is not set", async () => {
    vi.stubEnv("VITE_ANTHROPIC_API_KEY", "");

    const txns = [makeTransaction("SUPERMARKET"), makeTransaction("PETROL")];
    const result = await categoriseTransactions(txns);

    expect(mockCreate).not.toHaveBeenCalled();
    expect(result.every((t) => t.category === "Uncategorised")).toBe(true);
  });

  // API error paths ─────────────────────────────────────────────────────────────

  it("falls back to Uncategorised on an API error", async () => {
    mockApiFailure();

    const txns = [makeTransaction("CAFE"), makeTransaction("TAXI")];
    const result = await categoriseTransactions(txns);

    expect(result.every((t) => t.category === "Uncategorised")).toBe(true);
  });

  it("falls back to Uncategorised when the API returns malformed JSON", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "not json at all" }],
    });

    const txns = [makeTransaction("UNKNOWN")];
    const result = await categoriseTransactions(txns);

    expect(result[0].category).toBe("Uncategorised");
  });

  it("falls back to Uncategorised when the API returns a non-array", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: '"Groceries"' }],
    });

    const txns = [makeTransaction("SUPERMARKET")];
    const result = await categoriseTransactions(txns);

    expect(result[0].category).toBe("Uncategorised");
  });

  // Batching ────────────────────────────────────────────────────────────────────

  it("splits large sets into batches of 50 and makes multiple API calls", async () => {
    mockCreate.mockResolvedValue({
      content: [
        { type: "text", text: JSON.stringify(Array(50).fill("Other")) },
      ],
    });

    const txns = Array.from({ length: 110 }, (_, i) =>
      makeTransaction(`Shop ${i}`),
    );

    const result = await categoriseTransactions(txns);

    // 110 txns → batches of 50, 50, 10 → 3 calls
    expect(mockCreate).toHaveBeenCalledTimes(3);
    expect(result).toHaveLength(110);
    expect(result.every((t) => t.category === "Other")).toBe(true);
  });

  // Preserves existing categories ───────────────────────────────────────────────

  it("does not overwrite a transaction that already has a category", async () => {
    const txns = [
      makeTransaction("COUNTDOWN", -50),
      { ...makeTransaction("PETROL", -80), category: "Transport" },
    ];
    mockApiSuccess(["Groceries"]);

    const result = await categoriseTransactions(txns);

    expect(result[0].category).toBe("Groceries");
    expect(result[1].category).toBe("Transport");
  });

  it("skips the API entirely when all transactions already have categories", async () => {
    const txns = [
      { ...makeTransaction("A"), category: "Groceries" },
      { ...makeTransaction("B"), category: "Dining" },
    ];

    const result = await categoriseTransactions(txns);

    expect(mockCreate).not.toHaveBeenCalled();
    expect(result[0].category).toBe("Groceries");
    expect(result[1].category).toBe("Dining");
  });

  it("falls back to Uncategorised only for unset categories, preserving set ones", async () => {
    vi.stubEnv("VITE_ANTHROPIC_API_KEY", "");
    const txns = [
      makeTransaction("A"),
      { ...makeTransaction("B"), category: "Healthcare" },
    ];

    const result = await categoriseTransactions(txns);

    expect(result[0].category).toBe("Uncategorised");
    expect(result[1].category).toBe("Healthcare");
  });

  // Category rules integration ──────────────────────────────────────────────────

  it("applies stored category rules before calling the API", async () => {
    localStorage.setItem(
      "finance_analyser_category_rules",
      JSON.stringify({ "countdown supermarket": "Groceries" }),
    );
    mockApiSuccess(["Other"]);

    const txns = [
      makeTransaction("COUNTDOWN SUPERMARKET"),
      makeTransaction("UNKNOWN MERCHANT"),
    ];

    const result = await categoriseTransactions(txns);

    expect(result[0].category).toBe("Groceries");
    expect(result[1].category).toBe("Other");
    // API called once with only the unmatched transaction
    expect(mockCreate).toHaveBeenCalledTimes(1);
    const prompt = mockCreate.mock.calls[0][0].messages[0].content as string;
    expect(prompt).toContain("UNKNOWN MERCHANT");
    expect(prompt).not.toContain("COUNTDOWN SUPERMARKET");
  });

  it("rule wins over existing category when rule exists", async () => {
    localStorage.setItem(
      "finance_analyser_category_rules",
      JSON.stringify({ "petrol station": "Transport" }),
    );

    const txns = [makeTransaction("PETROL STATION")];
    const result = await categoriseTransactions(txns);

    expect(result[0].category).toBe("Transport");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  // CATEGORIES export ───────────────────────────────────────────────────────────

  it("exports the CATEGORIES constant as a readonly array", () => {
    expect(Array.isArray(CATEGORIES)).toBe(true);
    expect(CATEGORIES).toContain("Groceries");
    expect(CATEGORIES).toContain("Transport");
    expect(CATEGORIES).toContain("Income");
  });
});
