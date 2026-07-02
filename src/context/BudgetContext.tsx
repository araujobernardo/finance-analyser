// FA-BUDG-002 — Budget vs Actual Spend Comparison View
// BudgetContext: manages budgets, budget defaults, preferences, and selected month state.

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
  ApiBudget,
  ApiBudgetDefault,
  ApiUserPreferences,
} from "../types/api";

// ── Context value interface ───────────────────────────────────────────────────

export interface BudgetContextValue {
  budgets: ApiBudget[];
  budgetDefaults: ApiBudgetDefault[];
  preferences: ApiUserPreferences | null;
  selectedYear: number;
  selectedMonth: number;
  loading: boolean;
  setSelectedMonth: (year: number, month: number) => void;
  addBudget: (data: {
    categoryName: string;
    year: number;
    month: number;
    limitAmount: number;
  }) => Promise<void>;
  updateBudget: (id: string, limitAmount: number) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  upsertDefault: (data: {
    categoryName: string;
    limitAmount: number;
  }) => Promise<void>;
  deleteDefault: (id: string) => Promise<void>;
  updatePreferences: (monthStartDay: number) => Promise<void>;
}

// ── Context creation ──────────────────────────────────────────────────────────

const BudgetContext = createContext<BudgetContextValue>({
  budgets: [],
  budgetDefaults: [],
  preferences: null,
  selectedYear: new Date().getFullYear(),
  selectedMonth: new Date().getMonth() + 1,
  loading: false,
  setSelectedMonth: () => {},
  addBudget: async () => {},
  updateBudget: async () => {},
  deleteBudget: async () => {},
  upsertDefault: async () => {},
  deleteDefault: async () => {},
  updatePreferences: async () => {},
});

// ── Provider ──────────────────────────────────────────────────────────────────

