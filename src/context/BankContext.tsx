// FA-BANK-003 — Bank Connection React Context

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useApi } from "../lib/api";
import { useToast } from "../hooks/useToast";
import type {
  ApiAkahuConnection,
  ApiAkahuAccountLink,
  SyncResult,
} from "../types/api";

export interface BankContextValue {
  connection: ApiAkahuConnection | null;
  accountLinks: ApiAkahuAccountLink[];
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncResult: SyncResult | null;
  error: string | null;
  connect: (akahuUserId: string, userToken: string) => Promise<boolean>;
  disconnect: () => Promise<boolean>;
  linkAccount: (
    akahuAccountId: string,
    financeAccountId: string,
    akahuAccountName: string,
  ) => Promise<boolean>;
  unlinkAccount: (akahuAccountId: string) => Promise<boolean>;
  syncNow: () => Promise<void>;
  refetch: () => Promise<void>;
}

const BankContext = createContext<BankContextValue>({
  connection: null,
  accountLinks: [],
  isLoading: false,
  isSyncing: false,
  lastSyncResult: null,
  error: null,
  connect: async () => false,
  disconnect: async () => false,
  linkAccount: async () => false,
  unlinkAccount: async () => false,
  syncNow: async () => {},
  refetch: async () => {},
});

export function BankProvider({ children }: { children: ReactNode }) {
  const { apiFetch } = useApi();
  const { addToast } = useToast();

  const [connection, setConnection] = useState<ApiAkahuConnection | null>(null);
  const [accountLinks, setAccountLinks] = useState<ApiAkahuAccountLink[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/bank/connection");
      if (res.status === 404) {
        setConnection(null);
        setAccountLinks([]);
        return;
      }
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setError(body.error ?? "Failed to load bank connection");
        return;
      }
      const data = (await res.json()) as {
        connection: ApiAkahuConnection;
        accountLinks: ApiAkahuAccountLink[];
      };
      setConnection(data.connection);
      setAccountLinks(data.accountLinks);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch]);

  // Load on mount
  useEffect(() => {
    void refetch();
  }, [refetch]);

  const syncNow = useCallback(async () => {
    setIsSyncing(true);
    try {
      const res = await apiFetch("/api/bank/sync", { method: "POST" });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        addToast(body.error ?? "Sync failed");
        return;
      }
      const result = (await res.json()) as SyncResult;
      setLastSyncResult(result);

      if (result.errors.length > 0) {
        addToast(
          `Sync completed with errors: ${result.errors.length} account(s) failed`,
        );
      } else if (result.transactionsAdded > 0) {
        addToast(
          `Synced ${result.transactionsAdded} new transaction${result.transactionsAdded !== 1 ? "s" : ""} across ${result.accountsSynced} account${result.accountsSynced !== 1 ? "s" : ""}`,
        );
      } else {
        addToast("No new transactions found");
      }

      await refetch();
    } finally {
      setIsSyncing(false);
    }
  }, [apiFetch, addToast, refetch]);

  const connect = useCallback(
    async (akahuUserId: string, userToken: string): Promise<boolean> => {
      try {
        const res = await apiFetch("/api/bank/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ akahuUserId, userToken }),
        });
        if (!res.ok) return false;
        await refetch();
        return true;
      } catch {
        return false;
      }
    },
    [apiFetch, refetch],
  );

  const disconnect = useCallback(async (): Promise<boolean> => {
    try {
      const res = await apiFetch("/api/bank/connection", { method: "DELETE" });
      if (!res.ok) return false;
      setConnection(null);
      setAccountLinks([]);
      return true;
    } catch {
      return false;
    }
  }, [apiFetch]);

  const linkAccount = useCallback(
    async (
      akahuAccountId: string,
      financeAccountId: string,
      akahuAccountName: string,
    ): Promise<boolean> => {
      try {
        const res = await apiFetch("/api/bank/accounts/link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            akahuAccountId,
            financeAccountId,
            akahuAccountName,
          }),
        });
        if (!res.ok) return false;
        await refetch();
        return true;
      } catch {
        return false;
      }
    },
    [apiFetch, refetch],
  );

  const unlinkAccount = useCallback(
    async (akahuAccountId: string): Promise<boolean> => {
      try {
        const res = await apiFetch(
          `/api/bank/accounts/link/${akahuAccountId}`,
          { method: "DELETE" },
        );
        if (!res.ok) return false;
        await refetch();
        return true;
      } catch {
        return false;
      }
    },
    [apiFetch, refetch],
  );

  return (
    <BankContext.Provider
      value={{
        connection,
        accountLinks,
        isLoading,
        isSyncing,
        lastSyncResult,
        error,
        connect,
        disconnect,
        linkAccount,
        unlinkAccount,
        syncNow,
        refetch,
      }}
    >
      {children}
    </BankContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBankContext(): BankContextValue {
  return useContext(BankContext);
}
