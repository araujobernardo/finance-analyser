import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAccount } from "../context/AccountContext";
import { useFileUpload } from "../hooks/useFileUpload";
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
    isLoading: accountsLoading,
    error: accountsError,
    refetch,
  } = useAccount();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [editingShort, setEditingShort] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);

  // Ref-based queue for sequential multi-file uploads (no re-renders needed).
  const fileQueueRef = useRef<File[]>([]);

  const {
    isCategorising,
    importedCount,
    skippedCount,
    isDuplicate,
    duplicateMonth,
    parseErrors,
    handleFile,
    confirmReplace,
    cancelReplace,
  } = useFileUpload({
    accountId: activeAccountId === "all" ? undefined : activeAccountId,
    onImportComplete: () => void refetch(),
  });

  // Drain the queue when a file finishes categorising.
  useEffect(() => {
    if (isCategorising) return;
    // Pop the completed head; if more files remain, schedule the next one.
    const remaining = fileQueueRef.current.slice(1);
    fileQueueRef.current = remaining;
    if (remaining.length > 0) {
      // Defer so we're not calling handleFile synchronously inside an effect.
      const next = remaining[0];
      const id = setTimeout(() => handleFile(next), 0);
      return () => clearTimeout(id);
    }
    // handleFile identity is stable; isCategorising drives the drain.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCategorising]);

  const onFilesSelected = (files: File[]) => {
    if (files.length === 0) return;
    fileQueueRef.current = files;
    // Start with first file immediately.
    handleFile(files[0]);
  };

  const startEdit = (short: string, display: string) => {
    setEditingShort(short);
    setEditVal(display);
  };

  const commitEdit = (short: string) => {
    const v = editVal.trim().slice(0, 20);
    if (v) onRenameAccount(short, v);
    setEditingShort(null);
  };

  // Derive upload status from hook state.
  let uploadStatusMsg: string | null = null;
  let uploadStatusColor = "var(--muted)";

  if (isCategorising) {
    uploadStatusMsg = "Categorising & uploading…";
    uploadStatusColor = "var(--muted)";
  } else if (parseErrors.length > 0) {
    uploadStatusMsg = `Parse error: ${parseErrors[0].message}`;
    uploadStatusColor = "var(--red)";
  } else if (importedCount > 0 || skippedCount > 0) {
    const parts: string[] = [];
    if (importedCount > 0) parts.push(`${importedCount} Imported`);
    if (skippedCount > 0) parts.push(`${skippedCount} duplicates skipped`);
    uploadStatusMsg = parts.join(", ");
    uploadStatusColor = "var(--accent)";
  }

  // Determine which accounts to display. Prefer API accounts; fall back to prop-passed list.
  const displayAccounts =
    accounts.length > 0
      ? accounts.map((a) => ({ short: a.id, display: a.nickname }))
      : accountList;

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-label">Finance</div>
        <div className="sidebar-brand-title">Analyser</div>
        <div className="sidebar-brand-count">{txnCount} transactions</div>
      </div>

      {showAddAccountModal && (
        <AddAccountModal onClose={() => setShowAddAccountModal(false)} />
      )}

      <div className="sidebar-accounts">
        <div className="sidebar-section-header">
          <div className="sidebar-section-label">Accounts</div>
          <button
            className="sidebar-add-account-btn"
            title="Add account"
            aria-label="Add account"
            data-testid="add-account-btn"
            onClick={() => setShowAddAccountModal(true)}
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
          displayAccounts.map((acct, i) => (
            <div
              key={acct.short}
              className="sidebar-account-row"
              data-testid="account-item"
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
                />
              ) : (
                <span className="sidebar-account-name">{acct.display}</span>
              )}
              {editingShort !== acct.short && (
                <button
                  className="sidebar-account-edit"
                  title="Rename account"
                  onClick={() => startEdit(acct.short, acct.display)}
                >
                  ✎
                </button>
              )}
            </div>
          ))
        )}
      </div>

      <div className="sidebar-upload">
        <button
          className="sidebar-upload-btn"
          disabled={isCategorising}
          onClick={() => fileRef.current?.click()}
          data-testid="upload-csv-btn"
        >
          <span className="sidebar-upload-icon">
            {isCategorising ? "⟳" : "↑"}
          </span>{" "}
          {isCategorising ? "Uploading…" : "Upload CSV"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          multiple
          style={{ display: "none" }}
          data-testid="csv-file-input"
          onChange={(e) => {
            if (e.target.files?.length) {
              onFilesSelected(Array.from(e.target.files));
              e.target.value = "";
            }
          }}
        />

        {/* Duplicate month confirmation */}
        {isDuplicate && duplicateMonth && (
          <div
            className="sidebar-upload-duplicate"
            data-testid="duplicate-warning"
          >
            <p>
              Data for <strong>{duplicateMonth}</strong> already exists. Replace
              it?
            </p>
            <div className="sidebar-upload-duplicate-actions">
              <button onClick={confirmReplace} data-testid="confirm-replace">
                Replace
              </button>
              <button onClick={cancelReplace} data-testid="cancel-replace">
                Cancel
              </button>
            </div>
          </div>
        )}

        {uploadStatusMsg && (
          <div
            className="sidebar-upload-status"
            style={{ color: uploadStatusColor }}
            data-testid="upload-status"
          >
            {uploadStatusMsg}
          </div>
        )}
        <div className="sidebar-upload-helper">
          Select multiple files to import all accounts at once
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV.map((n) => (
          <NavLink
            key={n.path}
            to={n.path}
            className={({ isActive }) =>
              `sidebar-nav-btn${isActive ? " active" : ""}`
            }
          >
            <span className="sidebar-nav-icon">{n.icon}</span>
            {n.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">ASB Bank · NZD</div>
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
    </aside>
  );
}
