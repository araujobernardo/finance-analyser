import { describe, it, expect } from "vitest";
import { buildCategoryRows } from "./categoryData";
import type { Transaction } from "./csvParser";

function tx(amount: number, category = "Food"): Transaction {
  return {
    date: new Date("2025-03-01"),
    description: "Test",
    amount,
    category,
  };
}

describe("buildCategoryRows", () => {
  it("returns empty array when no transactions", () => {
    expect(buildCategoryRows([])).toEqual([]);
  });

  it("returns empty array when only income transactions", () => {
    expect(buildCategoryRows([tx(100), tx(200)])).toEqual([]);
  });

  it("groups expenses by category", () => {
    const rows = buildCategoryRows([tx(-50, "Food"), tx(-30, "Transport")]);
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.category)).toContain("Food");
    expect(rows.map((r) => r.category)).toContain("Transport");
  });

  it("sums amounts per category", () => {
    const rows = buildCategoryRows([tx(-40, "Food"), tx(-60, "Food")]);
    expect(rows[0].total).toBe(100);
  });

  it("excludes income from totals", () => {
    const rows = buildCategoryRows([tx(-100, "Food"), tx(500, "Food")]);
    expect(rows[0].total).toBe(100);
  });

  it("computes percentage correctly", () => {
    const rows = buildCategoryRows([tx(-75, "Food"), tx(-25, "Transport")]);
    const food = rows.find((r) => r.category === "Food")!;
    expect(food.percentage).toBeCloseTo(75);
  });

  it("sorts by amount descending", () => {
    const rows = buildCategoryRows([tx(-20, "Transport"), tx(-80, "Food")]);
    expect(rows[0].category).toBe("Food");
    expect(rows[1].category).toBe("Transport");
  });

  it("puts Uncategorised last regardless of amount", () => {
    const rows = buildCategoryRows([
      tx(-200, "Uncategorised"),
      tx(-10, "Food"),
    ]);
    expect(rows[rows.length - 1].category).toBe("Uncategorised");
  });

  it("groups transactions without a category under Uncategorised", () => {
    const noCategory: Transaction = {
      date: new Date("2025-03-01"),
      description: "Mystery",
      amount: -40,
    };
    const rows = buildCategoryRows([noCategory]);
    expect(rows[0].category).toBe("Uncategorised");
  });

  it("single category has 100% percentage", () => {
    const rows = buildCategoryRows([tx(-150, "Food")]);
    expect(rows[0].percentage).toBe(100);
  });

  it("excludes zero-amount categories", () => {
    const rows = buildCategoryRows([tx(-100, "Food")]);
    expect(rows.every((r) => r.total > 0)).toBe(true);
  });
});
