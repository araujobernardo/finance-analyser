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
