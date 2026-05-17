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
import type { ApiAsset, ApiLiability } from "../types/api";

export interface NetWorthContextValue {
  assets: ApiAsset[];
  liabilities: ApiLiability[];
  isLoading: boolean;
  refreshNetWorth: () => void;
  addAsset: (data: {
    name: string;
    type: string;
    value: number;
    linkedAccountId?: string | null;
  }) => Promise<boolean>;
  updateAsset: (
    id: string,
    updates: {
      name?: string;
      type?: string;
      value?: number;
      linkedAccountId?: string | null;
      autoSync?: boolean;
    },
  ) => Promise<boolean>;
  removeAsset: (id: string) => Promise<boolean>;
  addLiability: (data: {
    name: string;
    type: string;
    value: number;
    linkedAccountId?: string | null;
  }) => Promise<boolean>;
  updateLiability: (
    id: string,
    updates: {
      name?: string;
      type?: string;
      value?: number;
      linkedAccountId?: string | null;
      autoSync?: boolean;
    },
  ) => Promise<boolean>;
  removeLiability: (id: string) => Promise<boolean>;
}

const NetWorthContext = createContext<NetWorthContextValue>({
  assets: [],
  liabilities: [],
  isLoading: false,
  refreshNetWorth: () => undefined,
  addAsset: async () => false,
  updateAsset: async () => false,
  removeAsset: async () => false,
  addLiability: async () => false,
  updateLiability: async () => false,
  removeLiability: async () => false,
});

