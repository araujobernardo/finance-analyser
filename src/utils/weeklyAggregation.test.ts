import { describe, it, expect } from "vitest";
import {
  isoWeekStart,
  formatWeekLabel,
  buildWeeklyTotals,
} from "./weeklyAggregation";
import type { PfaTxn } from "../types/pfa";

function makeTxn(overrides: Partial<PfaTxn> = {}): PfaTxn {
  return {
    id: "t1",
    date: "2026-01-27",
    month: "2026-01",
    type: "Debit",
    payee: "Shop",
    memo: "",
    amount: -50,
    isCredit: false,
    account: "acc1",
    accountShort: "acc1",
    category: "Groceries",
    isTransfer: false,
    ...overrides,
  };
}

describe("isoWeekStart", () => {
  it("returns Monday unchanged when input is already a Monday", () => {
    const monday = new Date("2026-01-26T12:00:00"); // Monday
    const result = isoWeekStart(monday);
    expect(result.getDay()).toBe(1); // 1 = Monday
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(0); // January
    expect(result.getDate()).toBe(26);
  });

  it("returns the preceding Monday for a Wednesday input", () => {
    const wednesday = new Date("2026-01-28T09:00:00"); // Wednesday
    const result = isoWeekStart(wednesday);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(26);
  });

  it("returns the preceding Monday for a Sunday input", () => {
    const sunday = new Date("2026-02-01T08:00:00"); // Sunday
    const result = isoWeekStart(sunday);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(26); // Monday of that week = Jan 26
  });

  it("returns a Monday for a Saturday input", () => {
    const saturday = new Date("2026-01-31T10:00:00"); // Saturday
    const result = isoWeekStart(saturday);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(26);
  });

  it("sets time to midnight", () => {
    const date = new Date("2026-02-03T15:30:45");
    const result = isoWeekStart(date);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
  });

  it("handles cross-month boundary — Wednesday 4 Feb returns Monday 2 Feb", () => {
    const wednesday = new Date(2026, 1, 4); // Feb 4, 2026 (Wednesday)
    const result = isoWeekStart(wednesday);
    expect(result.getDay()).toBe(1);
    expect(result.getMonth()).toBe(1); // February
    expect(result.getDate()).toBe(2); // Feb 2
  });

  it("does not mutate the input date", () => {
    const original = new Date("2026-01-28T12:00:00");
    const originalTime = original.getTime();
    isoWeekStart(original);
    expect(original.getTime()).toBe(originalTime);
  });
});

describe("formatWeekLabel", () => {
  it("returns '3 Feb' for 2026-02-03 using en-NZ locale (day first, no leading zero)", () => {
    // en-NZ locale produces day-first format: "3 Feb" not "Feb 3"
    const date = new Date(2026, 1, 3); // Feb 3, 2026 (month is 0-indexed)
    expect(formatWeekLabel(date)).toBe("3 Feb");
  });

  it("returns a single-digit day without leading zero", () => {
    const date = new Date(2026, 0, 5); // Jan 5, 2026
    const label = formatWeekLabel(date);
    expect(label).toBe("5 Jan");
  });

  it("returns the correct format for Jan 27", () => {
    const date = new Date(2026, 0, 27); // Jan 27, 2026
    expect(formatWeekLabel(date)).toBe("27 Jan");
  });

  it("uses abbreviated month name", () => {
    const date = new Date(2026, 11, 1); // Dec 1, 2026
    const label = formatWeekLabel(date);
    expect(label).toContain("Dec");
  });
});

describe("buildWeeklyTotals", () => {
  it("returns an empty array when there are no transactions", () => {
    expect(buildWeeklyTotals([], "all")).toEqual([]);
  });

  it("sums amounts for transactions in the same week", () => {
    const txns = [
      makeTxn({ date: "2026-01-26", amount: -30 }), // Monday
      makeTxn({ date: "2026-01-28", amount: -20 }), // Wednesday (same week)
    ];
    const result = buildWeeklyTotals(txns, "all");
    expect(result).toHaveLength(1);
    expect(result[0].totalSpend).toBe(50);
  });

  it("returns weeks sorted oldest to newest", () => {
    const txns = [
      makeTxn({ id: "t2", date: "2026-02-02", amount: -10 }), // later week
      makeTxn({ id: "t1", date: "2026-01-26", amount: -20 }), // earlier week
    ];
    const result = buildWeeklyTotals(txns, "all");
    expect(result).toHaveLength(2);
    expect(result[0].weekStart).toBe("2026-01-26");
    expect(result[1].weekStart).toBe("2026-02-02");
  });

  it("excludes transfer transactions", () => {
    const txns = [makeTxn({ isTransfer: true, amount: -100 })];
    expect(buildWeeklyTotals(txns, "all")).toEqual([]);
  });

  it("excludes credit transactions", () => {
    const txns = [makeTxn({ isCredit: true, amount: 100 })];
    expect(buildWeeklyTotals(txns, "all")).toEqual([]);
  });

  it("filters by account when activeAccountId is not 'all'", () => {
    const txns = [
      makeTxn({ id: "t1", account: "acc1", amount: -40 }),
      makeTxn({ id: "t2", account: "acc2", amount: -60 }),
    ];
    const result = buildWeeklyTotals(txns, "acc1");
    expect(result).toHaveLength(1);
    expect(result[0].totalSpend).toBe(40);
  });

  it("returns all accounts when activeAccountId is 'all'", () => {
    const txns = [
      makeTxn({ id: "t1", account: "acc1", amount: -40 }),
      makeTxn({ id: "t2", account: "acc2", amount: -60 }),
    ];
    const result = buildWeeklyTotals(txns, "all");
    expect(result[0].totalSpend).toBe(100);
  });

  it("returns at most 12 weeks", () => {
    const txns = Array.from({ length: 15 }, (_, i) => {
      // Each transaction is exactly 7 days apart, starting from 2025-10-06 (Monday)
      const date = new Date(2025, 9, 6); // Oct 6, 2025
      date.setDate(date.getDate() + i * 7);
      const iso = date.toISOString().slice(0, 10);
      return makeTxn({ id: `t${i}`, date: iso, amount: -10 });
    });
    const result = buildWeeklyTotals(txns, "all");
    expect(result).toHaveLength(12);
  });

  it("uses absolute amount for totalSpend", () => {
    const txns = [makeTxn({ amount: -75 })];
    const result = buildWeeklyTotals(txns, "all");
    expect(result[0].totalSpend).toBe(75);
  });

  it("sets the weekStart to the Monday of the week as an ISO date string", () => {
    const txns = [makeTxn({ date: "2026-01-28" })]; // Wednesday
    const result = buildWeeklyTotals(txns, "all");
    expect(result[0].weekStart).toBe("2026-01-26"); // Monday
  });
});
