import { describe, it, expect } from "vitest";
import { isoWeekStart, formatWeekLabel } from "./weeklyAggregation";

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
