import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAccount, useAllTransactions } from "../context/AccountContext";
import { useBankContext } from "../context/BankContext";
import { useAutoSync } from "../hooks/useAutoSync";
import { useToast } from "../hooks/useToast";
import { useApi } from "../lib/api";
import { Skeleton } from "./Skeleton";
import { AddAccountModal } from "./AddAccountModal";
import { ACCOUNT_COLORS } from "../constants/colors";
import "./Sidebar.css";

interface AccountEntry {
  short: string;
  display: string;
}

interface SidebarProps {
  txnCount?: number;
  accountList?: AccountEntry[];
  onRenameAccount?: (short: string, name: string) => void;
}

const NAV = [
  { path: "/dashboard", icon: "⬡", label: "Dashboard" },
  { path: "/transactions", icon: "≡", label: "Transactions" },
  { path: "/chat", icon: "◎", label: "AI Chat" },
  { path: "/net-worth", icon: "◈", label: "Net Worth" },
  { path: "/goals", icon: "◉", label: "Goals" },
  { path: "/budget", icon: "◧", label: "Budget" },
  { path: "/settings", icon: "⚙", label: "Settings" },
];

export function Sidebar({
  txnCount = 0,
  accountList = [],
  onRenameAccount = () => {},
}: SidebarProps) {
  const { logout } = useAuth();
  const {
    accounts,
    activeAccountId,
    setActiveAccountId,
    isLoading: accountsLoading,
    error: accountsError,
    refetch,
  } = useAccount();
  const {
    connection,
    accountLinks,
    isLoading: bankLoading,
    isSyncing,
    syncNow,
  } = useBankContext();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { apiFetch } = useApi();
  const rawTransactions = useAllTransactions();

  // Build stable categorise options for useAutoSync (memoised to keep the
  // effect dep-array stable and avoid re-triggering the auto-sync).
  const categoriseOptions = useMemo(
    () => ({
      transactions: rawTransactions,
      apiFetch,
      refetch,
      onError: (message: string) => addToast(message),
    }),

    [rawTransactions, apiFetch, refetch, addToast],
  );

  // Trigger an automatic sync on load if last sync was >24 h ago (or never).
  // On success, auto-categorise uncategorised transactions.
  useAutoSync(connection, bankLoading, syncNow, categoriseOptions);

  // Format a lastBalance string from the API (postgres-js returns numeric as string)
  // as a NZD currency string. Returns null when the value is absent or non-numeric.
  function formatBalance(raw: string | null): string | null {
    if (raw === null) return null;
    const n = parseFloat(raw);
    if (isNaN(n)) return null;
    return new Intl.NumberFormat("en-NZ", {
      style: "currency",
      currency: "NZD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  }

  // Compute the sum of all linked account balances for the "All Accounts" row.
  // Returns null when no linked account has a balance.
  const allAccountsTotalFormatted = (() => {
    const validBalances = accountLinks
      .map((l) => l.lastBalance)
      .filter((b): b is string => b !== null)
      .map((b) => parseFloat(b))
      .filter((n) => !isNaN(n));
    if (validBalances.length === 0) return null;
    const total = validBalances.reduce((sum, n) => sum + n, 0);
    return (
      new Intl.NumberFormat("en-NZ", {
        style: "currency",
        currency: "NZD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(total) + " total"
    );
  })();
  const [editingShort, setEditingShort] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerPanelRef = useRef<HTMLDivElement>(null);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  // Close drawer on Escape key
  useEffect(() => {
    if (!drawerOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDrawer();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [drawerOpen, closeDrawer]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  const startEdit = (short: string, display: string) => {
    setEditingShort(short);
    setEditVal(display);
  };

  const commitEdit = (short: string) => {
    const v = editVal.trim().slice(0, 20);
    if (v) onRenameAccount(short, v);
    setEditingShort(null);
  };

  // Determine which accounts to display. Prefer API accounts; fall back to prop-passed list.
  const displayAccounts =
    accounts.length > 0
      ? accounts.map((a) => ({ short: a.id, display: a.nickname }))
      : accountList;

  // Shared account list JSX — used in both desktop sidebar and mobile drawer
  const accountListJsx = (opts: { onSelect?: () => void } = {}) => (
    <>
      {isSyncing && (
        <div className="sidebar-sync-status" data-testid="sync-status">
          Syncing…
        </div>
      )}
      <div className="sidebar-accounts">
        <div className="sidebar-section-label">Accounts</div>
        <div
          className={`sidebar-all-accounts-row${activeAccountId === "all" ? " sidebar-all-accounts-row--active" : ""}`}
          data-testid="account-all-accounts"
          role="button"
          tabIndex={0}
          aria-pressed={activeAccountId === "all"}
          onClick={() => {
            setActiveAccountId("all");
            opts.onSelect?.();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setActiveAccountId("all");
              opts.onSelect?.();
            }
          }}
        >
          <div className="sidebar-all-accounts-dot" />
          <div className="sidebar-all-accounts-info">
            <span className="sidebar-all-accounts-label">All Accounts</span>
            {allAccountsTotalFormatted !== null && (
              <span
                className="sidebar-balance-sub"
                data-testid="all-accounts-balance"
              >
                {allAccountsTotalFormatted}
              </span>
            )}
          </div>
          <button
            className="sidebar-add-account-btn"
            title="Add account"
            aria-label="Add account"
            data-testid="add-account-btn"
            onClick={(e) => {
              e.stopPropagation();
              setShowAddAccountModal(true);
            }}
          >
            +
          </button>
        </div>

        {accountsLoading ? (
          <Skeleton count={3} height="2.5rem" />
        ) : accountsError ? (
          <div className="account-list-error">
            <p>Failed to load accounts.</p>
            <button onClick={() => void refetch()}>Try again</button>
          </div>
        ) : (
          displayAccounts.map((acct, i) => {
            const isActive = acct.short === activeAccountId;
            return (
              <div
                key={acct.short}
                className={`sidebar-account-row sidebar-account-row--indented${isActive ? " sidebar-account-row--active" : ""}`}
                data-testid="account-item"
                data-active={isActive ? "true" : undefined}
                role="button"
                tabIndex={0}
                aria-pressed={isActive}
                onClick={() => {
                  setActiveAccountId(acct.short);
                  opts.onSelect?.();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setActiveAccountId(acct.short);
                    opts.onSelect?.();
                  }
                }}
              >
                <div
                  className="sidebar-account-dot"
                  style={{
                    background: ACCOUNT_COLORS[i % ACCOUNT_COLORS.length],
                  }}
                />
                {editingShort === acct.short ? (
                  <input
                    className="sidebar-account-input"
                    value={editVal}
                    autoFocus
                    onChange={(e) => setEditVal(e.target.value.slice(0, 20))}
                    onBlur={() => commitEdit(acct.short)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitEdit(acct.short);
                      if (e.key === "Escape") setEditingShort(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <div className="sidebar-account-info">
                    <span className="sidebar-account-name">{acct.display}</span>
                    {(() => {
                      const link = accountLinks.find(
                        (l) => l.financeAccountId === acct.short,
                      );
                      const formatted = link
                        ? formatBalance(link.lastBalance)
                        : null;
                      return formatted !== null ? (
                        <span
                          className="sidebar-balance-sub"
                          data-testid="account-balance"
                        >
                          {formatted}
                        </span>
                      ) : null;
                    })()}
                  </div>
                )}
                {editingShort !== acct.short && (
                  <button
                    className="sidebar-account-edit"
                    title="Rename account"
                    onClick={(e) => {
                      e.stopPropagation();
                      startEdit(acct.short, acct.display);
                    }}
                  >
                    ✎
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </>
  );

  // Shared nav JSX — used in both desktop sidebar and mobile drawer
  const navJsx = (opts: { onNavigate?: () => void } = {}) => (
    <nav className="sidebar-nav">
      {NAV.map((n) => (
        <NavLink
          key={n.path}
          to={n.path}
          className={({ isActive }) =>
            `sidebar-nav-btn${isActive ? " active" : ""}`
          }
          onClick={opts.onNavigate}
        >
          <span className="sidebar-nav-icon">{n.icon}</span>
          {n.label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <>
      {/* ── Mobile top bar (hidden on desktop) ──────────────────────────── */}
      <div className="mobile-topbar" data-testid="mobile-topbar">
        <button
          className="hamburger-btn"
          aria-label="Open menu"
          aria-expanded={drawerOpen}
          aria-controls="mobile-drawer"
          onClick={openDrawer}
          data-testid="hamburger-btn"
        >
          <span className="hamburger-line" />
          <span className="hamburger-line" />
          <span className="hamburger-line" />
        </button>
        <span className="mobile-topbar-title">Finance Analyser</span>
      </div>

      {/* ── Mobile drawer overlay (hidden on desktop) ────────────────────── */}
      <div
        id="mobile-drawer"
        className={`drawer-overlay${drawerOpen ? " drawer-overlay--open" : ""}`}
        aria-hidden={!drawerOpen}
        data-testid="mobile-drawer"
      >
        {/* Backdrop — tap to close */}
        <div
          className="drawer-backdrop"
          aria-hidden="true"
          onClick={closeDrawer}
          data-testid="drawer-backdrop"
        />
        {/* Drawer panel — only rendered when open to avoid duplicate testIds */}
        <div
          ref={drawerPanelRef}
          className="drawer-panel"
          role="dialog"
          aria-label="Navigation menu"
          aria-modal="true"
        >
          {drawerOpen && (
            <>
              {/* Header row */}
              <div className="drawer-header">
                <div className="sidebar-brand-label">
                  <span className="sidebar-brand-dot" />
                  FINANCE
                </div>
                <button
                  className="drawer-close-btn"
                  aria-label="Close menu"
                  onClick={closeDrawer}
                  data-testid="drawer-close-btn"
                >
                  ✕
                </button>
              </div>
              <div className="drawer-brand-title">Analyser</div>
              <div className="drawer-brand-count">{txnCount} transactions</div>

              <div className="sidebar-divider" />

              {/* Account list — selecting closes drawer */}
              {accountListJsx({ onSelect: closeDrawer })}

              {/* Nav — navigating closes drawer */}
              {navJsx({ onNavigate: closeDrawer })}

              <div className="sidebar-footer">
                <span>ASB Bank · NZD</span>
                <button
                  className="sidebar-signout"
                  data-testid="drawer-signout"
                  onClick={() => {
                    closeDrawer();
                    logout();
                    navigate("/login");
                  }}
                >
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Desktop sidebar (hidden on mobile) ──────────────────────────── */}
      <aside className="sidebar" data-testid="desktop-sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-label">
            <span className="sidebar-brand-dot" />
            FINANCE
          </div>
          <div className="sidebar-brand-title">Analyser</div>
          <div className="sidebar-brand-count">{txnCount} transactions</div>
        </div>

        {showAddAccountModal && (
          <AddAccountModal onClose={() => setShowAddAccountModal(false)} />
        )}

        {accountListJsx()}

        {navJsx()}

        <div className="sidebar-footer">
          <span>ASB Bank · NZD</span>
          <button
            className="sidebar-signout"
            data-testid="sidebar-signout"
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
