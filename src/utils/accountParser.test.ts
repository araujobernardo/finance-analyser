import { describe, it, expect } from "vitest";
import { parseAccountName } from "./accountParser";
import type { PfaAccountAliases } from "../types/pfa";

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Builds an ASB-style CSV header block where line[1] (second line) contains
 * the account info row.
 */
function makeAsbHeader(accountLine: string): string {
  return `ASB Bank Export\n${accountLine}\nDate,Unique Id,Amount`;
}

const NO_ALIASES: PfaAccountAliases = {};

// ── Happy path ─────────────────────────────────────────────────────────────

describe("parseAccountName — happy path", () => {
  it("returns short=nick and display='nick ···last6' when both nickname and account number are present", () => {
    const text = makeAsbHeader("Account 123456789012 Branch 001 (Savings)");
    const result = parseAccountName(text, NO_ALIASES);
    expect(result.short).toBe("Savings");
    expect(result.display).toBe("Savings ···789012");
  });

  it("applies an alias override for the short name when alias exists", () => {
    const text = makeAsbHeader("Account 123456789012 Branch 001 (Savings)");
    const aliases: PfaAccountAliases = { Savings: "My Savings Account" };
    const result = parseAccountName(text, aliases);
    expect(result.short).toBe("Savings");
    expect(result.display).toBe("My Savings Account");
  });
});

// ── Edge cases ─────────────────────────────────────────────────────────────

describe("parseAccountName — edge cases", () => {
  it("falls back to { short: 'Main', display: 'Main Account' } when second line lacks 'Account' and 'Branch'", () => {
    const text = "Header Line\nSome unrelated line\nDate,Amount";
    const result = parseAccountName(text, NO_ALIASES);
    expect(result).toEqual({ short: "Main", display: "Main Account" });
  });

  it("uses alias for 'Main' when text has no matching account/branch line", () => {
    const text = "Header Line\nSome unrelated line\nDate,Amount";
    const aliases: PfaAccountAliases = { Main: "Primary Account" };
    const result = parseAccountName(text, aliases);
    expect(result).toEqual({ short: "Main", display: "Primary Account" });
  });

  it("handles input with only one line (no second line) and returns Main fallback", () => {
    const text = "Only one line";
    const result = parseAccountName(text, NO_ALIASES);
    expect(result).toEqual({ short: "Main", display: "Main Account" });
  });

  it("strips trailing commas from the account line before parsing", () => {
    // CSV rows sometimes have trailing commas
    const text = makeAsbHeader("Account 123456789012 Branch 001 (Savings),,,");
    const result = parseAccountName(text, NO_ALIASES);
    expect(result.short).toBe("Savings");
    expect(result.display).toBe("Savings ···789012");
  });

  it("returns account number as short/display when nickname is absent", () => {
    const text = makeAsbHeader("Account 123456789012 Branch 001");
    const result = parseAccountName(text, NO_ALIASES);
    expect(result.short).toBe("123456789012");
    expect(result.display).toBe("123456789012");
  });

  it("handles Windows-style CRLF line endings", () => {
    const text = `ASB Bank Export\r\nAccount 123456789012 Branch 001 (Savings)\r\nDate,Amount`;
    const result = parseAccountName(text, NO_ALIASES);
    expect(result.short).toBe("Savings");
    expect(result.display).toBe("Savings ···789012");
  });
});
