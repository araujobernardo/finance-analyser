import { useState, useEffect } from "react";
import { ACCOUNT_COLORS } from "../constants/colors";
import type { PfaTxn, PfaCategory, PfaBudgets } from "../types/pfa";
import "./SettingsPage.css";

const EXTRA_COLORS = [
  "#e879f9",
  "#38bdf8",
  "#fb7185",
  "#4ade80",
  "#facc15",
  "#c084fc",
  "#f97316",
];

interface Props {
  categories: PfaCategory[];
  setCategories: (v: PfaCategory[]) => void;
  budgets: PfaBudgets;
  setBudgets: (v: PfaBudgets) => void;
  txns: PfaTxn[];
  setTxns: (v: PfaTxn[]) => void;
  accountList: { short: string; display: string }[];
  onRenameAccount: (short: string, name: string) => void;
}

export function SettingsPage({
  categories,
  setCategories,
  budgets,
  setBudgets,
  txns,
  setTxns,
  accountList,
  onRenameAccount,
}: Props) {
  const months = [...new Set(txns.map((t) => t.month))].sort();

  const [catEdits, setCatEdits] = useState(() =>
    categories.map((c) => ({ ...c })),
  );
  const [budgetEdits, setBudgetEdits] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(budgets).map(([k, v]) => [k, String(v)])),
  );
  const [newCatName, setNewCatName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{
    name: string;
    count: number;
  } | null>(null);
  const [reassignTo, setReassignTo] = useState("");
  const [acctEdits, setAcctEdits] = useState<Record<string, string>>(() =>
    Object.fromEntries(accountList.map((a) => [a.short, a.display])),
  );
  const [flash, setFlash] = useState("");

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setCatEdits(categories.map((c) => ({ ...c }))), [categories]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBudgetEdits(
      Object.fromEntries(
        Object.entries(budgets).map(([k, v]) => [k, String(v)]),
      ),
    );
  }, [budgets]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAcctEdits(
      Object.fromEntries(accountList.map((a) => [a.short, a.display])),
    );
  }, [accountList]);

  const showFlash = (msg: string) => {
    setFlash(msg);
    setTimeout(() => setFlash(""), 2500);
  };

  const saveCategories = () => {
    const names = catEdits.map((c) => c.name.trim()).filter(Boolean);
    if (new Set(names).size !== names.length) {
      showFlash("⚠ Duplicate category names — please fix");
      return;
    }
    const nameMap: Record<string, string> = {};
    catEdits.forEach((c, i) => {
      const oldName = categories[i]?.name;
      const newName = c.name.trim();
      if (oldName && oldName !== newName) nameMap[oldName] = newName;
    });
    const newBudgets: PfaBudgets = {};
    Object.entries(budgetEdits).forEach(([k, v]) => {
      const mapped = nameMap[k] ?? k;
      const n = parseFloat(v);
      if (n > 0) newBudgets[mapped] = n;
    });
    const finalCats = catEdits
      .map((c) => ({ name: c.name.trim(), color: c.color }))
      .filter((c) => c.name);
    let newTxns = txns;
    if (Object.keys(nameMap).length) {
      newTxns = txns.map((t) =>
        t.category && nameMap[t.category]
          ? { ...t, category: nameMap[t.category] }
          : t,
      );
    }
    setCategories(finalCats);
    setBudgets(newBudgets);
    if (newTxns !== txns) setTxns(newTxns);
    setBudgetEdits(
      Object.fromEntries(
        Object.entries(newBudgets).map(([k, v]) => [k, String(v)]),
      ),
    );
    showFlash("✓ Categories & budgets saved");
  };

  const addCategory = () => {
    const name = newCatName.trim().slice(0, 20);
    if (!name) return;
    if (catEdits.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      showFlash("⚠ Category already exists");
      return;
    }
    const color = EXTRA_COLORS[catEdits.length % EXTRA_COLORS.length];
    setCatEdits((prev) => [...prev, { name, color }]);
    setNewCatName("");
  };

  const initiateDelete = (cat: PfaCategory) => {
    const count = txns.filter((t) => t.category === cat.name).length;
    setDeleteTarget({ name: cat.name, count });
    setReassignTo("");
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const finalCats = catEdits.filter((c) => c.name !== deleteTarget.name);
    const newBudgets = { ...budgetEdits };
    delete newBudgets[deleteTarget.name];
    let newTxns = txns;
    if (deleteTarget.count > 0) {
      newTxns = txns.map((t) =>
        t.category === deleteTarget.name
          ? { ...t, category: reassignTo || null }
          : t,
      );
    }
    setCatEdits(finalCats);
    setBudgetEdits(newBudgets);
    setCategories(finalCats);
    setBudgets(
      Object.fromEntries(
        Object.entries(newBudgets)
          .map(([k, v]) => [k, parseFloat(v)])
          .filter(([, v]) => v > 0),
      ),
    );
    if (newTxns !== txns) setTxns(newTxns);
    setDeleteTarget(null);
    showFlash(`✓ "${deleteTarget.name}" removed`);
  };

  const saveAccounts = () => {
    for (const [short, name] of Object.entries(acctEdits)) {
      const trimmed = name.trim().slice(0, 20);
      const current = accountList.find((a) => a.short === short)?.display;
      if (trimmed && trimmed !== current) onRenameAccount(short, trimmed);
    }
    showFlash("✓ Account names saved");
  };

  const isWarning = flash.startsWith("⚠");

  return (
    <div className="settings-scroll">
      <h1 className="settings-title">Settings</h1>

      {/* Section 1: No-API notice */}
      <div className="card settings-api-notice">
        <div className="settings-api-label">◎ Finance Analyser</div>
        <div className="settings-api-body">
          Configure your categories, budgets, and accounts below. AI
          categorisation requires a <code>VITE_ANTHROPIC_API_KEY</code>{" "}
          environment variable.
        </div>
      </div>

      {/* Section 2: Your Data */}
      <div className="card settings-section">
        <div className="settings-section-title">Your Data</div>
        <div className="settings-data-grid">
          {[
            { label: "Transactions", value: txns.length },
            { label: "Months", value: months.length },
            { label: "Accounts", value: accountList.length },
            {
              label: "Transfers detected",
              value: txns.filter((t) => t.isTransfer).length,
            },
          ].map(({ label, value }) => (
            <div key={label} className="settings-data-row">
              <span className="settings-data-label">{label}</span>
              <span className="settings-data-value mono">{value}</span>
            </div>
          ))}
        </div>
        <button
          className="btn-danger"
          onClick={() => {
            if (confirm("Delete all transaction data? This cannot be undone."))
              setTxns([]);
          }}
        >
          Clear All Data
        </button>
      </div>

      {/* Section 3: Accounts */}
      {accountList.length > 0 && (
        <div className="card settings-section">
          <div className="settings-section-title">Accounts</div>
          <div className="settings-section-sub">
            Rename accounts (max 20 characters). Applied retroactively to all
            transactions.
          </div>
          {accountList.map((acct, i) => (
            <div key={acct.short} className="settings-acct-row">
              <span
                className="settings-acct-dot"
                style={{
                  background: ACCOUNT_COLORS[i % ACCOUNT_COLORS.length],
                }}
              />
              <input
                className="settings-input settings-acct-input"
                value={acctEdits[acct.short] ?? ""}
                onChange={(e) =>
                  setAcctEdits((prev) => ({
                    ...prev,
                    [acct.short]: e.target.value.slice(0, 20),
                  }))
                }
              />
              <span className="settings-acct-count">
                {txns.filter((t) => t.accountShort === acct.short).length} txns
              </span>
            </div>
          ))}
          <button className="btn-accent" onClick={saveAccounts}>
            Save Account Names
          </button>
        </div>
      )}

      {/* Section 4: Categories & Budgets */}
      <div className="card settings-section">
        <div className="settings-section-title">Categories &amp; Budgets</div>
        <div className="settings-section-sub">
          Manage spending categories and set monthly budget targets (applied
          across all accounts).
        </div>

        {flash && (
          <div
            className="settings-flash"
            style={{
              color: isWarning ? "var(--amber)" : "var(--accent)",
              background: isWarning
                ? "color-mix(in srgb,var(--amber) 8%,transparent)"
                : "color-mix(in srgb,var(--accent) 8%,transparent)",
              borderColor: isWarning
                ? "color-mix(in srgb,var(--amber) 25%,transparent)"
                : "color-mix(in srgb,var(--accent) 25%,transparent)",
            }}
          >
            {flash}
          </div>
        )}

        {/* Delete confirmation panel */}
        {deleteTarget && (
          <div className="settings-delete-panel">
            <div className="settings-delete-title">
              Remove "{deleteTarget.name}"?
            </div>
            {deleteTarget.count > 0 && (
              <div className="settings-delete-sub">
                {deleteTarget.count} transaction
                {deleteTarget.count !== 1 ? "s are" : " is"} currently assigned
                to this category.
              </div>
            )}
            <div className="settings-delete-actions">
              {deleteTarget.count > 0 && (
                <>
                  <span className="settings-delete-label">Reassign to:</span>
                  <select
                    className="settings-input"
                    value={reassignTo}
                    onChange={(e) => setReassignTo(e.target.value)}
                  >
                    <option value="">Leave uncategorised</option>
                    {catEdits
                      .filter((c) => c.name !== deleteTarget.name)
                      .map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </>
              )}
              <button className="btn-danger" onClick={confirmDelete}>
                Confirm Remove
              </button>
              <button
                className="btn-ghost"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Column headers */}
        <div className="settings-cat-header">
          <div className="settings-cat-color-col" />
          <div className="settings-cat-name-col">Category name</div>
          <div className="settings-cat-budget-col">Budget/mo</div>
          <div className="settings-cat-del-col" />
        </div>

        {/* Category rows */}
        <div className="settings-cat-list">
          {catEdits.map((cat, i) => (
            <div key={i} className="settings-cat-row">
              <input
                type="color"
                value={cat.color}
                onChange={(e) =>
                  setCatEdits((prev) =>
                    prev.map((c, j) =>
                      j === i ? { ...c, color: e.target.value } : c,
                    ),
                  )
                }
                className="settings-color-picker"
                title="Pick colour"
              />
              <input
                className="settings-input settings-cat-name-input"
                value={cat.name}
                onChange={(e) =>
                  setCatEdits((prev) =>
                    prev.map((c, j) =>
                      j === i ? { ...c, name: e.target.value.slice(0, 20) } : c,
                    ),
                  )
                }
                placeholder="Category name"
              />
              <input
                type="number"
                className="settings-input settings-budget-input mono"
                placeholder="—"
                value={budgetEdits[cat.name] ?? ""}
                onChange={(e) =>
                  setBudgetEdits((prev) => ({
                    ...prev,
                    [cat.name]: e.target.value,
                  }))
                }
              />
              <button
                className="settings-delete-btn"
                onClick={() => initiateDelete(cat)}
                title="Remove"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {/* Add new category */}
        <div className="settings-add-row">
          <input
            className="settings-input settings-add-input"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value.slice(0, 20))}
            onKeyDown={(e) => e.key === "Enter" && addCategory()}
            placeholder="New category name (max 20 chars)..."
          />
          <button className="btn-accent-outline" onClick={addCategory}>
            + Add
          </button>
        </div>

        <button className="btn-accent" onClick={saveCategories}>
          Save Categories &amp; Budgets
        </button>
      </div>
    </div>
  );
}
