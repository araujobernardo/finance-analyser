import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  type Dispatch,
  type SetStateAction,
  type ReactNode,
} from "react";
import { DEFAULT_ACCOUNT_ID, ACCOUNT_COLOURS } from "../services/storage";
import { ACTIVE_ACCOUNT_KEY } from "./accountKeys";
import { useApi } from "../lib/api";
import { useToast } from "../hooks/useToast";
import type { ApiAccount, ApiTransaction } from "../types/api";

export { ACCOUNT_COLOURS };

export const ALL_ACCOUNTS_ID = "all" as const;

/** ApiAccount augmented with a derived display colour (not stored server-side). */
export type AccountWithColour = ApiAccount & { colour: string };

export type TransactionWithAccount = ApiTransaction & {
  accountColour?: string;
};

export interface AccountContextValue {
  accounts: AccountWithColour[];
  activeAccountId: string | typeof ALL_ACCOUNTS_ID;
  isLoading: boolean;
  error: string | null;
  setActiveAccountId: (id: string | typeof ALL_ACCOUNTS_ID) => void;
  addAccount: (
    nickname: string,
    accountType: ApiAccount["accountType"],
  ) => Promise<boolean>;
  removeAccount: (id: string) => Promise<boolean>;
  updateAccount: (
    id: string,
    updates: { nickname?: string; accountType?: ApiAccount["accountType"] },
  ) => Promise<boolean>;
  refetch: () => Promise<void>;
}

const AccountContext = createContext<AccountContextValue>({
  accounts: [],
  activeAccountId: DEFAULT_ACCOUNT_ID,
  isLoading: false,
  error: null,
  setActiveAccountId: () => {},
  addAccount: async () => false,
  removeAccount: async () => false,
  updateAccount: async () => false,
  refetch: async () => {},
});

function deriveColour(index: number): string {
  return ACCOUNT_COLOURS[index % ACCOUNT_COLOURS.length];
}

