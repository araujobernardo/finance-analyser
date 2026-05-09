import { useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAccount } from "../context/AccountContext";
import { Skeleton } from "./Skeleton";
import { ACCOUNT_COLORS } from "../constants/colors";
import "./Sidebar.css";

interface UploadStatus {
  type: "loading" | "success" | "error";
  msg: string;
}

interface AccountEntry {
  short: string;
  display: string;
}

interface SidebarProps {
  onUpload: (files: File[]) => void;
  uploadStatus: UploadStatus | null;
  txnCount: number;
  accountList: AccountEntry[];
  onRenameAccount: (short: string, name: string) => void;
}

const NAV = [
  { path: "/dashboard", icon: "⬡", label: "Dashboard" },
  { path: "/transactions", icon: "≡", label: "Transactions" },
  { path: "/chat", icon: "◎", label: "AI Chat" },
  { path: "/settings", icon: "◈", label: "Settings" },
];

export function Sidebar({
  onUpload,
  uploadStatus,
  txnCount,
  accountList,
  onRenameAccount,
}: SidebarProps) {
  const { logout } = useAuth();
  const {
    isLoading: accountsLoading,
    error: accountsError,
    refetch,
  } = useAccount();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [editingShort, setEditingShort] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");

  const startEdit = (short: string, display: string) => {
    setEditingShort(short);
    setEditVal(display);
  };

  const commitEdit = (short: string) => {
    const v = editVal.trim().slice(0, 20);
    if (v) onRenameAccount(short, v);
    setEditingShort(null);
  };

  const statusColor =
    uploadStatus?.type === "error"
      ? "var(--red)"
      : uploadStatus?.type === "success"
        ? "var(--accent)"
        : "var(--muted)";

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-label">Finance</div>
        <div className="sidebar-brand-title">Analyser</div>
        <div className="sidebar-brand-count">{txnCount} transactions</div>
      </div>

      <div className="sidebar-accounts">
        <div className="sidebar-section-label">Accounts</div>
        {accountsLoading ? (
          <Skeleton count={3} height="2.5rem" />
        ) : accountsError ? (
          <div className="account-list-error">
            <p>Failed to load accounts.</p>
            <button onClick={() => void refetch()}>Try again</button>
          </div>
        ) : (
          accountList.map((acct, i) => (
            <div key={acct.short} className="sidebar-account-row">
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
          onClick={() => fileRef.current?.click()}
        >
          <span className="sidebar-upload-icon">↑</span> Upload CSV
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          multiple
          style={{ display: "none" }}
          onChange={(e) => {
            if (e.target.files?.length) {
              onUpload(Array.from(e.target.files));
              e.target.value = "";
            }
          }}
        />
        {uploadStatus && (
          <div className="sidebar-upload-status" style={{ color: statusColor }}>
            {uploadStatus.type === "loading" && "⟳ "}
            {uploadStatus.msg}
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
