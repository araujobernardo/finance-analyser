import { useState, useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";
import { useAccount, ALL_ACCOUNTS_ID } from "../context/AccountContext";
import { AddAccountModal } from "./AddAccountModal";
import { DeleteAccountModal } from "./DeleteAccountModal";
import "./NavBar.css";

/** Multi-coloured icon for the All Accounts option */
const AllAccountsIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    aria-hidden="true"
    style={{ flexShrink: 0 }}
  >
    <circle cx="4" cy="7" r="3" fill="#6366f1" />
    <circle cx="7" cy="4" r="3" fill="#22c55e" />
    <circle cx="10" cy="7" r="3" fill="#f59e0b" />
  </svg>
);

const GearIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    style={{ flexShrink: 0 }}
  >
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const NAV_LINKS = [
  { to: "/", label: "Dashboard", end: true, icon: null },
  { to: "/upload", label: "Upload", icon: null },
  { to: "/transactions", label: "Transactions", icon: null },
  { to: "/history", label: "History", icon: null },
  { to: "/settings", label: "Settings", icon: <GearIcon /> },
];

function AccountSelector() {
  const { accounts, activeAccountId, setActiveAccountId } = useAccount();
  const [open, setOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleOutsideClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open]);

  const isLastAccount = accounts.length <= 1;
  const isAllAccounts = activeAccountId === ALL_ACCOUNTS_ID;
  const active = isAllAccounts
    ? null
    : (accounts.find((a) => a.id === activeAccountId) ?? accounts[0]);

  if (accounts.length === 0) {
    return (
      <>
        <button
          type="button"
          className="account-selector__add-btn"
          onClick={() => setShowAddModal(true)}
          aria-label="Add account"
        >
          + Add Account
        </button>
        {showAddModal && (
          <AddAccountModal onClose={() => setShowAddModal(false)} />
        )}
      </>
    );
  }

  return (
    <>
      <div className="account-selector" ref={containerRef}>
        <button
          type="button"
          className="account-selector__trigger"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={
            isAllAccounts
              ? "Active account: All Accounts"
              : `Active account: ${active?.name ?? ""}`
          }
        >
          {isAllAccounts ? (
            <AllAccountsIcon />
          ) : (
            <span
              className="account-dot"
              style={{ background: active?.colour }}
              aria-hidden="true"
            />
          )}
          <span className="account-selector__name">
            {isAllAccounts ? "All Accounts" : (active?.name ?? "")}
          </span>
          <span className="account-selector__arrow" aria-hidden="true">
            ▾
          </span>
        </button>
        {open && (
          <ul
            className="account-selector__menu"
            role="listbox"
            aria-label="Select account"
          >
            <li
              key={ALL_ACCOUNTS_ID}
              role="option"
              aria-selected={isAllAccounts}
              className={
                isAllAccounts
                  ? "account-selector__item account-selector__item--active"
                  : "account-selector__item"
              }
              onClick={() => {
                setActiveAccountId(ALL_ACCOUNTS_ID);
                setOpen(false);
              }}
            >
              <AllAccountsIcon />
              All Accounts
            </li>
            <li
              role="separator"
              className="account-selector__separator"
              aria-hidden="true"
            />
            {accounts.map((acc) => (
              <li
                key={acc.id}
                role="option"
                aria-selected={acc.id === activeAccountId}
                className={
                  acc.id === activeAccountId
                    ? "account-selector__item account-selector__item--active"
                    : "account-selector__item"
                }
                onClick={() => {
                  setActiveAccountId(acc.id);
                  setOpen(false);
                }}
              >
                <span
                  className="account-dot"
                  style={{ background: acc.colour }}
                  aria-hidden="true"
                />
                {acc.name}
              </li>
            ))}
            <li
              role="separator"
              className="account-selector__separator"
              aria-hidden="true"
            />
            <li
              role="option"
              aria-selected={false}
              className="account-selector__item account-selector__item--action"
              onClick={() => {
                setOpen(false);
                setShowAddModal(true);
              }}
            >
              + Add Account
            </li>
            <li
              role="option"
              aria-selected={false}
              aria-disabled={isLastAccount}
              className={`account-selector__item account-selector__item--action account-selector__item--danger${isLastAccount ? " account-selector__item--disabled" : ""}`}
              title={
                isLastAccount ? "Cannot delete the last account" : undefined
              }
              onClick={() => {
                if (isLastAccount) return;
                setOpen(false);
                setShowDeleteModal(true);
              }}
            >
              Delete Account
            </li>
          </ul>
        )}
      </div>
      {showAddModal && (
        <AddAccountModal onClose={() => setShowAddModal(false)} />
      )}
      {showDeleteModal && (
        <DeleteAccountModal
          accountId={activeAccountId}
          onClose={() => setShowDeleteModal(false)}
        />
      )}
    </>
  );
}

export function NavBar() {
  return (
    <nav className="navbar" aria-label="Main navigation">
      <span className="navbar-brand">Finance Analyser</span>
      <ul className="navbar-links">
        {NAV_LINKS.map(({ to, label, end, icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                isActive ? "navbar-link navbar-link--active" : "navbar-link"
              }
            >
              {icon && <span className="navbar-link__icon">{icon}</span>}
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
      <AccountSelector />
    </nav>
  );
}
