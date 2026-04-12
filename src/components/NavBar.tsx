import { useState, useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";
import { useAccount } from "../context/AccountContext";
import "./NavBar.css";

const NAV_LINKS = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/upload", label: "Upload" },
  { to: "/transactions", label: "Transactions" },
  { to: "/history", label: "History" },
  { to: "/settings", label: "Settings" },
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
        {NAV_LINKS.map(({ to, label, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                isActive ? "navbar-link navbar-link--active" : "navbar-link"
              }
            >
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
      <AccountSelector />
    </nav>
  );
}
