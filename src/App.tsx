import { useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { AccountProvider, useAccount } from "./context/AccountContext";
import { NetWorthProvider } from "./context/NetWorthContext";
import { GoalsProvider } from "./context/GoalsContext";
import { BudgetProvider } from "./context/BudgetContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { PublicOnlyRoute } from "./components/PublicOnlyRoute";
import { Sidebar } from "./components/Sidebar";
import { Toast } from "./components/Toast";
import { AlertBanner } from "./components/AlertBanner";
import { DashboardPage } from "./pages/DashboardPage";
import { TransactionsPage } from "./pages/TransactionsPage";
import { ChatPage } from "./pages/ChatPage";
import { MigrationPage } from "./pages/MigrationPage";
import { SettingsPage } from "./pages/SettingsPage";
import NetWorthPage from "./pages/NetWorthPage";
import { GoalsPage } from "./pages/GoalsPage";
import BudgetPage from "./pages/BudgetPage";
import { SignUpPage } from "./pages/SignUpPage";
import { VerifyEmailPage } from "./pages/VerifyEmailPage";
import { LoginPage } from "./pages/LoginPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { parseCsv } from "./utils/csvParser";
import { parseAccountName } from "./utils/accountParser";
import { categoriseTransactions } from "./services/categorisation";
import type {
  PfaTxn,
  PfaCategory,
  PfaBudgets,
  PfaMerchantMap,
  PfaAccountAliases,
} from "./types/pfa";
import "./App.css";

// ── Storage keys ────────────────────────────────────────────────────────────

const SK = {
  txns: "pfa-v3-transactions",
  mm: "pfa-v3-merchants",
  budgets: "pfa-v3-budgets",
  accounts: "pfa-v3-accounts",
  categories: "pfa-v3-categories",
};

function lsGet<T>(key: string): T | null {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null") as T;
  } catch {
    return null;
  }
}
function lsSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("storage write failed", e);
  }
}

// ── Default categories (from prototype) ─────────────────────────────────────

const DEFAULT_CATEGORIES: PfaCategory[] = [
  { name: "Groceries", color: "#34d399" },
  { name: "Dining & Takeaways", color: "#fbbf24" },
  { name: "Transport", color: "#60a5fa" },
  { name: "Utilities & Bills", color: "#a78bfa" },
  { name: "Health & Medical", color: "#f87171" },
  { name: "Entertainment", color: "#f472b6" },
  { name: "Shopping", color: "#fb923c" },
  { name: "Personal Care", color: "#22d3ee" },
  { name: "Education", color: "#a3e635" },
  { name: "Travel", color: "#818cf8" },
  { name: "Income", color: "#10b981" },
  { name: "Savings", color: "#10b981" },
  { name: "Other", color: "#64748b" },
];

// ── Transfer detection ───────────────────────────────────────────────────────

function detectTransfers(allTxns: PfaTxn[]): PfaTxn[] {
  const accounts = new Set(allTxns.map((t) => t.accountShort));
  if (accounts.size < 2) return allTxns;
  const lookup: Record<string, PfaTxn[]> = {};
  allTxns.forEach((t) => {
    const key = `${t.date}::${Math.abs(t.amount).toFixed(2)}`;
    (lookup[key] ??= []).push(t);
  });
  const ids = new Set<string>();
  Object.values(lookup).forEach((group) => {
    const debits = group.filter((t) => !t.isCredit);
    const credits = group.filter((t) => t.isCredit);
    debits.forEach((d) =>
      credits.forEach((c) => {
        if (d.accountShort !== c.accountShort) {
          ids.add(d.id);
          ids.add(c.id);
        }
      }),
    );
  });
  return allTxns.map((t) =>
    ids.has(t.id) ? { ...t, category: "Savings", isTransfer: true } : t,
  );
}

// ── Migration Guard ──────────────────────────────────────────────────────────
// Redirects to /migrate when the user has localStorage accounts (old system)
// but no API accounts (new system) and hasn't completed the migration yet.
// Must be rendered inside AccountProvider so it can read the context.
function MigrationGuard({ children }: { children: React.ReactNode }) {
  const { needsMigration, isLoading } = useAccount();
  const location = useLocation();

  // Don't redirect while accounts are loading or if already on /migrate
  if (!isLoading && needsMigration && location.pathname !== "/migrate") {
    return <Navigate to="/migrate" replace />;
  }
  return <>{children}</>;
}

// ── App Shell ────────────────────────────────────────────────────────────────
// Rendered inside AuthProvider and ProtectedRoute.
// Keyed on user?.id so ALL data-context state is wiped and re-fetched fresh
// whenever the authenticated user changes (login / logout / switch account).

