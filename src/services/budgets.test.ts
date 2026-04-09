import { describe, it, expect, beforeEach } from "vitest";
import { saveBudget, loadBudgets, deleteBudget } from "./budgets";

beforeEach(() => {
  localStorage.clear();
});

describe("saveBudget", () => {
  it("stores a category→amount mapping", () => {
    saveBudget("Groceries", 500);
    expect(loadBudgets()["Groceries"]).toBe(500);
  });

  it("overwrites an existing budget for the same category", () => {
    saveBudget("Groceries", 500);
    saveBudget("Groceries", 750);
    expect(loadBudgets()["Groceries"]).toBe(750);
  });

  it("does not save for an empty category name", () => {
    saveBudget("", 100);
    expect(Object.keys(loadBudgets())).toHaveLength(0);
  });

  it("does not save for a whitespace-only category", () => {
    saveBudget("   ", 100);
    expect(Object.keys(loadBudgets())).toHaveLength(0);
  });

  it("does not save for zero amount", () => {
    saveBudget("Groceries", 0);
    expect(Object.keys(loadBudgets())).toHaveLength(0);
  });

  it("does not save for negative amount", () => {
    saveBudget("Groceries", -50);
    expect(Object.keys(loadBudgets())).toHaveLength(0);
  });

  it("preserves other existing budgets when adding a new one", () => {
    saveBudget("Transport", 200);
    saveBudget("Dining", 150);
    const budgets = loadBudgets();
    expect(budgets["Transport"]).toBe(200);
    expect(budgets["Dining"]).toBe(150);
  });
});

describe("loadBudgets", () => {
  it("returns an empty object when nothing is stored", () => {
    expect(loadBudgets()).toEqual({});
  });

  it("returns all saved budgets", () => {
    saveBudget("Groceries", 500);
    saveBudget("Transport", 200);
    const budgets = loadBudgets();
    expect(budgets["Groceries"]).toBe(500);
    expect(budgets["Transport"]).toBe(200);
  });

  it("returns empty object when localStorage contains corrupt JSON", () => {
    localStorage.setItem("finance_analyser_budgets", "{bad}");
    expect(loadBudgets()).toEqual({});
  });
});

describe("deleteBudget", () => {
  it("removes the budget for the given category", () => {
    saveBudget("Groceries", 500);
    deleteBudget("Groceries");
    expect(loadBudgets()["Groceries"]).toBeUndefined();
  });

  it("does not affect other budgets", () => {
    saveBudget("Groceries", 500);
    saveBudget("Transport", 200);
    deleteBudget("Groceries");
    expect(loadBudgets()["Transport"]).toBe(200);
  });

  it("is a no-op for a category that does not exist", () => {
    expect(() => deleteBudget("Nonexistent")).not.toThrow();
  });
});