export function BudgetProvider({ children }: { children: ReactNode }) {
  const { apiFetch } = useApi();
  const { addToast } = useToast();

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonthState] = useState(now.getMonth() + 1);
  const [budgets, setBudgets] = useState<ApiBudget[]>([]);
  const [budgetDefaults, setBudgetDefaults] = useState<ApiBudgetDefault[]>([]);
  const [preferences, setPreferences] = useState<ApiUserPreferences | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  // ── Fetch budgets for selected month ────────────────────────────────────────

  const fetchBudgets = useCallback(
    async (year: number, month: number) => {
      try {
        const res = await apiFetch(`/api/budgets?year=${year}&month=${month}`);
        if (res.ok) {
          const data = (await res.json()) as ApiBudget[];
          setBudgets(data);
        }
      } catch {
        addToast("Failed to load budgets.");
      }
    },
    [apiFetch, addToast],
  );

  // ── Initial data load ────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function loadAll() {
      try {
        await Promise.all([
          fetchBudgets(selectedYear, selectedMonth),
          apiFetch("/api/budget-defaults").then(async (res) => {
            if (!cancelled && res.ok) {
              const data = (await res.json()) as ApiBudgetDefault[];
              if (!cancelled) setBudgetDefaults(data);
            }
          }),
          apiFetch("/api/preferences").then(async (res) => {
            if (!cancelled && res.ok) {
              const data = (await res.json()) as ApiUserPreferences;
              if (!cancelled) setPreferences(data);
            }
          }),
        ]);
      } catch {
        if (!cancelled) addToast("Failed to load budget data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadAll();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Re-fetch budgets on month change ─────────────────────────────────────────

  const setSelectedMonth = useCallback(
    (year: number, month: number) => {
      setSelectedYear(year);
      setSelectedMonthState(month);
      fetchBudgets(year, month).catch(console.error);
    },
    [fetchBudgets],
  );

  // ── CRUD: budgets ─────────────────────────────────────────────────────────────

  const addBudget = useCallback(
    async (data: {
      categoryName: string;
      year: number;
      month: number;
      limitAmount: number;
    }) => {
      try {
        const res = await apiFetch("/api/budgets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (res.status === 409) {
          addToast("Budget already exists for this category and month.");
          return;
        }
        if (!res.ok) {
          addToast("Failed to add budget. Please try again.");
          return;
        }
        const newBudget = (await res.json()) as ApiBudget;
        setBudgets((prev) => [...prev, newBudget]);
      } catch {
        addToast("Failed to add budget. Please try again.");
      }
    },
    [apiFetch, addToast],
  );

  const updateBudget = useCallback(
    async (id: string, limitAmount: number) => {
      try {
        const res = await apiFetch(`/api/budgets/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ limitAmount }),
        });
        if (!res.ok) {
          addToast("Failed to update budget. Please try again.");
          return;
        }
        const updated = (await res.json()) as ApiBudget;
        setBudgets((prev) => prev.map((b) => (b.id === id ? updated : b)));
      } catch {
        addToast("Failed to update budget. Please try again.");
      }
    },
    [apiFetch, addToast],
  );

  const deleteBudget = useCallback(
    async (id: string) => {
      // Optimistic removal
      let snapshot: ApiBudget | undefined;
      let snapshotIndex = -1;
      setBudgets((prev) => {
        snapshotIndex = prev.findIndex((b) => b.id === id);
        snapshot = prev[snapshotIndex];
        return prev.filter((b) => b.id !== id);
      });

      try {
        const res = await apiFetch(`/api/budgets/${id}`, { method: "DELETE" });
        if (!res.ok && res.status !== 204) {
          if (snapshot !== undefined) {
            setBudgets((prev) => {
              const copy = [...prev];
              copy.splice(snapshotIndex, 0, snapshot!);
              return copy;
            });
          }
          addToast("Failed to delete budget. Please try again.");
        }
      } catch {
        if (snapshot !== undefined) {
          setBudgets((prev) => {
            const copy = [...prev];
            copy.splice(snapshotIndex, 0, snapshot!);
            return copy;
          });
        }
        addToast("Failed to delete budget. Please try again.");
      }
    },
    [apiFetch, addToast],
  );

  // ── CRUD: budget defaults ─────────────────────────────────────────────────────

  const upsertDefault = useCallback(
    async (data: { categoryName: string; limitAmount: number }) => {
      try {
        const res = await apiFetch("/api/budget-defaults", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          addToast("Failed to save budget default. Please try again.");
          return;
        }
        const upserted = (await res.json()) as ApiBudgetDefault;
        setBudgetDefaults((prev) => {
          const exists = prev.find(
            (d) => d.categoryName === upserted.categoryName,
          );
          return exists
            ? prev.map((d) =>
                d.categoryName === upserted.categoryName ? upserted : d,
              )
            : [...prev, upserted];
        });
      } catch {
        addToast("Failed to save budget default. Please try again.");
      }
    },
    [apiFetch, addToast],
  );

  const deleteDefault = useCallback(
    async (id: string) => {
      // Optimistic removal
      let snapshot: ApiBudgetDefault | undefined;
      let snapshotIndex = -1;
      setBudgetDefaults((prev) => {
        snapshotIndex = prev.findIndex((d) => d.id === id);
        snapshot = prev[snapshotIndex];
        return prev.filter((d) => d.id !== id);
      });

      try {
        const res = await apiFetch(`/api/budget-defaults/${id}`, {
          method: "DELETE",
        });
        if (!res.ok && res.status !== 204) {
          if (snapshot !== undefined) {
            setBudgetDefaults((prev) => {
              const copy = [...prev];
              copy.splice(snapshotIndex, 0, snapshot!);
              return copy;
            });
          }
          addToast("Failed to delete budget default. Please try again.");
        }
      } catch {
        if (snapshot !== undefined) {
          setBudgetDefaults((prev) => {
            const copy = [...prev];
            copy.splice(snapshotIndex, 0, snapshot!);
            return copy;
          });
        }
        addToast("Failed to delete budget default. Please try again.");
      }
    },
    [apiFetch, addToast],
  );

  // ── Preferences ───────────────────────────────────────────────────────────────

  const updatePreferences = useCallback(
    async (monthStartDay: number) => {
      try {
        const res = await apiFetch("/api/preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ monthStartDay }),
        });
        if (!res.ok) {
          addToast("Failed to update preferences. Please try again.");
          return;
        }
        const updated = (await res.json()) as ApiUserPreferences;
        setPreferences(updated);
        // Re-fetch budgets so spend totals recalculate with new monthStartDay
        fetchBudgets(selectedYear, selectedMonth).catch(console.error);
      } catch {
        addToast("Failed to update preferences. Please try again.");
      }
    },
    [apiFetch, addToast, fetchBudgets, selectedYear, selectedMonth],
  );

  // ── Provider value ────────────────────────────────────────────────────────────

  return (
    <BudgetContext.Provider
      value={{
        budgets,
        budgetDefaults,
        preferences,
        selectedYear,
        selectedMonth,
        loading,
        setSelectedMonth,
        addBudget,
        updateBudget,
        deleteBudget,
        upsertDefault,
        deleteDefault,
        updatePreferences,
      }}
    >
      {children}
    </BudgetContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBudgets(): BudgetContextValue {
  return useContext(BudgetContext);
}

export { BudgetContext };
