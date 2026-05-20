import { describe, it, expect } from "vitest";
import { buildFinanceContext, ALL_ACCOUNTS_ID } from "./claudeChat";

// NOTE: storage.ts has been deleted (FA-CORE-001 T013). buildFinanceContext
// previously read from localStorage via storage.ts. It now always returns the
// no-data message. ChatPage builds its own context from ApiTransaction[]
// directly. These tests document the new simplified behaviour.

describe("buildFinanceContext", () => {
  it("always returns a no-data message (storage.ts deleted in T013)", () => {
    expect(buildFinanceContext()).toMatch(/not uploaded any financial data/i);
  });

  it("returns no-data message regardless of activeAccountId argument", () => {
    expect(buildFinanceContext(ALL_ACCOUNTS_ID)).toMatch(
      /not uploaded any financial data/i,
    );
    expect(buildFinanceContext("acc1")).toMatch(
      /not uploaded any financial data/i,
    );
    expect(buildFinanceContext("nonexistent")).toMatch(
      /not uploaded any financial data/i,
    );
  });

  it("returns a string when called with no arguments", () => {
    const ctx = buildFinanceContext();
    expect(typeof ctx).toBe("string");
    expect(ctx.length).toBeGreaterThan(0);
  });
});
