import { describe, it, expect, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
import {
  AccountProvider,
  useAccount,
  useActiveMonths,
  useActiveTransactions,
  ALL_ACCOUNTS_ID,
} from "./AccountContext";
import { ACTIVE_ACCOUNT_KEY } from "./accountKeys";
import {
  ACCOUNT_COLOURS,
  DEFAULT_ACCOUNT_ID,
  saveTransactions,
} from "../services/storage";
import type { Account } from "../services/storage";
import type { Transaction } from "../utils/csvParser";

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

  it("addAccount persists a new account and switches to it", () => {
    let ctx!: ReturnType<typeof useAccount>;
    render(
      <AccountProvider>
        <ContextReader onRender={(v) => (ctx = v)} />
      </AccountProvider>,
    );
    const newAccount = makeAccount({ id: "new-1", name: "New Account" });
    act(() => ctx.addAccount(newAccount));
    expect(ctx.accounts.find((a) => a.id === "new-1")).toBeDefined();
    expect(ctx.activeAccountId).toBe("new-1");
  });

  it("addAccount stores the account in localStorage", () => {
    let ctx!: ReturnType<typeof useAccount>;
    render(
      <AccountProvider>
        <ContextReader onRender={(v) => (ctx = v)} />
      </AccountProvider>,
    );
    const newAccount = makeAccount({ id: "new-2", name: "Another Account" });
    act(() => ctx.addAccount(newAccount));
    const stored = JSON.parse(
      localStorage.getItem(ACCOUNTS_KEY) ?? "[]",
    ) as Account[];
    expect(stored.find((a) => a.id === "new-2")).toBeDefined();
  });

  it("removeAccount removes the account and switches to the first remaining", () => {
    seedAccounts([
      makeAccount({ id: "acc-a", name: "Account A" }),
      makeAccount({ id: "acc-b", name: "Account B" }),
    ]);
    let ctx!: ReturnType<typeof useAccount>;
    render(
      <AccountProvider>
        <ContextReader onRender={(v) => (ctx = v)} />
      </AccountProvider>,
    );
    act(() => ctx.removeAccount("acc-a"));
    expect(ctx.accounts.find((a) => a.id === "acc-a")).toBeUndefined();
    expect(ctx.activeAccountId).toBe("acc-b");
  });

  it("removeAccount removes account from localStorage", () => {
    seedAccounts([
      makeAccount({ id: "acc-a", name: "Account A" }),
      makeAccount({ id: "acc-b", name: "Account B" }),
    ]);
    let ctx!: ReturnType<typeof useAccount>;
    render(
      <AccountProvider>
        <ContextReader onRender={(v) => (ctx = v)} />
      </AccountProvider>,
    );
    act(() => ctx.removeAccount("acc-a"));
    const stored = JSON.parse(
      localStorage.getItem(ACCOUNTS_KEY) ?? "[]",
    ) as Account[];
    expect(stored.find((a) => a.id === "acc-a")).toBeUndefined();
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

// ── ALL_ACCOUNTS_ID sentinel ───────────────────────────────────────────────

describe("ALL_ACCOUNTS_ID sentinel", () => {
  it("is the string 'all'", () => {
    expect(ALL_ACCOUNTS_ID).toBe("all");
  });

  it("restores 'all' as activeAccountId from localStorage", () => {
    seedAccounts([makeAccount({ id: "acc-a" })]);
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, ALL_ACCOUNTS_ID);
    let ctx!: ReturnType<typeof useAccount>;
    render(
      <AccountProvider>
        <ContextReader onRender={(v) => (ctx = v)} />
      </AccountProvider>,
    );
    expect(ctx.activeAccountId).toBe(ALL_ACCOUNTS_ID);
  });

  it("setActiveAccountId accepts 'all' and persists it", () => {
    seedAccounts([makeAccount({ id: "acc-a" })]);
    let ctx!: ReturnType<typeof useAccount>;
    render(
      <AccountProvider>
        <ContextReader onRender={(v) => (ctx = v)} />
      </AccountProvider>,
    );
    act(() => ctx.setActiveAccountId(ALL_ACCOUNTS_ID));
    expect(ctx.activeAccountId).toBe(ALL_ACCOUNTS_ID);
    expect(localStorage.getItem(ACTIVE_ACCOUNT_KEY)).toBe(ALL_ACCOUNTS_ID);
  });
});

// ── useActiveMonths ────────────────────────────────────────────────────────

/** Minimal consumer to capture useActiveMonths output */
function ActiveMonthsReader({
  onRender,
}: {
  onRender: (months: string[]) => void;
}) {
  const months = useActiveMonths();
  onRender(months);
  return null;
}

describe("useActiveMonths", () => {
  it("returns months for the active single account", () => {
    seedAccounts([makeAccount({ id: "acc-a" })]);
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, "acc-a");
    const txn: Transaction = {
      date: new Date(2024, 2, 1),
      description: "Test",
      amount: -10,
    };
    saveTransactions("acc-a", "2024-03", [txn]);

    let months: string[] = [];
    render(
      <AccountProvider>
        <ActiveMonthsReader onRender={(m) => (months = m)} />
      </AccountProvider>,
    );
    expect(months).toContain("2024-03");
  });

  it("returns union of months across all accounts when activeAccountId is 'all'", () => {
    seedAccounts([makeAccount({ id: "acc-a" }), makeAccount({ id: "acc-b" })]);
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, ALL_ACCOUNTS_ID);
    const txn: Transaction = {
      date: new Date(2024, 2, 1),
      description: "T",
      amount: -1,
    };
    saveTransactions("acc-a", "2024-03", [txn]);
    saveTransactions("acc-b", "2024-04", [txn]);

    let months: string[] = [];
    render(
      <AccountProvider>
        <ActiveMonthsReader onRender={(m) => (months = m)} />
      </AccountProvider>,
    );
    expect(months).toContain("2024-03");
    expect(months).toContain("2024-04");
  });

  it("returns months in sorted order for 'all'", () => {
    seedAccounts([makeAccount({ id: "acc-a" }), makeAccount({ id: "acc-b" })]);
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, ALL_ACCOUNTS_ID);
    const txn: Transaction = { date: new Date(), description: "T", amount: -1 };
    saveTransactions("acc-b", "2024-01", [txn]);
    saveTransactions("acc-a", "2024-03", [txn]);

    let months: string[] = [];
    render(
      <AccountProvider>
        <ActiveMonthsReader onRender={(m) => (months = m)} />
      </AccountProvider>,
    );
    expect(months).toEqual([...months].sort());
  });

  it("returns empty array when no accounts have data", () => {
    seedAccounts([makeAccount({ id: "acc-a" })]);
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, ALL_ACCOUNTS_ID);

    let months: string[] = [];
    render(
      <AccountProvider>
        <ActiveMonthsReader onRender={(m) => (months = m)} />
      </AccountProvider>,
    );
    expect(months).toHaveLength(0);
  });
});

