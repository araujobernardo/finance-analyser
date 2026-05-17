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
import type { ApiGoal } from "../types/api";

export interface GoalsContextValue {
  goals: ApiGoal[];
  isLoading: boolean;
  addGoal: (data: {
    name: string;
    type: string;
    targetAmount: number;
    targetDate?: string | null;
    linkedAccountId?: string | null;
    categoryName?: string | null;
  }) => Promise<boolean>;
  updateGoal: (
    id: string,
    updates: {
      name?: string;
      type?: string;
      targetAmount?: number;
      targetDate?: string | null;
      linkedAccountId?: string | null;
      categoryName?: string | null;
      status?: string;
      currentAmount?: number | null;
    },
  ) => Promise<boolean>;
  removeGoal: (id: string) => Promise<boolean>;
}

const GoalsContext = createContext<GoalsContextValue>({
  goals: [],
  isLoading: false,
  addGoal: async () => false,
  updateGoal: async () => false,
  removeGoal: async () => false,
});

export function GoalsProvider({ children }: { children: ReactNode }) {
  const { apiFetch } = useApi();
  const { addToast } = useToast();
  const [goals, setGoals] = useState<ApiGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    async function fetchGoals() {
      try {
        const res = await apiFetch("/api/goals");
        if (cancelled) return;
        if (res.ok) {
          const data = (await res.json()) as { goals: ApiGoal[] };
          if (!cancelled) setGoals(data.goals);
        }
      } catch {
        if (!cancelled) addToast("Failed to load goals.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void fetchGoals();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addGoal = useCallback(
    async (data: {
      name: string;
      type: string;
      targetAmount: number;
      targetDate?: string | null;
      linkedAccountId?: string | null;
      categoryName?: string | null;
    }): Promise<boolean> => {
      const tempId = "optimistic-" + crypto.randomUUID();
      const tempGoal: ApiGoal = {
        id: tempId,
        userId: "",
        name: data.name,
        type: data.type as ApiGoal["type"],
        targetAmount: String(data.targetAmount),
        targetDate: data.targetDate ?? null,
        linkedAccountId: data.linkedAccountId ?? null,
        categoryName: data.categoryName ?? null,
        currentAmount: null,
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setGoals((prev) => [...prev, tempGoal]);
      try {
        const res = await apiFetch("/api/goals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          setGoals((prev) => prev.filter((g) => g.id !== tempId));
          addToast("Failed to add goal. Please try again.");
          return false;
        }
        const newGoal = (await res.json()) as ApiGoal;
        setGoals((prev) => prev.map((g) => (g.id === tempId ? newGoal : g)));
        return true;
      } catch {
        setGoals((prev) => prev.filter((g) => g.id !== tempId));
        addToast("Failed to add goal. Please try again.");
        return false;
      }
    },
    [apiFetch, addToast],
  );

  const updateGoal = useCallback(
    async (
      id: string,
      updates: {
        name?: string;
        type?: string;
        targetAmount?: number;
        targetDate?: string | null;
        linkedAccountId?: string | null;
        categoryName?: string | null;
        status?: string;
        currentAmount?: number | null;
      },
    ): Promise<boolean> => {
      let previousGoal: ApiGoal | undefined;
      setGoals((prev) => {
        previousGoal = prev.find((g) => g.id === id);
        return prev.map((g) =>
          g.id === id
            ? {
                ...g,
                ...updates,
                type: (updates.type ?? g.type) as ApiGoal["type"],
                status: (updates.status ?? g.status) as ApiGoal["status"],
                targetAmount:
                  updates.targetAmount !== undefined
                    ? String(updates.targetAmount)
                    : g.targetAmount,
                currentAmount:
                  "currentAmount" in updates
                    ? updates.currentAmount != null
                      ? String(updates.currentAmount)
                      : null
                    : g.currentAmount,
              }
            : g,
        );
      });
      try {
        const res = await apiFetch(`/api/goals/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
        if (!res.ok) {
          if (previousGoal) {
            setGoals((prev) =>
              prev.map((g) => (g.id === id ? previousGoal! : g)),
            );
          }
          addToast("Failed to update goal. Please try again.");
          return false;
        }
        const updated = (await res.json()) as ApiGoal;
        setGoals((prev) => prev.map((g) => (g.id === id ? updated : g)));
        return true;
      } catch {
        if (previousGoal) {
          setGoals((prev) =>
            prev.map((g) => (g.id === id ? previousGoal! : g)),
          );
        }
        addToast("Failed to update goal. Please try again.");
        return false;
      }
    },
    [apiFetch, addToast],
  );

  const removeGoal = useCallback(
    async (id: string): Promise<boolean> => {
      let snapshot: ApiGoal | undefined;
      let snapshotIndex = -1;
      setGoals((prev) => {
        snapshotIndex = prev.findIndex((g) => g.id === id);
        snapshot = prev[snapshotIndex];
        return prev.filter((g) => g.id !== id);
      });
      try {
        const res = await apiFetch(`/api/goals/${id}`, { method: "DELETE" });
        if (!res.ok && res.status !== 204) {
          if (snapshot !== undefined) {
            setGoals((prev) => {
              const copy = [...prev];
              copy.splice(snapshotIndex, 0, snapshot!);
              return copy;
            });
          }
          addToast("Failed to delete goal. Please try again.");
          return false;
        }
        return true;
      } catch {
        if (snapshot !== undefined) {
          setGoals((prev) => {
            const copy = [...prev];
            copy.splice(snapshotIndex, 0, snapshot!);
            return copy;
          });
        }
        addToast("Failed to delete goal. Please try again.");
        return false;
      }
    },
    [apiFetch, addToast],
  );

  return (
    <GoalsContext.Provider
      value={{
        goals,
        isLoading,
        addGoal,
        updateGoal,
        removeGoal,
      }}
    >
      {children}
    </GoalsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGoals(): GoalsContextValue {
  return useContext(GoalsContext);
}