function AppShell() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [txns, setTxnsState] = useState<PfaTxn[]>(() => {
    const t = lsGet<PfaTxn[]>(SK.txns);
    if (!t || !Array.isArray(t)) return [];
    return t.map((txn) =>
      txn.category === "Savings & Transfers"
        ? { ...txn, category: "Savings" }
        : txn,
    );
  });
  const [mm, setMmState] = useState<PfaMerchantMap>(
    () => lsGet<PfaMerchantMap>(SK.mm) ?? {},
  );
  const [budgets, setBudgetsState] = useState<PfaBudgets>(
    () => lsGet<PfaBudgets>(SK.budgets) ?? {},
  );
  const [categories, setCatsState] = useState<PfaCategory[]>(() => {
    const cats = lsGet<PfaCategory[]>(SK.categories);
    return cats && Array.isArray(cats) && cats.length
      ? cats
      : DEFAULT_CATEGORIES;
  });
  const [accountAliases, setAliasState] = useState<PfaAccountAliases>(() => {
    const a = lsGet<PfaAccountAliases>(SK.accounts);
    return a && typeof a === "object" ? a : {};
  });
  const [selectedMonths, setSelectedMonths] = useState<string[]>(() => {
    const t = lsGet<PfaTxn[]>(SK.txns);
    if (t && Array.isArray(t)) {
      const ms = [...new Set(t.map((x) => x.month))].sort();
      return ms.length ? [ms[ms.length - 1]] : [];
    }
    return [];
  });
  const [uploadStatus, setUploadStatus] = useState<{
    type: "loading" | "success" | "error";
    msg: string;
  } | null>(null);
  const [chatMessages, setChatMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([
    {
      role: "assistant",
      content:
        "Hi! I have full visibility across all your accounts. Ask me anything — spending by account, trends, where to cut back. Inter-account transfers are excluded from all totals.",
    },
  ]);

  // Persisted setters
  const setTxns = (v: PfaTxn[]) => {
    setTxnsState(v);
    lsSet(SK.txns, v);
  };
  const setMm = (v: PfaMerchantMap) => {
    setMmState(v);
    lsSet(SK.mm, v);
  };
  const setBudgets = (v: PfaBudgets) => {
    setBudgetsState(v);
    lsSet(SK.budgets, v);
  };
  const setCategories = (v: PfaCategory[]) => {
    setCatsState(v);
    lsSet(SK.categories, v);
  };
  const setAccountAliases = (v: PfaAccountAliases) => {
    setAliasState(v);
    lsSet(SK.accounts, v);
  };

  // Derive unique account list from txns (preserving order of first appearance)
  const accountList: { short: string; display: string }[] = [];
  const _seen = new Set<string>();
  txns.forEach((t) => {
    if (!_seen.has(t.accountShort)) {
      _seen.add(t.accountShort);
      accountList.push({ short: t.accountShort, display: t.account });
    }
  });

  const months = [...new Set(txns.map((t) => t.month))].sort();
  const currentMonths = selectedMonths.length
    ? selectedMonths
    : months.length
      ? [months[months.length - 1]]
      : [];

  // Rename account: update alias store + all txns retroactively
  const handleRenameAccount = (short: string, newName: string) => {
    const newAliases = { ...accountAliases, [short]: newName };
    const newTxns = txns.map((t) =>
      t.accountShort === short ? { ...t, account: newName } : t,
    );
    setAccountAliases(newAliases);
    setTxns(newTxns);
  };

  // Upload one or more CSV files
  const handleUpload = async (files: File[]) => {
    setUploadStatus({
      type: "loading",
      msg: `Parsing ${files.length} file${files.length > 1 ? "s" : ""}...`,
    });
    try {
      const existingIds = new Set(txns.map((t) => t.id));
      const allNew: PfaTxn[] = [];

      for (const file of files) {
        const text = await file.text();
        const acct = parseAccountName(text, accountAliases);
        const { transactions, errors } = parseCsv(text);

        if (errors.length && !transactions.length) {
          setUploadStatus({ type: "error", msg: errors[0].message });
          return;
        }

        transactions.forEach((t, idx) => {
          const dateStr = t.date.toISOString().slice(0, 10);
          const month = dateStr.slice(0, 7);
          const uid = `${dateStr}-${Math.abs(t.amount).toFixed(2)}-${idx}`;
          const id = `${acct.short}::${uid}`;
          if (!existingIds.has(id)) {
            existingIds.add(id);
            allNew.push({
              id,
              date: dateStr,
              month,
              type: "",
              payee: t.description,
              memo: "",
              amount: t.amount,
              isCredit: t.amount > 0,
              account: acct.display,
              accountShort: acct.short,
              category: t.category ?? t.categoryOverride ?? null,
              isTransfer: false,
            });
          }
        });
      }

      if (!allNew.length) {
        setUploadStatus({
          type: "error",
          msg: "No new transactions found — already imported?",
        });
        return;
      }

      const combined = detectTransfers([...txns, ...allNew]);
      const newMm = { ...mm };
      const needsCat = combined.filter(
        (t) =>
          allNew.some((n) => n.id === t.id) && !t.isTransfer && !t.category,
      );

      if (needsCat.length) {
        setUploadStatus({
          type: "loading",
          msg: `Categorising ${needsCat.length} transactions with AI...`,
        });
        const bridgeTxns = needsCat.map((t) => ({
          date: new Date(t.date),
          description: t.payee || t.memo,
          amount: t.amount,
        }));
        const categorised = await categoriseTransactions(bridgeTxns);
        const catMap = new Map(
          needsCat.map((t, i) => [t.id, categorised[i].category ?? null]),
        );
        combined.forEach((t) => {
          if (catMap.has(t.id)) {
            const cat = catMap.get(t.id) ?? null;
            t.category = cat;
            if (cat) newMm[t.payee.toLowerCase()] = cat;
          } else if (
            !t.isTransfer &&
            !t.category &&
            newMm[t.payee.toLowerCase()]
          ) {
            t.category = newMm[t.payee.toLowerCase()];
          }
        });
      }

      setTxns(combined);
      setMm(newMm);
      const newMonths = [...new Set(allNew.map((t) => t.month))].sort();
      setSelectedMonths([newMonths[newMonths.length - 1]]);
      const tCount = Math.round(
        combined.filter(
          (t) => t.isTransfer && allNew.some((n) => n.id === t.id),
        ).length / 2,
      );
      setUploadStatus({
        type: "success",
        msg: `Imported ${allNew.length} transactions${tCount ? ` · ${tCount} transfer${tCount > 1 ? "s" : ""} detected` : ""}`,
      });
      setTimeout(() => setUploadStatus(null), 5000);
      void navigate("/dashboard");
    } catch (e) {
      setUploadStatus({
        type: "error",
        msg: `Error: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  };

  // Bulk category update from Transactions tab — also updates merchant map
  const handleBulkCategoryChange = (updatedTxns: PfaTxn[]) => {
    setTxns(updatedTxns);
    const newMm = { ...mm };
    updatedTxns
      .filter((t) => t.category && !t.isTransfer)
      .forEach((t) => {
        newMm[t.payee.toLowerCase()] = t.category!;
      });
    setMm(newMm);
  };

  // Key the entire data-provider subtree on the authenticated user's id.
  // When the user changes (login / logout), React unmounts every provider and
  // re-mounts a fresh instance — guaranteeing all context state is reset and
  // re-fetched with the new user's JWT. This is the primary fix for the
  // cross-user data-isolation bug (#677).
  const userKey = user?.id ?? "unauthenticated";

  return (
    <ToastProvider key={userKey}>
      <AccountProvider>
        <MigrationGuard>
          <GoalsProvider>
            <div className="app-shell">
              <Sidebar
                onUpload={handleUpload}
                uploadStatus={uploadStatus}
                txnCount={txns.length}
                accountList={accountList}
                onRenameAccount={handleRenameAccount}
              />
              <div className="app-content">
                <AlertBanner />
                <Routes>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route
                    path="/dashboard"
                    element={
                      <DashboardPage
                        txns={txns}
                        months={months}
                        selectedMonths={currentMonths}
                        setSelectedMonths={setSelectedMonths}
                        budgets={budgets}
                        accountList={accountList}
                        categories={categories}
                      />
                    }
                  />
                  <Route
                    path="/transactions"
                    element={
                      <TransactionsPage
                        txns={txns}
                        accountList={accountList}
                        categories={categories}
                        onBulkCategoryChange={handleBulkCategoryChange}
                      />
                    }
                  />
                  <Route
                    path="/chat"
                    element={
                      <ChatPage
                        txns={txns}
                        budgets={budgets}
                        categories={categories}
                        messages={chatMessages}
                        setMessages={setChatMessages}
                      />
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <SettingsPage
                        categories={categories}
                        setCategories={setCategories}
                        budgets={budgets}
                        setBudgets={setBudgets}
                        txns={txns}
                        setTxns={setTxns}
                        accountList={accountList}
                        onRenameAccount={handleRenameAccount}
                      />
                    }
                  />
                  <Route path="/migrate" element={<MigrationPage />} />
                  <Route
                    path="/net-worth"
                    element={
                      <NetWorthProvider>
                        <NetWorthPage />
                      </NetWorthProvider>
                    }
                  />
                  <Route path="/goals" element={<GoalsPage />} />
                  <Route
                    path="/budget"
                    element={
                      <BudgetProvider>
                        <BudgetPage />
                      </BudgetProvider>
                    }
                  />
                </Routes>
              </div>
            </div>
            <Toast />
          </GoalsProvider>
        </MigrationGuard>
      </AccountProvider>
    </ToastProvider>
  );
}

// ── Root App ────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public auth routes — redirect to /dashboard if already signed in */}
        <Route
          path="/signup"
          element={
            <PublicOnlyRoute>
              <SignUpPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <LoginPage />
            </PublicOnlyRoute>
          }
        />
        <Route path="/verify-email-sent" element={<VerifyEmailPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route
          path="/forgot-password"
          element={
            <PublicOnlyRoute>
              <ForgotPasswordPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/reset-password"
          element={
            <PublicOnlyRoute>
              <ResetPasswordPage />
            </PublicOnlyRoute>
          }
        />
        {/* Protected app shell — all other routes */}
        <Route
          path="*"
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
}
