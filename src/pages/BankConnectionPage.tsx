// FA-BANK-003 T004 [US1] — Bank Connection Page

import { useState } from "react";
import { useBankContext } from "../context/BankContext";
import "./BankConnectionPage.css";

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
      {connection !== null ? <ConnectionStatusCard /> : <ConnectForm />}
    </main>
  );
}
