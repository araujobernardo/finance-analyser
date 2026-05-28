import { describe, it, expect } from "vitest";
import {
  getCategoryDisplay,
  formatDateLabel,
  formatTxnAmount,
} from "./categoryDisplay";

describe("getCategoryDisplay", () => {
  it("returns groceries display for Groceries", () => {
    const d = getCategoryDisplay("Groceries");
    expect(d.emoji).toBe("🛒");
    expect(d.iconBg).toBe("#e8f4ec");
  });

  it("is case-insensitive", () => {
    const lower = getCategoryDisplay("groceries");
    const upper = getCategoryDisplay("GROCERIES");
    expect(lower.emoji).toBe(upper.emoji);
  });

  it("returns fallback for unknown category", () => {
    const d = getCategoryDisplay("FancyCategory");
    expect(d.emoji).toBe("💳");
  });

  it("returns fallback for null", () => {
    const d = getCategoryDisplay(null);
    expect(d.emoji).toBe("💳");
  });

  it("returns entertainment display", () => {
    const d = getCategoryDisplay("Entertainment");
    expect(d.emoji).toBe("🎬");
  });

  it("returns income display", () => {
    const d = getCategoryDisplay("Income");
    expect(d.emoji).toBe("💰");
  });
});

describe("formatTxnAmount", () => {
  it("prefixes debit with −$", () => {
    expect(formatTxnAmount(-50)).toBe("−$50.00");
  });

  it("prefixes credit with +$", () => {
    expect(formatTxnAmount(4800)).toBe("+$4,800.00");
  });

  it("formats to 2 decimal places", () => {
    expect(formatTxnAmount(-1.5)).toBe("−$1.50");
  });
});

describe("formatDateLabel", () => {
  it("formats a date string to day + short month", () => {
    const result = formatDateLabel("2025-05-27");
    expect(result).toMatch(/27/);
    expect(result).toMatch(/May/);
  });
});
