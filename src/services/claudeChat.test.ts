import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { buildFinanceContext, ALL_ACCOUNTS_ID } from "./claudeChat";
import * as storage from "./storage";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockGetAccounts: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockGetAccountMonths: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockGetTransactions: any;

beforeEach(() => {
  mockGetAccounts = vi.spyOn(storage, "getAccounts").mockReturnValue([]);
  mockGetAccountMonths = vi
    .spyOn(storage, "getAccountMonths")
    .mockReturnValue([]);
  mockGetTransactions = vi.spyOn(storage, "getTransactions").mockReturnValue({
    transactions: [],
  });
});

afterEach(() => {
  vi.restoreAllMocks();
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
    mockGetTransactions.mockImplementation(
      (_accountId: string, monthKey: string) => ({
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
      }),
    );
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
    mockGetAccountMonths.mockImplementation((accountId: string) => {
      if (accountId === "acc1") return ["2025-03"];
      if (accountId === "acc2") return ["2025-03"];
      return [];
    });
    mockGetTransactions.mockImplementation((accountId: string) => {
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
    mockGetAccountMonths.mockImplementation((accountId: string) => {
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

describe("buildFinanceContext — multi-account selection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const twoAccounts = [
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
  ];

  function setupTwoAccounts() {
    mockGetAccounts.mockReturnValue(twoAccounts);
    mockGetAccountMonths.mockImplementation((accountId: string) => {
      if (accountId === "acc1") return ["2025-03"];
      if (accountId === "acc2") return ["2025-03"];
      return [];
    });
    mockGetTransactions.mockImplementation((accountId: string) => {
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
          { date: new Date("2025-03-01"), description: "Salary", amount: 3000 },
          {
            date: new Date("2025-03-05"),
            description: "Rent",
            amount: -1200,
            category: "Housing",
          },
        ],
      };
    });
  }

  it("when activeAccountId is 'all', includes data from all accounts", () => {
    setupTwoAccounts();
    const ctx = buildFinanceContext(ALL_ACCOUNTS_ID);
    expect(ctx).toContain("Savings Account");
    expect(ctx).toContain("Everyday Spending");
  });

  it("when activeAccountId is 'all', states the number of accounts and their names", () => {
    setupTwoAccounts();
    const ctx = buildFinanceContext(ALL_ACCOUNTS_ID);
    expect(ctx).toContain("2 accounts");
    expect(ctx).toContain("Savings Account");
    expect(ctx).toContain("Everyday Spending");
  });

  it("when activeAccountId is a specific account, includes only that account's data", () => {
    setupTwoAccounts();
    const ctx = buildFinanceContext("acc2");
    expect(ctx).toContain("Everyday Spending");
    expect(ctx).not.toContain("Savings Account");
  });

  it("when activeAccountId is a specific account, excludes other accounts' transactions", () => {
    setupTwoAccounts();
    // acc1 has income of $1000 only; acc2 has $3000 income
    const ctx = buildFinanceContext("acc1");
    expect(ctx).toContain("$1000.00");
    expect(ctx).not.toContain("$3000.00");
  });

  it("returns no-data message when specified single accountId does not exist", () => {
    mockGetAccounts.mockReturnValue(twoAccounts);
    const ctx = buildFinanceContext("nonexistent");
    expect(ctx).toMatch(/not uploaded any financial data/i);
  });

  it("defaults to all-accounts behaviour when no argument is provided", () => {
    setupTwoAccounts();
    const ctx = buildFinanceContext();
    expect(ctx).toContain("Savings Account");
    expect(ctx).toContain("Everyday Spending");
  });

  it("appends a trimming note when context exceeds 80k tokens", () => {
    // Generate enough months and categories to breach the 80k-token limit.
    // Each month summary is ~200 chars; we need >320k chars total.
    // With 2 accounts × many months × 5 categories with long names: ~250 chars/month.
    // 320k / 250 ≈ 1280 months — use 700 months per account (2 accounts = 1400 entries).
    const manyMonths: string[] = [];
    for (let y = 1970; y <= 2028; y++) {
      for (let m = 1; m <= 12; m++) {
        manyMonths.push(`${y}-${String(m).padStart(2, "0")}`);
        if (manyMonths.length >= 700) break;
      }
      if (manyMonths.length >= 700) break;
    }

    // Each category name is padded to 60 chars to inflate context size
    const longCategoryName = "A".repeat(60);
    const transactions = [
      { date: new Date("2025-03-01"), description: "Salary", amount: 3000 },
      {
        date: new Date("2025-03-05"),
        description: "Shop",
        amount: -500,
        category: longCategoryName,
      },
      {
        date: new Date("2025-03-06"),
        description: "Shop",
        amount: -400,
        category: longCategoryName + "B",
      },
      {
        date: new Date("2025-03-07"),
        description: "Shop",
        amount: -300,
        category: longCategoryName + "C",
      },
      {
        date: new Date("2025-03-08"),
        description: "Shop",
        amount: -200,
        category: longCategoryName + "D",
      },
      {
        date: new Date("2025-03-09"),
        description: "Shop",
        amount: -100,
        category: longCategoryName + "E",
      },
    ];

    mockGetAccounts.mockReturnValue(twoAccounts);
    mockGetAccountMonths.mockReturnValue(manyMonths);
    mockGetTransactions.mockReturnValue({ transactions });

    const ctx = buildFinanceContext(ALL_ACCOUNTS_ID);
    // Should contain a note about trimming
    expect(ctx).toContain("trimmed to the most recent 3 months");
  });
});
