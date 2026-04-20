import {
  createContext,
  useContext,
  useState,
  useMemo,
  type ReactNode,
} from "react";
import {
  getAccounts,
  getAccountMonths,
  getTransactions,
  saveAccount,
  deleteAccount,
  DEFAULT_ACCOUNT_ID,
} from "../services/storage";
import type { Account } from "../services/storage";
import type { Transaction } from "../utils/csvParser";
import { ACTIVE_ACCOUNT_KEY } from "./accountKeys";

export const ALL_ACCOUNTS_ID = "all" as const;

export interface TransactionWithAccount extends Transaction {
  accountColour?: string;
}

export interface AccountContextValue {
  accounts: Account[];
  activeAccountId: string | typeof ALL_ACCOUNTS_ID;
  setActiveAccountId: (id: string | typeof ALL_ACCOUNTS_ID) => void;
  addAccount: (account: Account) => void;
  removeAccount: (id: string) => void;
}

const AccountContext = createContext<AccountContextValue>({
  accounts: [],
  activeAccountId: DEFAULT_ACCOUNT_ID,
  setActiveAccountId: () => {},
  addAccount: () => {},
  removeAccount: () => {},
});

function resolveInitialAccountId(
  accounts: Account[],
): string | typeof ALL_ACCOUNTS_ID {
  const stored = localStorage.getItem(ACTIVE_ACCOUNT_KEY);
  if (stored === ALL_ACCOUNTS_ID) return ALL_ACCOUNTS_ID;
  if (stored && accounts.find((a) => a.id === stored)) return stored;
  return accounts[0]?.id ?? DEFAULT_ACCOUNT_ID;
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>(() => getAccounts());
  const [activeAccountId, setActiveAccountIdState] = useState<
    string | typeof ALL_ACCOUNTS_ID
  >(() => resolveInitialAccountId(getAccounts()));

  function setActiveAccountId(id: string | typeof ALL_ACCOUNTS_ID) {
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, id);
    setActiveAccountIdState(id);
  }

  function addAccount(account: Account) {
    saveAccount(account);
    setAccounts(getAccounts());
    setActiveAccountId(account.id);
  }

  function removeAccount(id: string) {
    deleteAccount(id);
    const remaining = getAccounts();
    setAccounts(remaining);
    if (remaining.length > 0) {
      setActiveAccountId(remaining[0].id);
    }
  }

  return (
    <AccountContext.Provider
      value={{
        accounts,
        activeAccountId,
        setActiveAccountId,
        addAccount,
        removeAccount,
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
