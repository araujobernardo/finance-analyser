import { describe, it, expect, beforeEach, vi } from "vitest";
import { buildFinanceContext } from "./claudeChat";

// Mock storage so tests don't touch real localStorage
vi.mock("./storage", () => ({
  getStoredMonths: vi.fn(),
  loadTransactions: vi.fn(),
}));

import { getStoredMonths, loadTransactions } from "./storage";
const mockGetMonths = getStoredMonths as ReturnType<typeof vi.fn>;
const mockLoad = loadTransactions as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("buildFinanceContext", () => {
  it("returns a no-data message when no months are stored", () => {
    mockGetMonths.mockReturnValue([]);
    expect(buildFinanceContext()).toMatch(/not uploaded any financial data/i);
  });

  it("includes month label in the context", () => {
    mockGetMonths.mockReturnValue(["2025-03"]);
    mockLoad.mockReturnValue({
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
    mockGetMonths.mockReturnValue(["2025-03"]);
    mockLoad.mockReturnValue({
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
    mockGetMonths.mockReturnValue(["2025-03"]);
    mockLoad.mockReturnValue({
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

  it("handles multiple months", () => {
    mockGetMonths.mockReturnValue(["2025-02", "2025-03"]);
    mockLoad.mockImplementation((monthKey: string) => ({
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
});
