import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  getAccounts,
  getAccountMonths,
  getTransactions,
} from "../services/storage";

export function MigrationPage() {
  const navigate = useNavigate();

  const { totalAccounts, totalTransactions } = useMemo(() => {
    const accounts = getAccounts();
    let txnCount = 0;
    for (const acc of accounts) {
      for (const month of getAccountMonths(acc.id)) {
        txnCount += getTransactions(acc.id, month).transactions.length;
      }
    }
    return { totalAccounts: accounts.length, totalTransactions: txnCount };
  }, []);

  return (
    <div className="migration-page">
      <h1>Import your data</h1>
      <p>
        We found {totalAccounts} account(s) and {totalTransactions}{" "}
        transaction(s) in this browser.
      </p>
      <div className="migration-page__actions">
        <button className="btn-primary" onClick={() => {}}>
          Import my data
        </button>
        <button
          className="btn-secondary"
          onClick={() => void navigate("/dashboard")}
        >
          Skip, start fresh
        </button>
      </div>
    </div>
  );
}
