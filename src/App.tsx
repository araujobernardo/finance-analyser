import { useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { DashboardPage } from "./pages/DashboardPage";
import { TransactionsPage } from "./pages/TransactionsPage";
import { ChatPage } from "./pages/ChatPage";
import { SettingsPage } from "./pages/SettingsPage";
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
  { name: "Savings & Transfers", color: "#475569" },
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
    ids.has(t.id)
      ? { ...t, category: "Savings & Transfers", isTransfer: true }
      : t,
  );
}

// ── Root App ────────────────────────────────────────────────────────────────

type Tab = "dashboard" | "transactions" | "chat" | "settings";

export default function App() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [txns, setTxnsState] = useState<PfaTxn[]>(() => {
    const t = lsGet<PfaTxn[]>(SK.txns);
    return t && Array.isArray(t) ? t : [];
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
      setTab("dashboard");
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

  return (
    <div className="app-shell">
      <Sidebar
        tab={tab}
        setTab={(t) => setTab(t as Tab)}
        onUpload={handleUpload}
        uploadStatus={uploadStatus}
        txnCount={txns.length}
        accountList={accountList}
        onRenameAccount={handleRenameAccount}
      />
      <div className="app-content">
        {tab === "dashboard" && (
          <DashboardPage
            txns={txns}
            months={months}
            selectedMonths={currentMonths}
            setSelectedMonths={setSelectedMonths}
            budgets={budgets}
            accountList={accountList}
            categories={categories}
          />
        )}
        {tab === "transactions" && (
          <TransactionsPage
            txns={txns}
            accountList={accountList}
            categories={categories}
            onBulkCategoryChange={handleBulkCategoryChange}
          />
        )}
        {tab === "chat" && (
          <ChatPage
            txns={txns}
            budgets={budgets}
            categories={categories}
            messages={chatMessages}
            setMessages={setChatMessages}
          />
        )}
        {tab === "settings" && (
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
        )}
      </div>
    </div>
  );
}
