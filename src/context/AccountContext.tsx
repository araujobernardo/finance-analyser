import { createContext, useContext, useState, type ReactNode } from "react";
import {
  getAccounts,
  saveAccount,
  deleteAccount,
  DEFAULT_ACCOUNT_ID,
} from "../services/storage";
import type { Account } from "../services/storage";
import { ACTIVE_ACCOUNT_KEY } from "./accountKeys";

export interface AccountContextValue {
  accounts: Account[];
  activeAccountId: string;
  setActiveAccountId: (id: string) => void;
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

function resolveInitialAccountId(accounts: Account[]): string {
  const stored = localStorage.getItem(ACTIVE_ACCOUNT_KEY);
  if (stored && accounts.find((a) => a.id === stored)) return stored;
  return accounts[0]?.id ?? DEFAULT_ACCOUNT_ID;
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>(() => getAccounts());
  const [activeAccountId, setActiveAccountIdState] = useState<string>(() =>
    resolveInitialAccountId(getAccounts()),
  );

  function setActiveAccountId(id: string) {
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
