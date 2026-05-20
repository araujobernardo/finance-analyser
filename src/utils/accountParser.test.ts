import { describe, it, expect } from "vitest";
import { parseAccountName } from "./accountParser";

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Builds an ASB-style CSV header block where line[1] (second line) contains
 * the account info row.
 */
function makeAsbHeader(accountLine: string): string {
  return `ASB Bank Export\n${accountLine}\nDate,Unique Id,Amount`;
}

const NO_ALIASES: Record<string, string> = {};

// ── Happy path ─────────────────────────────────────────────────────────────

describe("parseAccountName — happy path", () => {
  it("returns short=num and display='nick (num)' when both nickname and account number are present", () => {
    const text = makeAsbHeader("Account 123456789012 Branch 001 (Savings)");
    const result = parseAccountName(text, NO_ALIASES);
    expect(result.short).toBe("123456789012");
    expect(result.display).toBe("Savings (123456789012)");
  });

  it("applies an alias override for the short name when alias exists", () => {
    const text = makeAsbHeader("Account 123456789012 Branch 001 (Savings)");
    const aliases: Record<string, string> = {
      "123456789012": "My Savings Account",
    };
    const result = parseAccountName(text, aliases);
    expect(result.short).toBe("123456789012");
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
    const aliases: Record<string, string> = { Main: "Primary Account" };
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
    expect(result.short).toBe("123456789012");
    expect(result.display).toBe("Savings (123456789012)");
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
    expect(result.short).toBe("123456789012");
    expect(result.display).toBe("Savings (123456789012)");
  });
});

// ── Account number as primary key ──────────────────────────────────────────

describe("parseAccountName — account number as primary key", () => {
  // T003: same name, different numbers → two distinct short values
  it("produces distinct short values for two payloads sharing the same name but different account numbers", () => {
    const textA = makeAsbHeader(
      "Account 0549256-53 Branch 001 (Savings On Call)",
    );
    const textB = makeAsbHeader(
      "Account 0549256-50 Branch 001 (Savings On Call)",
    );
    const resultA = parseAccountName(textA, NO_ALIASES);
    const resultB = parseAccountName(textB, NO_ALIASES);
    expect(resultA.short).not.toBe(resultB.short);
    expect(resultA.short).toBe("0549256-53");
    expect(resultB.short).toBe("0549256-50");
  });

  // T004: number + name present → short equals the account number
  it("uses the account number as short when both account number and nickname are present", () => {
    const text = makeAsbHeader("Account 0549256-00 Branch 001 (Streamline)");
    const result = parseAccountName(text, NO_ALIASES);
    expect(result.short).toBe("0549256-00");
  });

  // T005: name only (no number) → short equals the name
  it("falls back to nickname as short when account number is absent", () => {
    // No parseable token after 'Account' (parenthesis follows immediately),
    // so num is null and short falls back to the nickname.
    const text = makeAsbHeader("Account() Branch 001 (Everyday)");
    const result = parseAccountName(text, NO_ALIASES);
    expect(result.short).toBe("Everyday");
  });
});

// ── Display label format (US3 / #118) ─────────────────────────────────────

describe("parseAccountName — display label format", () => {
  // T009: CSV with number + name → display equals "Name (number)" format
  it("formats display as 'Name (number)' when both account name and number are present", () => {
    const textA = makeAsbHeader(
      "Account 0549256-53 Branch 001 (Savings On Call)",
    );
    const textB = makeAsbHeader(
      "Account 0549256-50 Branch 001 (Savings On Call)",
    );
    const resultA = parseAccountName(textA, NO_ALIASES);
    const resultB = parseAccountName(textB, NO_ALIASES);
    expect(resultA.display).toBe("Savings On Call (0549256-53)");
    expect(resultB.display).toBe("Savings On Call (0549256-50)");
  });

  // T010: CSV with name only (no account number) → display equals the name alone
  it("uses only the nickname as display when account number is absent", () => {
    // No parseable token after 'Account' (parenthesis follows immediately),
    // so num is null and display falls back to the nickname alone.
    const text = makeAsbHeader("Account() Branch 001 (Everyday)");
    const result = parseAccountName(text, NO_ALIASES);
    expect(result.display).toBe("Everyday");
  });

  // T011: CSV with no recognisable metadata → display equals "Main Account"
  it("returns display 'Main Account' when CSV contains no recognisable account/branch metadata", () => {
    const text = "Header Line\nSome unrelated line\nDate,Amount";
    const result = parseAccountName(text, NO_ALIASES);
    expect(result.display).toBe("Main Account");
  });
});

// ── Re-import stability (US2 / #117) ──────────────────────────────────────

describe("parseAccountName — re-import stability", () => {
  // T007: same CSV parsed twice must produce the identical short value so that
  // re-importing an account appends to the correct existing account and does
  // not create a duplicate.
  it("returns the same short value when the same CSV is parsed a second time", () => {
    const csvText = makeAsbHeader(
      "Account 0549256-53 Branch 001 (Savings On Call)",
    );
    const firstImport = parseAccountName(csvText, NO_ALIASES);
    const secondImport = parseAccountName(csvText, NO_ALIASES);
    expect(firstImport.short).toBe("0549256-53");
    expect(secondImport.short).toBe("0549256-53");
    expect(firstImport.short).toBe(secondImport.short);
  });
});
