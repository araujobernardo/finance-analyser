export interface ApiAccount {
  id: string;
  userId: string;
  accountNumber: string;
  nickname: string;
  accountType: "Checking" | "Savings" | "Credit Card" | "Investment" | "Cash";
  createdAt: string;
}

export interface ApiTransaction {
  id: string;
  userId: string;
  accountId: string;
  date: string; // YYYY-MM-DD
  amount: number; // parseFloat applied server-side
  description: string;
  category: string | null;
  isTransfer: boolean;
  isManualTransfer: boolean;
  createdAt: string;
}

export interface ImportResult {
  imported: number;
  skipped: number;
}

export interface ApiAsset {
  id: string;
  userId: string;
  name: string;
  type: string;
  value: string; // postgres-js returns numeric columns as strings; always call parseFloat() before arithmetic
  linkedAccountId: string | null;
  // FA-NW-004: auto-sync fields (added by migration 0006_auto_sync_flag.sql)
  autoSync: boolean;
  balanceClamped: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiLiability {
  id: string;
  userId: string;
  name: string;
  type: string;
  value: string; // postgres-js returns numeric columns as strings; always call parseFloat() before arithmetic
  linkedAccountId: string | null;
  // FA-NW-004: auto-sync fields (added by migration 0006_auto_sync_flag.sql)
  autoSync: boolean;
  balanceClamped: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiSnapshot {
  id: string;
  userId: string;
  totalAssets: string; // postgres-js returns numeric columns as strings; always call parseFloat() before arithmetic
  totalLiabilities: string;
  netWorth: string;
  snapshotDate: string;
  createdAt: string;
}

export interface ApiGoal {
  id: string;
  userId: string;
  name: string;
  type:
    | "savings_target"
    | "debt_payoff"
    | "net_worth_milestone"
    | "spending_limit";
  targetAmount: string; // numeric string — call parseFloat() before arithmetic
  targetDate: string | null; // YYYY-MM-DD
  linkedAccountId: string | null;
  categoryName: string | null;
  currentAmount: string | null; // numeric string — call parseFloat() before arithmetic
  status: "active" | "achieved" | "abandoned";
  createdAt: string;
  updatedAt: string;
}

// FA-BUDG-002 — Budget vs Actual Spend Comparison View

export interface ApiBudget {
  id: string;
  categoryName: string;
  year: number;
  month: number;
  limitAmount: number; // parsed from numeric string
  actualSpend: number; // calculated by server
  remaining: number; // limitAmount - actualSpend (can be negative)
  percentageUsed: number; // 0–∞, not capped
}

export interface ApiBudgetDefault {
  id: string;
  categoryName: string;
  limitAmount: number;
}

export interface ApiUserPreferences {
  id: string;
  monthStartDay: number; // 1–28
}
