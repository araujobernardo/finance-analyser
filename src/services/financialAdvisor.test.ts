// Tests for financialAdvisor.ts — FA-AI-001 / #945
// Covers: FINANCIAL_ADVISOR_SYSTEM_PROMPT, buildAdvisorPrompt, generateSummary

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  FINANCIAL_ADVISOR_SYSTEM_PROMPT,
  buildAdvisorPrompt,
  generateSummary,
} from "./financialAdvisor";
import type {
  ApiTransaction,
  ApiGoal,
  ApiBudget,
  ApiSnapshot,
  ApiFinancialSummary,
} from "../types/api";

// ── Mock @anthropic-ai/sdk ────────────────────────────────────────────────────
//
// vi.hoisted ensures mockCreate is available before any module is loaded.
// The vi.mock factory uses a class declaration (not an arrow function) so that
// `new Anthropic(...)` inside generateSummary works correctly.

const mockCreate = vi.hoisted(() => vi.fn());

vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = { create: mockCreate };
  },
}));

// ── Helper factories ──────────────────────────────────────────────────────────

function daysAgoISO(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function makeTxn(overrides: Partial<ApiTransaction> = {}): ApiTransaction {
  return {
    id: "txn-1",
    userId: "user-1",
    accountId: "acc-1",
    date: new Date().toISOString().slice(0, 10),
    amount: -50,
    description: "COUNTDOWN SUPERMARKET",
    category: "Groceries",
    isTransfer: false,
    isManualTransfer: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeGoal(overrides: Partial<ApiGoal> = {}): ApiGoal {
  return {
    id: "goal-1",
    userId: "user-1",
    name: "Emergency Fund",
    type: "savings_target",
    targetAmount: "10000",
    targetDate: "2026-12-31",
    linkedAccountId: null,
    categoryName: null,
    currentAmount: "3000",
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeBudget(overrides: Partial<ApiBudget> = {}): ApiBudget {
  return {
    id: "budget-1",
    categoryName: "Groceries",
    year: 2026,
    month: 7,
    limitAmount: 500,
    actualSpend: 350,
    remaining: 150,
    percentageUsed: 70,
    ...overrides,
  };
}

function makeSnapshot(overrides: Partial<ApiSnapshot> = {}): ApiSnapshot {
  return {
    id: "snap-1",
    userId: "user-1",
    totalAssets: "50000",
    totalLiabilities: "20000",
    netWorth: "30000",
    snapshotDate: "2026-07-01",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makePreviousSummary(
  overrides: Partial<ApiFinancialSummary> = {},
): ApiFinancialSummary {
  return {
    id: "sum-0",
    generatedAt: daysAgoISO(8),
    content: "Previous summary content here",
    previousSummaryId: null,
    ...overrides,
  };
}

// ── Setup / teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("VITE_ANTHROPIC_API_KEY", "test-key");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// ── FINANCIAL_ADVISOR_SYSTEM_PROMPT ──────────────────────────────────────────

describe("FINANCIAL_ADVISOR_SYSTEM_PROMPT", () => {
  it("is a non-empty string", () => {
    expect(typeof FINANCIAL_ADVISOR_SYSTEM_PROMPT).toBe("string");
    expect(FINANCIAL_ADVISOR_SYSTEM_PROMPT.length).toBeGreaterThan(100);
  });

  it("contains all three required output structure markers", () => {
    expect(FINANCIAL_ADVISOR_SYSTEM_PROMPT).toContain("TRANSACTION SUMMARY");
    expect(FINANCIAL_ADVISOR_SYSTEM_PROMPT).toContain("BEHAVIOURAL READ");
    expect(FINANCIAL_ADVISOR_SYSTEM_PROMPT).toContain("RECOMMENDED ACTIONS");
  });

  it("references NZD as the currency", () => {
    expect(FINANCIAL_ADVISOR_SYSTEM_PROMPT).toContain("NZD");
  });
});

// ── buildAdvisorPrompt — date header ─────────────────────────────────────────

describe("buildAdvisorPrompt — date header", () => {
  it("includes today's date in the header", () => {
    const today = new Date().toISOString().slice(0, 10);
    const prompt = buildAdvisorPrompt([], [], [], null, null);
    expect(prompt).toContain(`[Current date: ${today}]`);
  });
});

// ── buildAdvisorPrompt — transactions ────────────────────────────────────────

describe("buildAdvisorPrompt — transactions section", () => {
  it("includes a transaction from the last 90 days", () => {
    const txn = makeTxn({ description: "PETROL STATION", amount: -80 });
    const prompt = buildAdvisorPrompt([txn], [], [], null, null);
    expect(prompt).toContain("PETROL STATION");
  });

  it("excludes transactions older than 90 days", () => {
    const oldDate = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const txn = makeTxn({ date: oldDate, description: "VERY OLD MERCHANT" });
    const prompt = buildAdvisorPrompt([txn], [], [], null, null);
    expect(prompt).not.toContain("VERY OLD MERCHANT");
    expect(prompt).toContain("No transactions in the last 90 days.");
  });

  it("excludes bank transfers (isTransfer=true)", () => {
    const txn = makeTxn({ description: "BANK TRANSFER OUT", isTransfer: true });
    const prompt = buildAdvisorPrompt([txn], [], [], null, null);
    expect(prompt).not.toContain("BANK TRANSFER OUT");
  });

  it("excludes manual transfers (isManualTransfer=true)", () => {
    const txn = makeTxn({
      description: "MANUAL TRANSFER",
      isManualTransfer: true,
    });
    const prompt = buildAdvisorPrompt([txn], [], [], null, null);
    expect(prompt).not.toContain("MANUAL TRANSFER");
  });

  it("shows the empty-state message when all transactions are excluded", () => {
    const prompt = buildAdvisorPrompt([], [], [], null, null);
    expect(prompt).toContain("No transactions in the last 90 days.");
  });

  it("formats negative amounts with a minus sign prefix", () => {
    const txn = makeTxn({ amount: -150.5, description: "CAFE" });
    const prompt = buildAdvisorPrompt([txn], [], [], null, null);
    expect(prompt).toContain("-$150.50");
  });

  it("formats positive amounts with a plus sign prefix", () => {
    const txn = makeTxn({ amount: 3500, description: "SALARY" });
    const prompt = buildAdvisorPrompt([txn], [], [], null, null);
    expect(prompt).toContain("+$3,500.00");
  });

  it("falls back to 'Uncategorised' when category is null", () => {
    const txn = makeTxn({ category: null });
    const prompt = buildAdvisorPrompt([txn], [], [], null, null);
    expect(prompt).toContain("Uncategorised");
  });
});

// ── buildAdvisorPrompt — goals ───────────────────────────────────────────────

describe("buildAdvisorPrompt — goals section", () => {
  it("includes active goal name and target amount", () => {
    const goal = makeGoal({ name: "Emergency Fund", targetAmount: "10000" });
    const prompt = buildAdvisorPrompt([], [goal], [], null, null);
    expect(prompt).toContain("Emergency Fund");
    expect(prompt).toContain("$10,000.00");
  });

  it("includes the target date when present", () => {
    const goal = makeGoal({ targetDate: "2026-12-31" });
    const prompt = buildAdvisorPrompt([], [goal], [], null, null);
    expect(prompt).toContain("2026-12-31");
  });

  it("excludes non-active goals", () => {
    const achieved = makeGoal({ name: "Old Debt Goal", status: "achieved" });
    const abandoned = makeGoal({ name: "Dream Holiday", status: "abandoned" });
    const prompt = buildAdvisorPrompt(
      [],
      [achieved, abandoned],
      [],
      null,
      null,
    );
    expect(prompt).not.toContain("Old Debt Goal");
    expect(prompt).not.toContain("Dream Holiday");
    expect(prompt).toContain("No active goals set.");
  });

  it("shows 'No active goals set.' when goals array is empty", () => {
    const prompt = buildAdvisorPrompt([], [], [], null, null);
    expect(prompt).toContain("No active goals set.");
  });

  it("shows 'unknown' for currentAmount when it is null", () => {
    const goal = makeGoal({ currentAmount: null });
    const prompt = buildAdvisorPrompt([], [goal], [], null, null);
    expect(prompt).toContain("unknown");
  });
});

// ── buildAdvisorPrompt — budgets ─────────────────────────────────────────────

describe("buildAdvisorPrompt — budgets section", () => {
  it("includes budget category name, limit, spend, and percentage", () => {
    const budget = makeBudget({
      categoryName: "Dining",
      limitAmount: 200,
      actualSpend: 180,
      percentageUsed: 90,
    });
    const prompt = buildAdvisorPrompt([], [], [budget], null, null);
    expect(prompt).toContain("Dining");
    expect(prompt).toContain("$200.00");
    expect(prompt).toContain("$180.00");
    expect(prompt).toContain("90%");
  });

  it("shows 'No budget limits set.' when budgets array is empty", () => {
    const prompt = buildAdvisorPrompt([], [], [], null, null);
    expect(prompt).toContain("No budget limits set.");
  });
});

// ── buildAdvisorPrompt — net worth ───────────────────────────────────────────

describe("buildAdvisorPrompt — net worth section", () => {
  it("includes assets, liabilities, and net worth from the snapshot", () => {
    const snapshot = makeSnapshot({
      totalAssets: "50000",
      totalLiabilities: "20000",
      netWorth: "30000",
    });
    const prompt = buildAdvisorPrompt([], [], [], snapshot, null);
    expect(prompt).toContain("$50,000.00");
    expect(prompt).toContain("$20,000.00");
    expect(prompt).toContain("$30,000.00");
  });

  it("shows 'No net worth snapshot available.' when snapshot is null", () => {
    const prompt = buildAdvisorPrompt([], [], [], null, null);
    expect(prompt).toContain("No net worth snapshot available.");
  });
});

// ── buildAdvisorPrompt — previous summary ────────────────────────────────────

describe("buildAdvisorPrompt — previous summary section", () => {
  it("includes the previous summary content when provided", () => {
    const prev = makePreviousSummary({
      content: "Previous summary content here",
    });
    const prompt = buildAdvisorPrompt([], [], [], null, prev);
    expect(prompt).toContain("PREVIOUS SUMMARY");
    expect(prompt).toContain("Previous summary content here");
  });

  it("includes the date of the previous summary", () => {
    const generatedAt = "2026-06-26T12:00:00.000Z";
    const prev = makePreviousSummary({ generatedAt });
    const prompt = buildAdvisorPrompt([], [], [], null, prev);
    expect(prompt).toContain("PREVIOUS SUMMARY (2026-06-26)");
  });

  it("shows 'No previous summary available.' when previousSummary is null", () => {
    const prompt = buildAdvisorPrompt([], [], [], null, null);
    expect(prompt).toContain("No previous summary available.");
  });
});

// ── generateSummary — happy path ─────────────────────────────────────────────

describe("generateSummary — happy path", () => {
  it("returns the text from the first content block", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "Your financial summary." }],
    });

    const result = await generateSummary("test context prompt");
    expect(result).toBe("Your financial summary.");
  });

  it("calls the Anthropic API with model claude-haiku-4-5-20251001", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "ok" }],
    });

    await generateSummary("test");

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: "claude-haiku-4-5-20251001" }),
    );
  });

  it("passes the FINANCIAL_ADVISOR_SYSTEM_PROMPT as the system parameter", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "ok" }],
    });

    await generateSummary("test");

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ system: FINANCIAL_ADVISOR_SYSTEM_PROMPT }),
    );
  });

  it("passes the contextPrompt as the user message content", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "ok" }],
    });

    await generateSummary("my-specific-prompt");

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [{ role: "user", content: "my-specific-prompt" }],
      }),
    );
  });
});

// ── generateSummary — error paths ────────────────────────────────────────────

describe("generateSummary — error paths", () => {
  it("throws when VITE_ANTHROPIC_API_KEY is not set", async () => {
    vi.stubEnv("VITE_ANTHROPIC_API_KEY", "");

    await expect(generateSummary("test")).rejects.toThrow(
      "VITE_ANTHROPIC_API_KEY is not set.",
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("throws when the API returns an empty content array", async () => {
    mockCreate.mockResolvedValue({ content: [] });

    await expect(generateSummary("test")).rejects.toThrow(
      "Unexpected response format from Anthropic API.",
    );
  });

  it("throws when the first content block is not a text block", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "tool_use", id: "x", name: "some_tool", input: {} }],
    });

    await expect(generateSummary("test")).rejects.toThrow(
      "Unexpected response format from Anthropic API.",
    );
  });

  it("propagates network / API errors", async () => {
    mockCreate.mockRejectedValue(new Error("503 Service Unavailable"));

    await expect(generateSummary("test")).rejects.toThrow(
      "503 Service Unavailable",
    );
  });
});
