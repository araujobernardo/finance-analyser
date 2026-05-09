import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  type ReactNode,
} from "react";
import {
  getAccountMonths,
  getTransactions,
  DEFAULT_ACCOUNT_ID,
  ACCOUNT_COLOURS,
} from "../services/storage";
import type { Transaction } from "../utils/csvParser";
import { ACTIVE_ACCOUNT_KEY } from "./accountKeys";
import { useApi } from "../lib/api";
import type { ApiAccount } from "../types/api";

export { ACCOUNT_COLOURS };

export const ALL_ACCOUNTS_ID = "all" as const;

/** ApiAccount augmented with a derived display colour (not stored server-side). */
export type AccountWithColour = ApiAccount & { colour: string };

export interface TransactionWithAccount extends Transaction {
  accountColour?: string;
}

export interface AccountContextValue {
  accounts: AccountWithColour[];
  activeAccountId: string | typeof ALL_ACCOUNTS_ID;
  isLoading: boolean;
  error: string | null;
  setActiveAccountId: (id: string | typeof ALL_ACCOUNTS_ID) => void;
  addAccount: (
    nickname: string,
    accountType: ApiAccount["accountType"],
  ) => Promise<void>;
  removeAccount: (id: string) => Promise<void>;
  updateAccount: (
    id: string,
    updates: { nickname?: string; accountType?: ApiAccount["accountType"] },
  ) => Promise<void>;
}

const AccountContext = createContext<AccountContextValue>({
  accounts: [],
  activeAccountId: DEFAULT_ACCOUNT_ID,
  isLoading: false,
  error: null,
  setActiveAccountId: () => {},
  addAccount: async () => {},
  removeAccount: async () => {},
  updateAccount: async () => {},
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
  const [accounts, setAccounts] = useState<AccountWithColour[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeAccountId, setActiveAccountIdState] = useState<
    string | typeof ALL_ACCOUNTS_ID
  >(DEFAULT_ACCOUNT_ID);

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

  useEffect(() => {
    void fetchAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setActiveAccountId(id: string | typeof ALL_ACCOUNTS_ID) {
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, id);
    setActiveAccountIdState(id);
  }

  const addAccount = useCallback(
    async (nickname: string, accountType: ApiAccount["accountType"]) => {
      const res = await apiFetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, accountType }),
      });
      if (!res.ok) return;
      const newAccount = (await res.json()) as ApiAccount;
      setAccounts((prev) => {
        const updated = [
          ...prev,
          { ...newAccount, colour: deriveColour(prev.length) },
        ];
        return updated;
      });
      setActiveAccountId(newAccount.id);
    },
    [apiFetch],
  );

  const removeAccount = useCallback(
    async (id: string) => {
      const res = await apiFetch(`/api/accounts/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) return;
      setAccounts((prev) => {
        const remaining = prev.filter((a) => a.id !== id);
        if (remaining.length > 0) {
          setActiveAccountId(remaining[0].id);
        }
        return remaining;
      });
    },
    [apiFetch],
  );

  const updateAccount = useCallback(
    async (
      id: string,
      updates: { nickname?: string; accountType?: ApiAccount["accountType"] },
    ) => {
      const res = await apiFetch(`/api/accounts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) return;
      const updated = (await res.json()) as ApiAccount;
      setAccounts((prev) =>
        prev.map((a) => (a.id === id ? { ...updated, colour: a.colour } : a)),
      );
    },
    [apiFetch],
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
      }}
    >
      {children}
    </AccountContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAccount(): AccountContextValue {
  return useContext(AccountContext);
}

/**
 * Returns the sorted union of month keys available for the active account
 * selection. When `activeAccountId === 'all'`, returns months across all accounts.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useActiveMonths(): string[] {
  const { accounts, activeAccountId } = useAccount();
  return useMemo(() => {
    if (activeAccountId === ALL_ACCOUNTS_ID) {
      const monthSet = new Set<string>();
      for (const acc of accounts) {
        for (const m of getAccountMonths(acc.id)) {
          monthSet.add(m);
        }
      }
      return Array.from(monthSet).sort();
    }
    return getAccountMonths(activeAccountId).sort();
  }, [accounts, activeAccountId]);
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
  return useMemo(() => {
    if (!monthKey) return [];
    if (activeAccountId === ALL_ACCOUNTS_ID) {
      const merged: TransactionWithAccount[] = [];
      for (const acc of accounts) {
        const { transactions } = getTransactions(acc.id, monthKey);
        for (const t of transactions) {
          merged.push({ ...t, accountColour: acc.colour });
        }
      }
      return merged;
    }
    return getTransactions(activeAccountId, monthKey).transactions;
  }, [accounts, activeAccountId, monthKey]);
}
