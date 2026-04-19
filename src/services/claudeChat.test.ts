import { describe, it, expect, beforeEach, vi } from "vitest";
import { buildFinanceContext } from "./claudeChat";

// Mock storage so tests don't touch real localStorage
vi.mock("./storage", () => ({
  getAccounts: vi.fn(),
  getAccountMonths: vi.fn(),
  getTransactions: vi.fn(),
}));

import { getAccounts, getAccountMonths, getTransactions } from "./storage";
const mockGetAccounts = vi.mocked(getAccounts);
const mockGetAccountMonths = vi.mocked(getAccountMonths);
const mockGetTransactions = vi.mocked(getTransactions);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("buildFinanceContext", () => {
  it("returns a no-data message when no accounts exist", () => {
    mockGetAccounts.mockReturnValue([]);
    expect(buildFinanceContext()).toMatch(/not uploaded any financial data/i);
  });

  it("returns a no-data message when accounts exist but have no transactions", () => {
    mockGetAccounts.mockReturnValue([
      {
        id: "acc1",
        name: "My Account",
        colour: "#6366f1",
        createdAt: "2026-01-01T00:00:00Z",
      },
    ]);
    mockGetAccountMonths.mockReturnValue([]);
    expect(buildFinanceContext()).toMatch(/not uploaded any financial data/i);
  });

  it("includes account name as section header", () => {
    mockGetAccounts.mockReturnValue([
      {
        id: "acc1",
        name: "Everyday Spending",
        colour: "#6366f1",
        createdAt: "2026-01-01T00:00:00Z",
      },
    ]);
    mockGetAccountMonths.mockReturnValue(["2025-03"]);
    mockGetTransactions.mockReturnValue({
      transactions: [
        { date: new Date("2025-03-01"), description: "Salary", amount: 3000 },
      ],
    });
    const ctx = buildFinanceContext();
    expect(ctx).toContain("Everyday Spending");
  });

  it("includes month label in the context", () => {
    mockGetAccounts.mockReturnValue([
      {
        id: "acc1",
        name: "My Account",
        colour: "#6366f1",
        createdAt: "2026-01-01T00:00:00Z",
      },
    ]);
    mockGetAccountMonths.mockReturnValue(["2025-03"]);
    mockGetTransactions.mockReturnValue({
      transactions: [
        { date: new Date("2025-03-01"), description: "Salary", amount: 3000 },
        {
          date: new Date("2025-03-05"),
          description: "Groceries",
          amount: -200,
          category: "Food",
        },
      ],
    });
    const ctx = buildFinanceContext();
    expect(ctx).toContain("March 2025");
  });

  it("includes income, expenses and net savings", () => {
    mockGetAccounts.mockReturnValue([
      {
        id: "acc1",
        name: "My Account",
        colour: "#6366f1",
        createdAt: "2026-01-01T00:00:00Z",
      },
    ]);
    mockGetAccountMonths.mockReturnValue(["2025-03"]);
    mockGetTransactions.mockReturnValue({
      transactions: [
        { date: new Date("2025-03-01"), description: "Salary", amount: 3000 },
        {
          date: new Date("2025-03-05"),
          description: "Rent",
          amount: -1000,
          category: "Housing",
        },
        {
          date: new Date("2025-03-10"),
          description: "Food",
          amount: -200,
          category: "Food",
        },
      ],
    });
    const ctx = buildFinanceContext();
    expect(ctx).toContain("$3000.00");
    expect(ctx).toContain("$1200.00");
    expect(ctx).toContain("$1800.00");
  });

  it("lists top spending categories", () => {
    mockGetAccounts.mockReturnValue([
      {
        id: "acc1",
        name: "My Account",
        colour: "#6366f1",
        createdAt: "2026-01-01T00:00:00Z",
      },
    ]);
    mockGetAccountMonths.mockReturnValue(["2025-03"]);
    mockGetTransactions.mockReturnValue({
      transactions: [
        { date: new Date("2025-03-01"), description: "Salary", amount: 5000 },
        {
          date: new Date("2025-03-05"),
          description: "Rent",
          amount: -1500,
          category: "Housing",
        },
        {
          date: new Date("2025-03-10"),
          description: "Groceries",
          amount: -300,
          category: "Food",
        },
      ],
    });
    const ctx = buildFinanceContext();
    expect(ctx).toContain("Housing");
    expect(ctx).toContain("Food");
  });

  it("handles multiple months for a single account", () => {
    mockGetAccounts.mockReturnValue([
      {
        id: "acc1",
        name: "My Account",
        colour: "#6366f1",
        createdAt: "2026-01-01T00:00:00Z",
      },
    ]);
    mockGetAccountMonths.mockReturnValue(["2025-02", "2025-03"]);
    mockGetTransactions.mockImplementation((_accountId, monthKey) => ({
      transactions: [
        {
          date: new Date(`${monthKey}-01`),
          description: "Salary",
          amount: 3000,
        },
        {
          date: new Date(`${monthKey}-05`),
          description: "Rent",
          amount: -1000,
          category: "Housing",
        },
      ],
    }));
    const ctx = buildFinanceContext();
    expect(ctx).toContain("February 2025");
    expect(ctx).toContain("March 2025");
  });

  it("includes data from two accounts with their names as headers", () => {
    mockGetAccounts.mockReturnValue([
      {
        id: "acc1",
        name: "Savings Account",
        colour: "#6366f1",
        createdAt: "2026-01-01T00:00:00Z",
      },
      {
        id: "acc2",
        name: "Everyday Spending",
        colour: "#22c55e",
        createdAt: "2026-01-02T00:00:00Z",
      },
    ]);
    mockGetAccountMonths.mockImplementation((accountId) => {
      if (accountId === "acc1") return ["2025-03"];
      if (accountId === "acc2") return ["2025-03"];
      return [];
    });
    mockGetTransactions.mockImplementation((accountId) => {
      if (accountId === "acc1") {
        return {
          transactions: [
            {
              date: new Date("2025-03-01"),
              description: "Transfer",
              amount: 1000,
            },
          ],
        };
      }
      return {
        transactions: [
          {
            date: new Date("2025-03-01"),
            description: "Salary",
            amount: 3000,
          },
          {
            date: new Date("2025-03-05"),
            description: "Rent",
            amount: -1200,
            category: "Housing",
          },
        ],
      };
    });
    const ctx = buildFinanceContext();
    expect(ctx).toContain("Savings Account");
    expect(ctx).toContain("Everyday Spending");
    expect(ctx).toContain("$3000.00"); // acc2 income
    expect(ctx).toContain("$1200.00"); // acc2 expenses
  });

  it("skips accounts with no months and still shows others", () => {
    mockGetAccounts.mockReturnValue([
      {
        id: "acc1",
        name: "Empty Account",
        colour: "#6366f1",
        createdAt: "2026-01-01T00:00:00Z",
      },
      {
        id: "acc2",
        name: "Active Account",
        colour: "#22c55e",
        createdAt: "2026-01-02T00:00:00Z",
      },
    ]);
    mockGetAccountMonths.mockImplementation((accountId) => {
      if (accountId === "acc1") return [];
      return ["2025-03"];
    });
    mockGetTransactions.mockReturnValue({
      transactions: [
        { date: new Date("2025-03-01"), description: "Salary", amount: 2000 },
      ],
    });
    const ctx = buildFinanceContext();
    expect(ctx).toContain("Active Account");
    expect(ctx).not.toContain("Empty Account");
  });
});
