import { describe, it, expect, beforeEach } from "vitest";
import {
  saveRule,
  loadRules,
  deleteRule,
  getRuleForDescription,
} from "./categoryRules";

beforeEach(() => {
  localStorage.clear();
});

describe("saveRule", () => {
  it("stores a description→category mapping", () => {
    saveRule("COUNTDOWN SUPERMARKET", "Groceries");
    expect(loadRules()["countdown supermarket"]).toBe("Groceries");
  });

  it("normalises the key to lowercase and trimmed", () => {
    saveRule("  PETROL STATION  ", "Transport");
    expect(loadRules()["petrol station"]).toBe("Transport");
  });

  it("overwrites an existing rule for the same description", () => {
    saveRule("UBER EATS", "Dining");
    saveRule("UBER EATS", "Entertainment");
    expect(loadRules()["uber eats"]).toBe("Entertainment");
  });

  it("does not save a rule for an empty description", () => {
    saveRule("", "Groceries");
    expect(Object.keys(loadRules())).toHaveLength(0);
  });

  it("does not save a rule for a whitespace-only description", () => {
    saveRule("   ", "Groceries");
    expect(Object.keys(loadRules())).toHaveLength(0);
  });
});

describe("loadRules", () => {
  it("returns an empty object when nothing is stored", () => {
    expect(loadRules()).toEqual({});
  });

  it("returns all saved rules", () => {
    saveRule("COUNTDOWN", "Groceries");
    saveRule("UBER", "Transport");
    const rules = loadRules();
    expect(rules["countdown"]).toBe("Groceries");
    expect(rules["uber"]).toBe("Transport");
  });

  it("returns empty object when localStorage contains corrupt JSON", () => {
    localStorage.setItem("finance_analyser_category_rules", "{bad}");
    expect(loadRules()).toEqual({});
  });
});

describe("deleteRule", () => {
  it("removes the rule for the given normalised key", () => {
    saveRule("COUNTDOWN", "Groceries");
    deleteRule("countdown");
    expect(loadRules()["countdown"]).toBeUndefined();
  });

  it("does not affect other rules", () => {
    saveRule("COUNTDOWN", "Groceries");
    saveRule("UBER", "Transport");
    deleteRule("countdown");
    expect(loadRules()["uber"]).toBe("Transport");
  });

  it("is a no-op for a key that does not exist", () => {
    expect(() => deleteRule("nonexistent")).not.toThrow();
  });
});

describe("getRuleForDescription", () => {
  it("returns the category for a matching description", () => {
    saveRule("COUNTDOWN SUPERMARKET", "Groceries");
    expect(getRuleForDescription("COUNTDOWN SUPERMARKET")).toBe("Groceries");
  });

  it("matches case-insensitively", () => {
    saveRule("countdown supermarket", "Groceries");
    expect(getRuleForDescription("COUNTDOWN SUPERMARKET")).toBe("Groceries");
  });

  it("matches after trimming whitespace", () => {
    saveRule("PETROL STATION", "Transport");
    expect(getRuleForDescription("  PETROL STATION  ")).toBe("Transport");
  });

  it("returns undefined for an unknown description", () => {
    expect(getRuleForDescription("UNKNOWN MERCHANT")).toBeUndefined();
  });
});
