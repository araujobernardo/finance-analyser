import { useState, useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";
import { useAccount } from "../context/AccountContext";
import "./NavBar.css";

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

  if (accounts.length === 0) return null;

  const active = accounts.find((a) => a.id === activeAccountId) ?? accounts[0];

  return (
    <div className="account-selector" ref={containerRef}>
      <button
        type="button"
        className="account-selector__trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Active account: ${active.name}`}
      >
        <span
          className="account-dot"
          style={{ background: active.colour }}
          aria-hidden="true"
        />
        <span className="account-selector__name">{active.name}</span>
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
        </ul>
      )}
    </div>
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
