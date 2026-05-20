import { describe, it, expect } from "vitest";
import { fmt, fmtMonth, getCatColor } from "./transactionFormatters";

describe("fmt", () => {
  it("formats a positive number with $ prefix and two decimal places", () => {
    expect(fmt(42.5)).toBe("$42.50");
  });

  it("formats a negative number as its absolute value (no negative sign)", () => {
    expect(fmt(-100)).toBe("$100.00");
  });

  it("formats zero", () => {
    expect(fmt(0)).toBe("$0.00");
  });

  it("formats a large number with thousands separator", () => {
    expect(fmt(1234567.89)).toBe("$1,234,567.89");
  });
});

describe("fmtMonth", () => {
  it("returns empty string for empty input", () => {
    expect(fmtMonth("")).toBe("");
  });

  it("formats a valid YYYY-MM string to a human-readable month and year", () => {
    // Use a locale-agnostic check — verify it contains the year
    const result = fmtMonth("2025-03");
    expect(result).toContain("2025");
    expect(result.length).toBeGreaterThan(4);
  });

  it("formats January correctly", () => {
    const result = fmtMonth("2024-01");
    expect(result).toContain("2024");
  });

  it("formats December correctly", () => {
    const result = fmtMonth("2023-12");
    expect(result).toContain("2023");
  });
});

describe("getCatColor", () => {
  const cats = [
    { name: "Food", color: "#ff0000" },
    { name: "Transport", color: "#00ff00" },
  ];

  it("returns the matching category colour", () => {
    expect(getCatColor("Food", cats)).toBe("#ff0000");
  });

  it("returns the fallback colour when category is not found", () => {
    expect(getCatColor("Unknown", cats)).toBe("#64748b");
  });

  it("returns the fallback colour when category is null", () => {
    expect(getCatColor(null, cats)).toBe("#64748b");
  });

  it("returns the fallback colour for an empty categories array", () => {
    expect(getCatColor("Food", [])).toBe("#64748b");
  });
});
