import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getAccounts,
  getAccountMonths,
  getTransactions,
} from "../services/storage";
import { useApi } from "../lib/api";

export function MigrationPage() {
  const navigate = useNavigate();
  const { apiFetch } = useApi();

  const [status, setStatus] = useState<"idle" | "importing" | "error">("idle");
  const [progress, setProgress] = useState("");

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

  const handleImport = async () => {
    setStatus("importing");
    setProgress("");

    const accounts = getAccounts();

    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];
      setProgress(`Importing account ${i + 1} of ${accounts.length}…`);

      let cloudAccountId: string;
      try {
        const createRes = await apiFetch("/api/accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nickname: account.name,
            accountType: "Checking",
            accountNumber: "",
          }),
        });
        if (!createRes.ok) {
          setStatus("error");
          return;
        }
        const createJson = (await createRes.json()) as { id: string };
        cloudAccountId = createJson.id;
      } catch {
        setStatus("error");
        return;
      }

      for (const month of getAccountMonths(account.id)) {
        const { transactions } = getTransactions(account.id, month);
        for (const t of transactions) {
          try {
            const txnRes = await apiFetch(
              `/api/accounts/${cloudAccountId}/transactions`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  date: t.date.toISOString().slice(0, 10),
                  amount: t.amount,
                  description: t.description,
                  category: t.categoryOverride ?? t.category,
                  isTransfer: false,
                  isManualTransfer: false,
                }),
              },
            );
            if (!txnRes.ok) {
              setStatus("error");
              return;
            }
          } catch {
            setStatus("error");
            return;
          }
        }
      }
    }

    localStorage.setItem("fa-migration-complete", "true");
    void navigate("/dashboard");
  };

  const handleSkip = () => {
    localStorage.setItem("fa-migration-complete", "true");
    void navigate("/dashboard");
  };

  return (
    <div className="migration-page">
      <h1>Import your data</h1>
      <p>
        We found {totalAccounts} account(s) and {totalTransactions}{" "}
        transaction(s) in this browser.
      </p>

      {status === "importing" && (
        <p className="migration-progress">{progress}</p>
      )}
      {status === "error" && (
        <p className="migration-error">Import failed. Please try again.</p>
      )}

      <div className="migration-page__actions">
        {status === "error" ? (
          <button className="btn-primary" onClick={() => void handleImport()}>
            Try again
          </button>
        ) : (
          <button
            className="btn-primary"
            onClick={() => void handleImport()}
            disabled={status === "importing"}
          >
            Import my data
          </button>
        )}
        <button
          className="btn-secondary"
          onClick={handleSkip}
          disabled={status === "importing"}
        >
          Skip, start fresh
        </button>
      </div>
    </div>
  );
}
