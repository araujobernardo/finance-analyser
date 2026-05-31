// FA-BANK-003 T004 / T006 [US1/US2] — Bank Connection Page

import { useState } from "react";
import { useBankContext } from "../context/BankContext";
import { useAccount } from "../context/AccountContext";
import type { ApiAkahuAccountLink } from "../types/api";
import "./BankConnectionPage.css";

// ── AccountMappingRow ─────────────────────────────────────────────────────────

function AccountMappingRow({ link }: { link: ApiAkahuAccountLink }) {
  const { linkAccount, unlinkAccount } = useBankContext();
  const { accounts } = useAccount();

  function formatBalance(): string {
    if (link.lastBalance === null) return "—";
    return `NZD ${parseFloat(link.lastBalance).toFixed(2)}`;
  }

  function formatDate(iso: string | null): string {
    if (!iso) return "Not yet synced";
    return new Date(iso).toLocaleDateString("en-NZ", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  async function handleLinkChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    if (value === "") {
      await unlinkAccount(link.akahuAccountId);
    } else {
      const selectedAccount = accounts.find((a) => a.id === value);
      const accountName = selectedAccount?.nickname ?? link.akahuAccountName;
      await linkAccount(link.akahuAccountId, value, accountName);
    }
  }

  function syncStatusBadge() {
    const statusMap: Record<string, { className: string; label: string }> = {
      active: {
        className: "bank-status-badge bank-status-active",
        label: "Active",
      },
      syncing: {
        className: "bank-status-badge bank-status-syncing",
        label: "Syncing…",
      },
      error: {
        className: "bank-status-badge bank-status-error",
        label: "Error",
      },
      disconnected: {
        className: "bank-status-badge bank-status-disconnected",
        label: "Disconnected",
      },
    };
    const status = statusMap[link.syncStatus] ?? statusMap["active"]!;
    return (
      <span className={status.className} data-testid="sync-status-badge">
        {status.label}
      </span>
    );
  }

  return (
    <tr className="bank-mapping-row" data-testid="account-mapping-row">
      <td>
        <div className="bank-mapping-name" data-testid="akahu-account-name">
          {link.akahuAccountName}
        </div>
        <div className="bank-mapping-type">{link.akahuAccountType ?? "—"}</div>
      </td>
      <td data-testid="akahu-balance">{formatBalance()}</td>
      <td data-testid="akahu-last-synced">
        {formatDate(link.lastTransactionSyncedAt)}
      </td>
      <td>
        <select
          className="bank-select"
          value={link.financeAccountId ?? ""}
          onChange={(e) => void handleLinkChange(e)}
          data-testid="account-link-select"
        >
          <option value="">Not linked</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nickname}
            </option>
          ))}
        </select>
      </td>
      <td>
        {syncStatusBadge()}
        {link.syncStatus === "error" && link.syncError && (
          <div className="bank-sync-error" data-testid="sync-error-text">
            {link.syncError}
          </div>
        )}
      </td>
    </tr>
  );
}

// ── AccountMappingList ────────────────────────────────────────────────────────

function AccountMappingList() {
  const { accountLinks } = useBankContext();

  return (
    <div className="bank-card" data-testid="account-mapping-list">
      <h2 className="bank-card-title">Your Akahu Accounts</h2>
      {accountLinks.length === 0 ? (
        <p className="bank-empty-state" data-testid="no-accounts-message">
          No Akahu accounts found. Try syncing first.
        </p>
      ) : (
        <table className="bank-mapping-table">
          <thead>
            <tr>
              <th>Account</th>
              <th>Balance</th>
              <th>Last synced</th>
              <th>Link to</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {accountLinks.map((link) => (
              <AccountMappingRow key={link.akahuAccountId} link={link} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── ConnectionStatusCard ──────────────────────────────────────────────────────

function ConnectionStatusCard() {
  const { connection, isLoading, disconnect } = useBankContext();

  if (!connection) return null;

  function formatDate(iso: string | null): string {
    if (!iso) return "Never synced";
    return new Date(iso).toLocaleDateString("en-NZ", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  async function handleDisconnect() {
    const confirmed = window.confirm(
      "Disconnect your Akahu account? This will remove all account links.",
    );
    if (confirmed) {
      await disconnect();
    }
  }

  return (
    <div className="bank-card" data-testid="connection-status-card">
      <h2 className="bank-card-title">Connected to Akahu</h2>
      <dl className="bank-meta">
        <dt>Connected since</dt>
        <dd data-testid="connected-at">{formatDate(connection.connectedAt)}</dd>
        <dt>Last synced</dt>
        <dd data-testid="last-synced-at">
          {formatDate(connection.lastSyncedAt)}
        </dd>
      </dl>
      <button
        className="bank-btn-danger"
        onClick={() => void handleDisconnect()}
        disabled={isLoading}
        data-testid="disconnect-btn"
      >
        Disconnect
      </button>
    </div>
  );
}

// ── ConnectForm ───────────────────────────────────────────────────────────────

function ConnectForm() {
  const { isLoading, connect } = useBankContext();
  const [akahuUserId, setAkahuUserId] = useState("");
  const [userToken, setUserToken] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await connect(akahuUserId, userToken);
  }

  return (
    <div className="bank-card" data-testid="connect-form-card">
      <h2 className="bank-card-title">Connect to Akahu</h2>
      <p className="bank-help-text">Get these from my.akahu.nz/developers</p>
      <form onSubmit={(e) => void handleSubmit(e)} data-testid="connect-form">
        <div className="bank-field">
          <label htmlFor="akahu-user-id" className="bank-label">
            Akahu User ID
          </label>
          <input
            id="akahu-user-id"
            className="bank-input"
            type="text"
            value={akahuUserId}
            onChange={(e) => setAkahuUserId(e.target.value)}
            required
            data-testid="akahu-user-id-input"
          />
        </div>
        <div className="bank-field">
          <label htmlFor="user-token" className="bank-label">
            User Token
          </label>
          <input
            id="user-token"
            className="bank-input"
            type="password"
            value={userToken}
            onChange={(e) => setUserToken(e.target.value)}
            required
            data-testid="user-token-input"
          />
        </div>
        <p className="bank-privacy-note" data-testid="privacy-note">
          Your bank credentials are never stored. Only your Akahu tokens are
          saved, and you can revoke access at any time from my.akahu.nz.
        </p>
        <button
          type="submit"
          className="bank-btn-primary"
          disabled={isLoading}
          data-testid="connect-submit-btn"
        >
          {isLoading ? "Connecting…" : "Connect"}
        </button>
      </form>
    </div>
  );
}

// ── BankConnectionPage ────────────────────────────────────────────────────────

export function BankConnectionPage() {
  const { connection, error } = useBankContext();

  return (
    <main className="bank-page" data-testid="bank-connection-page">
      <h1 className="bank-page-title">Bank Connection</h1>
      {error && (
        <p className="bank-error" data-testid="bank-error">
          {error}
        </p>
      )}
      {connection !== null ? (
        <>
          <ConnectionStatusCard />
          <AccountMappingList />
        </>
      ) : (
        <ConnectForm />
      )}
    </main>
  );
}
