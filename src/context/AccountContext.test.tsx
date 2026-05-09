import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, act, waitFor } from "@testing-library/react";
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
import type { ApiAccount } from "../types/api";
import type { Transaction } from "../utils/csvParser";

// ── Mock useApi ────────────────────────────────────────────────────────────

const mockApiFetch = vi.fn();
vi.mock("../lib/api", () => ({
  useApi: () => ({ apiFetch: mockApiFetch }),
  API_BASE: "",
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function makeApiAccount(overrides: Partial<ApiAccount> = {}): ApiAccount {
  return {
    id: "acc-1",
    userId: "user-1",
    accountNumber: "",
    nickname: "Test Account",
    accountType: "Checking",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function mockGetAccounts(accounts: ApiAccount[]) {
  mockApiFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({ accounts }),
  });
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
  vi.clearAllMocks();
});

// ── AccountProvider ────────────────────────────────────────────────────────

describe("AccountProvider", () => {
  it("exposes an empty accounts list while loading", async () => {
    // Never resolves during synchronous render
    mockApiFetch.mockReturnValueOnce(new Promise(() => {}));
    let ctx!: ReturnType<typeof useAccount>;
    render(
      <AccountProvider>
        <ContextReader onRender={(v) => (ctx = v)} />
      </AccountProvider>,
    );
    expect(ctx.accounts).toEqual([]);
    expect(ctx.isLoading).toBe(true);
  });

  it("exposes accounts loaded from API", async () => {
    const acc = makeApiAccount({ id: "acc-1" });
    mockGetAccounts([acc]);
    let ctx!: ReturnType<typeof useAccount>;
    render(
      <AccountProvider>
        <ContextReader onRender={(v) => (ctx = v)} />
      </AccountProvider>,
    );
    await waitFor(() => expect(ctx.accounts).toHaveLength(1));
    expect(ctx.accounts[0].id).toBe("acc-1");
    expect(ctx.isLoading).toBe(false);
  });

  it("derives colour by index", async () => {
    mockGetAccounts([
      makeApiAccount({ id: "a1" }),
      makeApiAccount({ id: "a2" }),
    ]);
    let ctx!: ReturnType<typeof useAccount>;
    render(
      <AccountProvider>
        <ContextReader onRender={(v) => (ctx = v)} />
      </AccountProvider>,
    );
    await waitFor(() => expect(ctx.accounts).toHaveLength(2));
    expect(ctx.accounts[0].colour).toBe(ACCOUNT_COLOURS[0]);
    expect(ctx.accounts[1].colour).toBe(ACCOUNT_COLOURS[1]);
  });

  it("defaults activeAccountId to the first account's id after load", async () => {
    mockGetAccounts([
      makeApiAccount({ id: "first" }),
      makeApiAccount({ id: "second" }),
    ]);
    let ctx!: ReturnType<typeof useAccount>;
    render(
      <AccountProvider>
        <ContextReader onRender={(v) => (ctx = v)} />
      </AccountProvider>,
    );
    await waitFor(() => expect(ctx.accounts).toHaveLength(2));
    expect(ctx.activeAccountId).toBe("first");
  });

  it("falls back to DEFAULT_ACCOUNT_ID when API returns empty list", async () => {
    mockGetAccounts([]);
    let ctx!: ReturnType<typeof useAccount>;
    render(
      <AccountProvider>
        <ContextReader onRender={(v) => (ctx = v)} />
      </AccountProvider>,
    );
    await waitFor(() => expect(ctx.isLoading).toBe(false));
    expect(ctx.activeAccountId).toBe(DEFAULT_ACCOUNT_ID);
  });

  it("restores activeAccountId from localStorage if account exists", async () => {
    mockGetAccounts([
      makeApiAccount({ id: "acc-a" }),
      makeApiAccount({ id: "acc-b" }),
    ]);
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, "acc-b");
    let ctx!: ReturnType<typeof useAccount>;
    render(
      <AccountProvider>
        <ContextReader onRender={(v) => (ctx = v)} />
      </AccountProvider>,
    );
    await waitFor(() => expect(ctx.accounts).toHaveLength(2));
    expect(ctx.activeAccountId).toBe("acc-b");
  });

  it("ignores a stored activeAccountId that no longer exists in accounts", async () => {
    mockGetAccounts([makeApiAccount({ id: "acc-a" })]);
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, "deleted-acc");
    let ctx!: ReturnType<typeof useAccount>;
    render(
      <AccountProvider>
        <ContextReader onRender={(v) => (ctx = v)} />
      </AccountProvider>,
    );
    await waitFor(() => expect(ctx.accounts).toHaveLength(1));
    expect(ctx.activeAccountId).toBe("acc-a");
  });

  it("setActiveAccountId updates the active account and persists it", async () => {
    mockGetAccounts([
      makeApiAccount({ id: "acc-a" }),
      makeApiAccount({ id: "acc-b" }),
    ]);
    let ctx!: ReturnType<typeof useAccount>;
    render(
      <AccountProvider>
        <ContextReader onRender={(v) => (ctx = v)} />
      </AccountProvider>,
    );
    await waitFor(() => expect(ctx.accounts).toHaveLength(2));
    act(() => ctx.setActiveAccountId("acc-b"));
    expect(ctx.activeAccountId).toBe("acc-b");
    expect(localStorage.getItem(ACTIVE_ACCOUNT_KEY)).toBe("acc-b");
  });

  it("addAccount POSTs to API and adds account to list", async () => {
    mockGetAccounts([]);
    const newAccount = makeApiAccount({ id: "new-1", nickname: "New Account" });
    mockApiFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => newAccount,
    });

    let ctx!: ReturnType<typeof useAccount>;
    render(
      <AccountProvider>
        <ContextReader onRender={(v) => (ctx = v)} />
      </AccountProvider>,
    );
    await waitFor(() => expect(ctx.isLoading).toBe(false));

    await act(async () => {
      await ctx.addAccount("New Account", "Checking");
    });

    expect(ctx.accounts.find((a) => a.id === "new-1")).toBeDefined();
    expect(ctx.activeAccountId).toBe("new-1");
  });

  it("removeAccount DELETEs from API and removes account from list", async () => {
    mockGetAccounts([
      makeApiAccount({ id: "acc-a" }),
      makeApiAccount({ id: "acc-b" }),
    ]);
    mockApiFetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: async () => null,
    });

    let ctx!: ReturnType<typeof useAccount>;
    render(
      <AccountProvider>
        <ContextReader onRender={(v) => (ctx = v)} />
      </AccountProvider>,
    );
    await waitFor(() => expect(ctx.accounts).toHaveLength(2));

    await act(async () => {
      await ctx.removeAccount("acc-a");
    });

    expect(ctx.accounts.find((a) => a.id === "acc-a")).toBeUndefined();
    expect(ctx.activeAccountId).toBe("acc-b");
  });

  it("sets error when API fetch fails", async () => {
    mockApiFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "Server error" }),
    });
    let ctx!: ReturnType<typeof useAccount>;
    render(
      <AccountProvider>
        <ContextReader onRender={(v) => (ctx = v)} />
      </AccountProvider>,
    );
    await waitFor(() => expect(ctx.isLoading).toBe(false));
    expect(ctx.error).toBe("Server error");
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

  it("restores 'all' as activeAccountId from localStorage", async () => {
    mockGetAccounts([makeApiAccount({ id: "acc-a" })]);
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, ALL_ACCOUNTS_ID);
    let ctx!: ReturnType<typeof useAccount>;
    render(
      <AccountProvider>
        <ContextReader onRender={(v) => (ctx = v)} />
      </AccountProvider>,
    );
    await waitFor(() => expect(ctx.accounts).toHaveLength(1));
    expect(ctx.activeAccountId).toBe(ALL_ACCOUNTS_ID);
  });

  it("setActiveAccountId accepts 'all' and persists it", async () => {
    mockGetAccounts([makeApiAccount({ id: "acc-a" })]);
    let ctx!: ReturnType<typeof useAccount>;
    render(
      <AccountProvider>
        <ContextReader onRender={(v) => (ctx = v)} />
      </AccountProvider>,
    );
    await waitFor(() => expect(ctx.accounts).toHaveLength(1));
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
  it("returns months for the active single account", async () => {
    mockGetAccounts([makeApiAccount({ id: "acc-a" })]);
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
    await waitFor(() => expect(months).toContain("2024-03"));
  });

  it("returns union of months across all accounts when activeAccountId is 'all'", async () => {
    mockGetAccounts([
      makeApiAccount({ id: "acc-a" }),
      makeApiAccount({ id: "acc-b" }),
    ]);
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
    await waitFor(() => expect(months.length).toBeGreaterThan(0));
    expect(months).toContain("2024-03");
    expect(months).toContain("2024-04");
  });

  it("returns months in sorted order for 'all'", async () => {
    mockGetAccounts([
      makeApiAccount({ id: "acc-a" }),
      makeApiAccount({ id: "acc-b" }),
    ]);
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
    await waitFor(() => expect(months.length).toBeGreaterThan(0));
    expect(months).toEqual([...months].sort());
  });

  it("returns empty array when no accounts have data", async () => {
    mockGetAccounts([makeApiAccount({ id: "acc-a" })]);
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, ALL_ACCOUNTS_ID);

    let months: string[] = [];
    render(
      <AccountProvider>
        <ActiveMonthsReader onRender={(m) => (months = m)} />
      </AccountProvider>,
    );
    // After load, still no months
    await waitFor(() => {});
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
  it("returns transactions for the active single account and month", async () => {
    mockGetAccounts([makeApiAccount({ id: "acc-a" })]);
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
    await waitFor(() => expect(result).toHaveLength(1));
    expect(result[0].description).toBe("Groceries");
  });

  it("returns empty array when monthKey is null", async () => {
    mockGetAccounts([makeApiAccount({ id: "acc-a" })]);
    let result: ReturnType<typeof useActiveTransactions> = [];
    render(
      <AccountProvider>
        <ActiveTransactionsReader
          monthKey={null}
          onRender={(t) => (result = t)}
        />
      </AccountProvider>,
    );
    await waitFor(() => {});
    expect(result).toHaveLength(0);
  });

  it("merges transactions from all accounts when activeAccountId is 'all'", async () => {
    mockGetAccounts([
      makeApiAccount({ id: "acc-a" }),
      makeApiAccount({ id: "acc-b" }),
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
    await waitFor(() => expect(result).toHaveLength(2));
    expect(result.map((t) => t.description).sort()).toEqual(["A", "B"]);
  });

  it("attaches accountColour to each transaction when activeAccountId is 'all'", async () => {
    mockGetAccounts([
      makeApiAccount({ id: "acc-a" }),
      makeApiAccount({ id: "acc-b" }),
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
    await waitFor(() => expect(result).toHaveLength(2));
    const colours = result.map((t) => t.accountColour);
    expect(colours).toContain(ACCOUNT_COLOURS[0]);
    expect(colours).toContain(ACCOUNT_COLOURS[1]);
  });

  it("does not attach accountColour in single-account mode", async () => {
    mockGetAccounts([makeApiAccount({ id: "acc-a" })]);
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
    await waitFor(() => expect(result).toHaveLength(1));
    expect(result[0].accountColour).toBeUndefined();
  });
});
