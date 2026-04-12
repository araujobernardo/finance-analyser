import { describe, it, expect, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
import { AccountProvider, useAccount } from "./AccountContext";
import { ACTIVE_ACCOUNT_KEY } from "./accountKeys";
import { ACCOUNT_COLOURS, DEFAULT_ACCOUNT_ID } from "../services/storage";
import type { Account } from "../services/storage";

// ── Helpers ────────────────────────────────────────────────────────────────

const ACCOUNTS_KEY = "finance_analyser_accounts";

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: "acc-1",
    name: "Test Account",
    colour: ACCOUNT_COLOURS[0],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function seedAccounts(accounts: Account[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

/** Minimal consumer component to expose context values for assertions. */
function ContextReader({
  onRender,
}: {
  onRender: (val: ReturnType<typeof useAccount>) => void;
}) {
  const ctx = useAccount();
  onRender(ctx);
  return null;
}

beforeEach(() => {
  localStorage.clear();
});

// ── AccountProvider ────────────────────────────────────────────────────────

describe("AccountProvider", () => {
  it("exposes an empty accounts list when no accounts are stored", () => {
    let ctx!: ReturnType<typeof useAccount>;
    render(
      <AccountProvider>
        <ContextReader onRender={(v) => (ctx = v)} />
      </AccountProvider>,
    );
    expect(ctx.accounts).toEqual([]);
  });

  it("exposes accounts loaded from localStorage", () => {
    const acc = makeAccount();
    seedAccounts([acc]);
    let ctx!: ReturnType<typeof useAccount>;
    render(
      <AccountProvider>
        <ContextReader onRender={(v) => (ctx = v)} />
      </AccountProvider>,
    );
    expect(ctx.accounts).toHaveLength(1);
    expect(ctx.accounts[0].id).toBe("acc-1");
  });

  it("defaults activeAccountId to the first account's id", () => {
    seedAccounts([makeAccount({ id: "first" }), makeAccount({ id: "second" })]);
    let ctx!: ReturnType<typeof useAccount>;
    render(
      <AccountProvider>
        <ContextReader onRender={(v) => (ctx = v)} />
      </AccountProvider>,
    );
    expect(ctx.activeAccountId).toBe("first");
  });

  it("falls back to DEFAULT_ACCOUNT_ID when no accounts exist", () => {
    let ctx!: ReturnType<typeof useAccount>;
    render(
      <AccountProvider>
        <ContextReader onRender={(v) => (ctx = v)} />
      </AccountProvider>,
    );
    expect(ctx.activeAccountId).toBe(DEFAULT_ACCOUNT_ID);
  });

  it("restores activeAccountId from localStorage", () => {
    seedAccounts([makeAccount({ id: "acc-a" }), makeAccount({ id: "acc-b" })]);
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, "acc-b");
    let ctx!: ReturnType<typeof useAccount>;
    render(
      <AccountProvider>
        <ContextReader onRender={(v) => (ctx = v)} />
      </AccountProvider>,
    );
    expect(ctx.activeAccountId).toBe("acc-b");
  });

  it("ignores a stored activeAccountId that no longer exists in accounts", () => {
    seedAccounts([makeAccount({ id: "acc-a" })]);
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, "deleted-acc");
    let ctx!: ReturnType<typeof useAccount>;
    render(
      <AccountProvider>
        <ContextReader onRender={(v) => (ctx = v)} />
      </AccountProvider>,
    );
    // Falls back to first account
    expect(ctx.activeAccountId).toBe("acc-a");
  });

  it("setActiveAccountId updates the active account and persists it", async () => {
    seedAccounts([makeAccount({ id: "acc-a" }), makeAccount({ id: "acc-b" })]);
    let ctx!: ReturnType<typeof useAccount>;
    render(
      <AccountProvider>
        <ContextReader onRender={(v) => (ctx = v)} />
      </AccountProvider>,
    );
    act(() => ctx.setActiveAccountId("acc-b"));
    expect(ctx.activeAccountId).toBe("acc-b");
    expect(localStorage.getItem(ACTIVE_ACCOUNT_KEY)).toBe("acc-b");
  });
});

// ── useAccount outside provider ────────────────────────────────────────────

describe("useAccount — default context (no provider)", () => {
  it("returns default values without throwing", () => {
    let ctx!: ReturnType<typeof useAccount>;
    // No AccountProvider wrapper
    render(<ContextReader onRender={(v) => (ctx = v)} />);
    expect(ctx.accounts).toEqual([]);
    expect(ctx.activeAccountId).toBe(DEFAULT_ACCOUNT_ID);
    expect(typeof ctx.setActiveAccountId).toBe("function");
  });
});