export function NetWorthProvider({ children }: { children: ReactNode }) {
  const { apiFetch } = useApi();
  const { addToast } = useToast();
  const [assets, setAssets] = useState<ApiAsset[]>([]);
  const [liabilities, setLiabilities] = useState<ApiLiability[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    async function fetchAll() {
      try {
        const [assetsRes, liabilitiesRes] = await Promise.all([
          apiFetch("/api/assets"),
          apiFetch("/api/liabilities"),
        ]);
        if (cancelled) return;

        if (assetsRes.ok) {
          const data = (await assetsRes.json()) as { assets: ApiAsset[] };
          if (!cancelled) setAssets(data.assets);
        }
        if (liabilitiesRes.ok) {
          const data = (await liabilitiesRes.json()) as {
            liabilities: ApiLiability[];
          };
          if (!cancelled) setLiabilities(data.liabilities);
        }
      } catch {
        if (!cancelled) addToast("Failed to load net worth data.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void fetchAll();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // FA-NW-004 US3: re-fetch net worth data after transaction mutations
  const refreshNetWorth = useCallback(() => {
    async function doRefresh() {
      try {
        const [assetsRes, liabilitiesRes] = await Promise.all([
          apiFetch("/api/assets"),
          apiFetch("/api/liabilities"),
        ]);
        if (assetsRes.ok) {
          const data = (await assetsRes.json()) as { assets: ApiAsset[] };
          setAssets(data.assets);
        }
        if (liabilitiesRes.ok) {
          const data = (await liabilitiesRes.json()) as {
            liabilities: ApiLiability[];
          };
          setLiabilities(data.liabilities);
        }
      } catch {
        // silently ignore refresh errors — stale data is acceptable
      }
    }
    void doRefresh();
  }, [apiFetch]);

  // ── Assets ────────────────────────────────────────────────────────────────

  const addAsset = useCallback(
    async (data: {
      name: string;
      type: string;
      value: number;
      linkedAccountId?: string | null;
    }): Promise<boolean> => {
      const tempId = "optimistic-" + crypto.randomUUID();
      const tempAsset: ApiAsset = {
        id: tempId,
        userId: "",
        name: data.name,
        type: data.type,
        value: String(data.value),
        linkedAccountId: data.linkedAccountId ?? null,
        autoSync: true,
        balanceClamped: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setAssets((prev) => [...prev, tempAsset]);
      try {
        const res = await apiFetch("/api/assets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          setAssets((prev) => prev.filter((a) => a.id !== tempId));
          addToast("Failed to add asset. Please try again.");
          return false;
        }
        const newAsset = (await res.json()) as ApiAsset;
        setAssets((prev) => prev.map((a) => (a.id === tempId ? newAsset : a)));
        return true;
      } catch {
        setAssets((prev) => prev.filter((a) => a.id !== tempId));
        addToast("Failed to add asset. Please try again.");
        return false;
      }
    },
    [apiFetch, addToast],
  );

  const updateAsset = useCallback(
    async (
      id: string,
      updates: {
        name?: string;
        type?: string;
        value?: number;
        linkedAccountId?: string | null;
        autoSync?: boolean;
      },
    ): Promise<boolean> => {
      let previousAsset: ApiAsset | undefined;
      setAssets((prev) => {
        previousAsset = prev.find((a) => a.id === id);
        return prev.map((a) =>
          a.id === id
            ? {
                ...a,
                ...updates,
                value:
                  updates.value !== undefined ? String(updates.value) : a.value,
              }
            : a,
        );
      });
      try {
        const res = await apiFetch(`/api/assets/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
        if (!res.ok) {
          if (previousAsset) {
            setAssets((prev) =>
              prev.map((a) => (a.id === id ? previousAsset! : a)),
            );
          }
          addToast("Failed to update asset. Please try again.");
          return false;
        }
        const updated = (await res.json()) as ApiAsset;
        setAssets((prev) => prev.map((a) => (a.id === id ? updated : a)));
        return true;
      } catch {
        if (previousAsset) {
          setAssets((prev) =>
            prev.map((a) => (a.id === id ? previousAsset! : a)),
          );
        }
        addToast("Failed to update asset. Please try again.");
        return false;
      }
    },
    [apiFetch, addToast],
  );

  const removeAsset = useCallback(
    async (id: string): Promise<boolean> => {
      let snapshot: ApiAsset | undefined;
      let snapshotIndex = -1;
      setAssets((prev) => {
        snapshotIndex = prev.findIndex((a) => a.id === id);
        snapshot = prev[snapshotIndex];
        return prev.filter((a) => a.id !== id);
      });
      try {
        const res = await apiFetch(`/api/assets/${id}`, { method: "DELETE" });
        if (!res.ok && res.status !== 204) {
          if (snapshot !== undefined) {
            setAssets((prev) => {
              const copy = [...prev];
              copy.splice(snapshotIndex, 0, snapshot!);
              return copy;
            });
          }
          addToast("Failed to delete asset. Please try again.");
          return false;
        }
        return true;
      } catch {
        if (snapshot !== undefined) {
          setAssets((prev) => {
            const copy = [...prev];
            copy.splice(snapshotIndex, 0, snapshot!);
            return copy;
          });
        }
        addToast("Failed to delete asset. Please try again.");
        return false;
      }
    },
    [apiFetch, addToast],
  );

  // ── Liabilities ───────────────────────────────────────────────────────────

  const addLiability = useCallback(
    async (data: {
      name: string;
      type: string;
      value: number;
      linkedAccountId?: string | null;
    }): Promise<boolean> => {
      const tempId = "optimistic-" + crypto.randomUUID();
      const tempLiability: ApiLiability = {
        id: tempId,
        userId: "",
        name: data.name,
        type: data.type,
        value: String(data.value),
        linkedAccountId: data.linkedAccountId ?? null,
        autoSync: true,
        balanceClamped: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setLiabilities((prev) => [...prev, tempLiability]);
      try {
        const res = await apiFetch("/api/liabilities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          setLiabilities((prev) => prev.filter((l) => l.id !== tempId));
          addToast("Failed to add liability. Please try again.");
          return false;
        }
        const newLiability = (await res.json()) as ApiLiability;
        setLiabilities((prev) =>
          prev.map((l) => (l.id === tempId ? newLiability : l)),
        );
        return true;
      } catch {
        setLiabilities((prev) => prev.filter((l) => l.id !== tempId));
        addToast("Failed to add liability. Please try again.");
        return false;
      }
    },
    [apiFetch, addToast],
  );

  const updateLiability = useCallback(
    async (
      id: string,
      updates: {
        name?: string;
        type?: string;
        value?: number;
        linkedAccountId?: string | null;
        autoSync?: boolean;
      },
    ): Promise<boolean> => {
      let previousLiability: ApiLiability | undefined;
      setLiabilities((prev) => {
        previousLiability = prev.find((l) => l.id === id);
        return prev.map((l) =>
          l.id === id
            ? {
                ...l,
                ...updates,
                value:
                  updates.value !== undefined ? String(updates.value) : l.value,
              }
            : l,
        );
      });
      try {
        const res = await apiFetch(`/api/liabilities/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
        if (!res.ok) {
          if (previousLiability) {
            setLiabilities((prev) =>
              prev.map((l) => (l.id === id ? previousLiability! : l)),
            );
          }
          addToast("Failed to update liability. Please try again.");
          return false;
        }
        const updated = (await res.json()) as ApiLiability;
        setLiabilities((prev) => prev.map((l) => (l.id === id ? updated : l)));
        return true;
      } catch {
        if (previousLiability) {
          setLiabilities((prev) =>
            prev.map((l) => (l.id === id ? previousLiability! : l)),
          );
        }
        addToast("Failed to update liability. Please try again.");
        return false;
      }
    },
    [apiFetch, addToast],
  );

  const removeLiability = useCallback(
    async (id: string): Promise<boolean> => {
      let snapshot: ApiLiability | undefined;
      let snapshotIndex = -1;
      setLiabilities((prev) => {
        snapshotIndex = prev.findIndex((l) => l.id === id);
        snapshot = prev[snapshotIndex];
        return prev.filter((l) => l.id !== id);
      });
      try {
        const res = await apiFetch(`/api/liabilities/${id}`, {
          method: "DELETE",
        });
        if (!res.ok && res.status !== 204) {
          if (snapshot !== undefined) {
            setLiabilities((prev) => {
              const copy = [...prev];
              copy.splice(snapshotIndex, 0, snapshot!);
              return copy;
            });
          }
          addToast("Failed to delete liability. Please try again.");
          return false;
        }
        return true;
      } catch {
        if (snapshot !== undefined) {
          setLiabilities((prev) => {
            const copy = [...prev];
            copy.splice(snapshotIndex, 0, snapshot!);
            return copy;
          });
        }
        addToast("Failed to delete liability. Please try again.");
        return false;
      }
    },
    [apiFetch, addToast],
  );

  return (
    <NetWorthContext.Provider
      value={{
        assets,
        liabilities,
        isLoading,
        refreshNetWorth,
        addAsset,
        updateAsset,
        removeAsset,
        addLiability,
        updateLiability,
        removeLiability,
      }}
    >
      {children}
    </NetWorthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNetWorth(): NetWorthContextValue {
  return useContext(NetWorthContext);
}