// ── useActiveTransactions ──────────────────────────────────────────────────

function ActiveTransactionsReader({
  monthKey,
  onRender,
}: {
  monthKey: string | null;
  onRender: (txns: ReturnType<typeof useActiveTransactions>) => void;
}) {
  const txns = useActiveTransactions(monthKey);
  onRender(txns);
  return null;
}

describe("useActiveTransactions", () => {
  it("returns transactions for the active single account and month", () => {
    seedAccounts([makeAccount({ id: "acc-a", colour: ACCOUNT_COLOURS[0] })]);
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, "acc-a");
    const txn: Transaction = {
      date: new Date(2024, 2, 1),
      description: "Groceries",
      amount: -50,
    };
    saveTransactions("acc-a", "2024-03", [txn]);

    let result: ReturnType<typeof useActiveTransactions> = [];
    render(
      <AccountProvider>
        <ActiveTransactionsReader
          monthKey="2024-03"
          onRender={(t) => (result = t)}
        />
      </AccountProvider>,
    );
    expect(result).toHaveLength(1);
    expect(result[0].description).toBe("Groceries");
  });

  it("returns empty array when monthKey is null", () => {
    seedAccounts([makeAccount({ id: "acc-a" })]);
    let result: ReturnType<typeof useActiveTransactions> = [];
    render(
      <AccountProvider>
        <ActiveTransactionsReader
          monthKey={null}
          onRender={(t) => (result = t)}
        />
      </AccountProvider>,
    );
    expect(result).toHaveLength(0);
  });

  it("merges transactions from all accounts when activeAccountId is 'all'", () => {
    seedAccounts([
      makeAccount({ id: "acc-a", colour: ACCOUNT_COLOURS[0] }),
      makeAccount({ id: "acc-b", colour: ACCOUNT_COLOURS[1] }),
    ]);
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, ALL_ACCOUNTS_ID);
    const txnA: Transaction = {
      date: new Date(2024, 2, 1),
      description: "A",
      amount: -10,
    };
    const txnB: Transaction = {
      date: new Date(2024, 2, 2),
      description: "B",
      amount: -20,
    };
    saveTransactions("acc-a", "2024-03", [txnA]);
    saveTransactions("acc-b", "2024-03", [txnB]);

    let result: ReturnType<typeof useActiveTransactions> = [];
    render(
      <AccountProvider>
        <ActiveTransactionsReader
          monthKey="2024-03"
          onRender={(t) => (result = t)}
        />
      </AccountProvider>,
    );
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.description).sort()).toEqual(["A", "B"]);
  });

  it("attaches accountColour to each transaction when activeAccountId is 'all'", () => {
    const colourA = ACCOUNT_COLOURS[0];
    const colourB = ACCOUNT_COLOURS[1];
    seedAccounts([
      makeAccount({ id: "acc-a", colour: colourA }),
      makeAccount({ id: "acc-b", colour: colourB }),
    ]);
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, ALL_ACCOUNTS_ID);
    const txnA: Transaction = {
      date: new Date(2024, 2, 1),
      description: "A",
      amount: -10,
    };
    const txnB: Transaction = {
      date: new Date(2024, 2, 2),
      description: "B",
      amount: -20,
    };
    saveTransactions("acc-a", "2024-03", [txnA]);
    saveTransactions("acc-b", "2024-03", [txnB]);

    let result: ReturnType<typeof useActiveTransactions> = [];
    render(
      <AccountProvider>
        <ActiveTransactionsReader
          monthKey="2024-03"
          onRender={(t) => (result = t)}
        />
      </AccountProvider>,
    );
    const colours = result.map((t) => t.accountColour);
    expect(colours).toContain(colourA);
    expect(colours).toContain(colourB);
  });

  it("does not attach accountColour in single-account mode", () => {
    seedAccounts([makeAccount({ id: "acc-a", colour: ACCOUNT_COLOURS[0] })]);
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, "acc-a");
    const txn: Transaction = {
      date: new Date(2024, 2, 1),
      description: "T",
      amount: -1,
    };
    saveTransactions("acc-a", "2024-03", [txn]);

    let result: ReturnType<typeof useActiveTransactions> = [];
    render(
      <AccountProvider>
        <ActiveTransactionsReader
          monthKey="2024-03"
          onRender={(t) => (result = t)}
        />
      </AccountProvider>,
    );
    expect(result[0].accountColour).toBeUndefined();
  });
});
