import { useMemo, useState } from "react";
import type { Transaction } from "../utils/csvParser";
import "./TransactionTable.css";

interface Props {
  transactions: Transaction[];
}

type Column = "date" | "description" | "amount" | "balance" | "category";
type Direction = "asc" | "desc";

interface SortState {
  column: Column;
  direction: Direction;
}

const DATE_FMT = new Intl.DateTimeFormat("en-NZ", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const AMT_FMT = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

function amountClass(amount: number): string {
  if (amount > 0) return "txn-table__amount--positive";
  if (amount < 0) return "txn-table__amount--negative";
  return "txn-table__amount--zero";
}

function compareRows(
  a: Transaction,
  b: Transaction,
  col: Column,
  dir: Direction,
): number {
  let cmp = 0;
  switch (col) {
    case "date":
      cmp = a.date.getTime() - b.date.getTime();
      break;
    case "description":
      cmp = a.description.localeCompare(b.description);
      break;
    case "amount":
      cmp = a.amount - b.amount;
      break;
    case "balance":
      cmp = (a.balance ?? 0) - (b.balance ?? 0);
      break;
    case "category":
      cmp = (a.category ?? "").localeCompare(b.category ?? "");
      break;
  }
  return dir === "asc" ? cmp : -cmp;
}

export function TransactionTable({ transactions }: Props) {
  const [sort, setSort] = useState<SortState>({
    column: "date",
    direction: "desc",
  });
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const hasBalance = transactions.some((t) => t.balance != null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate) : null;

    return transactions
      .filter((t) => {
        if (q) {
          const inDesc = t.description.toLowerCase().includes(q);
          const inCat = (t.category ?? "").toLowerCase().includes(q);
          if (!inDesc && !inCat) return false;
        }
        if (from && t.date < from) return false;
        if (to) {
          const toEnd = new Date(to);
          toEnd.setHours(23, 59, 59, 999);
          if (t.date > toEnd) return false;
        }
        return true;
      })
      .sort((a, b) => compareRows(a, b, sort.column, sort.direction));
  }, [transactions, search, fromDate, toDate, sort]);

  function handleSort(col: Column) {
    setSort((prev) =>
      prev.column === col
        ? { column: col, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { column: col, direction: "asc" },
    );
  }

  function sortArrow(col: Column): string {
    if (sort.column !== col) return "";
    return sort.direction === "asc" ? " ▲" : " ▼";
  }

  return (
    <div className="txn-table-wrap">
      <div className="txn-table__filter-bar">
        <input
          type="search"
          className="txn-table__search"
          placeholder="Search description or category…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search transactions"
        />
        <label className="txn-table__date-label">
          From
          <input
            type="date"
            className="txn-table__date-input"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            aria-label="From date"
          />
        </label>
        <label className="txn-table__date-label">
          To
          <input
            type="date"
            className="txn-table__date-input"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            aria-label="To date"
          />
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className="txn-table__empty" data-testid="txn-table-empty">
          No results.
        </p>
      ) : (
        <div className="txn-table__scroll">
          <table className="txn-table" data-testid="txn-table">
            <thead>
              <tr>
                <th
                  className="txn-table__th txn-table__th--date"
                  onClick={() => handleSort("date")}
                  aria-sort={
                    sort.column === "date"
                      ? sort.direction === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                >
                  Date{sortArrow("date")}
                </th>
                <th
                  className="txn-table__th txn-table__th--desc"
                  onClick={() => handleSort("description")}
                  aria-sort={
                    sort.column === "description"
                      ? sort.direction === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                >
                  Description{sortArrow("description")}
                </th>
                <th
                  className="txn-table__th txn-table__th--num"
                  onClick={() => handleSort("amount")}
                  aria-sort={
                    sort.column === "amount"
                      ? sort.direction === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                >
                  Amount{sortArrow("amount")}
                </th>
                {hasBalance && (
                  <th
                    className="txn-table__th txn-table__th--num"
                    onClick={() => handleSort("balance")}
                    aria-sort={
                      sort.column === "balance"
                        ? sort.direction === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    Balance{sortArrow("balance")}
                  </th>
                )}
                <th
                  className="txn-table__th txn-table__th--cat"
                  onClick={() => handleSort("category")}
                  aria-sort={
                    sort.column === "category"
                      ? sort.direction === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                >
                  Category{sortArrow("category")}
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, i) => (
                <tr key={i} className="txn-table__row">
                  <td className="txn-table__td txn-table__td--date">
                    {DATE_FMT.format(t.date)}
                  </td>
                  <td className="txn-table__td txn-table__td--desc">
                    {t.description}
                  </td>
                  <td
                    className={`txn-table__td txn-table__td--num ${amountClass(t.amount)}`}
                  >
                    {AMT_FMT.format(t.amount)}
                  </td>
                  {hasBalance && (
                    <td className="txn-table__td txn-table__td--num">
                      {t.balance != null ? AMT_FMT.format(t.balance) : ""}
                    </td>
                  )}
                  <td className="txn-table__td txn-table__td--cat">
                    {t.category ?? "Uncategorised"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