function resolveInitialAccountId(
  accounts: AccountWithColour[],
): string | typeof ALL_ACCOUNTS_ID {
  const stored = localStorage.getItem(ACTIVE_ACCOUNT_KEY);
  if (stored === ALL_ACCOUNTS_ID) return ALL_ACCOUNTS_ID;
  if (stored && accounts.find((a) => a.id === stored)) return stored;
  return accounts[0]?.id ?? DEFAULT_ACCOUNT_ID;
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const { apiFetch } = useApi();
  const { addToast } = useToast();
  const [accounts, setAccounts] = useState<AccountWithColour[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeAccountId, setActiveAccountIdState] = useState<
    string | typeof ALL_ACCOUNTS_ID
  >(DEFAULT_ACCOUNT_ID);
  const [rawTransactions, setRawTransactions] = useState<ApiTransaction[]>([]);

  const fetchAccounts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/accounts");
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setError(body.error ?? "Failed to load accounts");
        return;
      }
      const data = (await res.json()) as { accounts: ApiAccount[] };
      const withColour: AccountWithColour[] = data.accounts.map((acc, i) => ({
        ...acc,
        colour: deriveColour(i),
      }));
      setAccounts(withColour);
      setActiveAccountIdState((prev) => {
        // Resolve initial active account based on loaded accounts
        if (prev === ALL_ACCOUNTS_ID) return ALL_ACCOUNTS_ID;
        if (withColour.find((a) => a.id === prev)) return prev;
        // Try to restore from localStorage
        return resolveInitialAccountId(withColour);
      });
    } catch {
      setError("Failed to load accounts");
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch]);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/accounts");
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setError(body.error ?? "Failed to load accounts.");
        return;
      }
      const data = (await res.json()) as { accounts: ApiAccount[] };
      setAccounts(
        data.accounts.map((acc, i) => ({ ...acc, colour: deriveColour(i) })),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load accounts.");
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    void fetchAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch transactions for the active account(s) whenever accounts or
  // activeAccountId changes.
  useEffect(() => {
    if (accounts.length === 0) {
      setRawTransactions([]);
      return;
    }

    const targetAccounts =
      activeAccountId === ALL_ACCOUNTS_ID
        ? accounts
        : accounts.filter((a) => a.id === activeAccountId);

    if (targetAccounts.length === 0) {
      setRawTransactions([]);
      return;
    }

    let cancelled = false;

    async function fetchTransactions() {
      const results = await Promise.all(
        targetAccounts.map(async (acc) => {
          try {
            const res = await apiFetch(`/api/accounts/${acc.id}/transactions`);
            if (!res.ok) return [] as ApiTransaction[];
            const data = (await res.json()) as {
              transactions: ApiTransaction[];
            };
            return data.transactions;
          } catch {
            return [] as ApiTransaction[];
          }
        }),
      );
      if (!cancelled) {
        setRawTransactions(results.flat());
      }
    }

    void fetchTransactions();

    return () => {
      cancelled = true;
    };
  }, [accounts, activeAccountId, apiFetch]);

  function setActiveAccountId(id: string | typeof ALL_ACCOUNTS_ID) {
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, id);
    setActiveAccountIdState(id);
  }

  const addAccount = useCallback(
    async (
      nickname: string,
      accountType: ApiAccount["accountType"],
    ): Promise<boolean> => {
      // Optimistic: append a temp record immediately
      const tempId = "optimistic-" + crypto.randomUUID();
      setAccounts((prev) => [
        ...prev,
        {
          id: tempId,
          nickname,
          accountType,
          accountNumber: "",
          userId: "",
          createdAt: new Date().toISOString(),
          colour: deriveColour(prev.length),
        },
      ]);
      try {
        const res = await apiFetch("/api/accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nickname, accountType }),
        });
        if (!res.ok) {
          setAccounts((prev) => prev.filter((a) => a.id !== tempId));
          addToast("Failed to add account. Please try again.");
          return false;
        }
        const newAccount = (await res.json()) as ApiAccount;
        setAccounts((prev) =>
          prev.map((a) =>
            a.id === tempId ? { ...newAccount, colour: a.colour } : a,
          ),
        );
        setActiveAccountId(newAccount.id);
        return true;
      } catch {
        setAccounts((prev) => prev.filter((a) => a.id !== tempId));
        addToast("Failed to add account. Please try again.");
        return false;
      }
    },
    [apiFetch, addToast],
  );

  const removeAccount = useCallback(
    async (id: string): Promise<boolean> => {
      // Optimistic: remove immediately, save snapshot for rollback
      let snapshot: AccountWithColour | undefined;
      let snapshotIndex = -1;
      setAccounts((prev) => {
        snapshotIndex = prev.findIndex((a) => a.id === id);
        snapshot = prev[snapshotIndex];
        const remaining = prev.filter((a) => a.id !== id);
        if (remaining.length > 0) {
          setActiveAccountId(remaining[0].id);
        }
        return remaining;
      });
      setRawTransactions((prev) => prev.filter((t) => t.accountId !== id));
      try {
        const res = await apiFetch(`/api/accounts/${id}`, {
          method: "DELETE",
        });
        if (!res.ok && res.status !== 204) {
          // Rollback
          if (snapshot !== undefined) {
            setAccounts((prev) => {
              const copy = [...prev];
              copy.splice(snapshotIndex, 0, snapshot!);
              return copy;
            });
          }
          addToast("Failed to delete account. Please try again.");
          return false;
        }
        return true;
      } catch {
        if (snapshot !== undefined) {
          setAccounts((prev) => {
            const copy = [...prev];
            copy.splice(snapshotIndex, 0, snapshot!);
            return copy;
          });
        }
        addToast("Failed to delete account. Please try again.");
        return false;
      }
    },
    [apiFetch, addToast],
  );

  const updateAccount = useCallback(
    async (
      id: string,
      updates: { nickname?: string; accountType?: ApiAccount["accountType"] },
    ): Promise<boolean> => {
      // Optimistic: apply patch immediately, save previous for rollback
      let previousAccount: AccountWithColour | undefined;
      setAccounts((prev) => {
        previousAccount = prev.find((a) => a.id === id);
        return prev.map((a) => (a.id === id ? { ...a, ...updates } : a));
      });
      try {
        const res = await apiFetch(`/api/accounts/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
        if (!res.ok) {
          if (previousAccount) {
            setAccounts((prev) =>
              prev.map((a) => (a.id === id ? previousAccount! : a)),
            );
          }
          addToast("Failed to update account. Please try again.");
          return false;
        }
        const updated = (await res.json()) as ApiAccount;
        setAccounts((prev) =>
          prev.map((a) => (a.id === id ? { ...updated, colour: a.colour } : a)),
        );
        return true;
      } catch {
        if (previousAccount) {
          setAccounts((prev) =>
            prev.map((a) => (a.id === id ? previousAccount! : a)),
          );
        }
        addToast("Failed to update account. Please try again.");
        return false;
      }
    },
    [apiFetch, addToast],
  );

  return (
    <AccountContext.Provider
      value={{
        accounts,
        activeAccountId,
        isLoading,
        error,
        setActiveAccountId,
        addAccount,
        removeAccount,
        updateAccount,
        refetch,
      }}
    >
      {/* Pass rawTransactions down via a separate context so hooks can read it */}
      <RawTransactionsContext.Provider
        value={{ rawTransactions, setRawTransactions }}
      >
        {children}
      </RawTransactionsContext.Provider>
    </AccountContext.Provider>
  );
}

// ── Internal context for raw transactions ──────────────────────────────────

interface RawTransactionsContextValue {
  rawTransactions: ApiTransaction[];
  setRawTransactions: Dispatch<SetStateAction<ApiTransaction[]>>;
}

const RawTransactionsContext = createContext<RawTransactionsContextValue>({
  rawTransactions: [],
  setRawTransactions: () => {},
});

// eslint-disable-next-line react-refresh/only-export-components
export function useAccount(): AccountContextValue {
  return useContext(AccountContext);
}

function useRawTransactions() {
  return useContext(RawTransactionsContext);
}

/**
 * Returns the sorted union of month keys available for the active account
 * selection. Derived from API transaction data.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useActiveMonths(): string[] {
  const { activeAccountId } = useAccount();
  const { rawTransactions } = useRawTransactions();
  return useMemo(() => {
    const monthSet = new Set<string>();
    for (const t of rawTransactions) {
      // date is YYYY-MM-DD; extract YYYY-MM
      const monthKey = t.date.slice(0, 7);
      monthSet.add(monthKey);
    }
    return Array.from(monthSet).sort();
    // activeAccountId affects which rawTransactions are loaded (via the fetch
    // effect in AccountProvider), so include it in the dep array to re-derive
    // when the selection changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawTransactions, activeAccountId]);
}

/**
 * Returns merged transactions for the given monthKey under the active account
 * selection. When `activeAccountId === 'all'`, merges from all accounts and
 * attaches `accountColour` to each transaction row.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useActiveTransactions(
  monthKey: string | null,
): TransactionWithAccount[] {
  const { accounts, activeAccountId } = useAccount();
  const { rawTransactions } = useRawTransactions();
  return useMemo(() => {
    if (!monthKey) return [];

    const filtered = rawTransactions.filter((t) => t.date.startsWith(monthKey));

    if (activeAccountId === ALL_ACCOUNTS_ID) {
      // Build a colour lookup by accountId
      const colourByAccountId = new Map(accounts.map((a) => [a.id, a.colour]));
      return filtered.map((t) => ({
        ...t,
        accountColour: colourByAccountId.get(t.accountId),
      }));
    }

    // Single-account mode: no accountColour attached
    return filtered;
  }, [rawTransactions, monthKey, accounts, activeAccountId]);
}
