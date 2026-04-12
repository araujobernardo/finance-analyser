import { useMemo, useState, useEffect, useRef } from "react";
import { MonthToggleBar } from "../components/MonthToggleBar";
import { getStoredMonths, loadTransactions } from "../services/storage";
import type { Transaction } from "../utils/csvParser";
import { CATEGORIES } from "../services/categorisation";
import "./TransactionsPage.css";

const PAGE_SIZE = 50;

const CATEGORY_COLOURS: Record<string, string> = {
  Groceries: "#22c55e",
  Transport: "#3b82f6",
  Utilities: "#f59e0b",
  Dining: "#f97316",
  Entertainment: "#a855f7",
  Healthcare: "#ec4899",
  Shopping: "#06b6d4",
  Education: "#6366f1",
  Income: "#10b981",
  Transfer: "#94a3b8",
  Other: "#6b7280",
  Uncategorised: "#9ca3af",
};

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

type SortCol = "date" | "description" | "category" | "amount";
type SortDir = "asc" | "desc";

function compareRows(
  a: Transaction,
  b: Transaction,
  col: SortCol,
  dir: SortDir,
): number {
  let cmp = 0;
  switch (col) {
    case "date":
      cmp = a.date.getTime() - b.date.getTime();
      break;
    case "description":
      cmp = a.description.localeCompare(b.description);
      break;
    case "category":
      cmp = (a.category ?? "Uncategorised").localeCompare(
        b.category ?? "Uncategorised",
      );
      break;
    case "amount":
      cmp = a.amount - b.amount;
      break;
  }
  return dir === "asc" ? cmp : -cmp;
}

const ALL_CATEGORIES = ["Uncategorised", ...CATEGORIES];

export function TransactionsPage() {
  const months = useMemo(() => getStoredMonths(), []);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(
    months[months.length - 1] ?? null,
  );
  const [searchRaw, setSearchRaw] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sort, setSort] = useState<{ col: SortCol; dir: SortDir }>({
    col: "date",
    dir: "desc",
  });
  const [page, setPage] = useState(1);
  const filterRef = useRef<HTMLDivElement>(null);

  // Debounce search and reset page together (async callback, not synchronous effect)
  useEffect(() => {
    const id = setTimeout(() => {
      setSearchDebounced(searchRaw);
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [searchRaw]);

  useEffect(() => {
    if (!filterOpen) return;
    function handleClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [filterOpen]);

  const transactions = useMemo(() => {
    if (!selectedMonth) return [];
    return loadTransactions(selectedMonth).transactions;
  }, [selectedMonth]);

  const filtered = useMemo(() => {
    const q = searchDebounced.toLowerCase();
    return transactions
      .filter((t) => {
        if (
          q &&
          !t.description.toLowerCase().includes(q) &&
          !(t.category ?? "").toLowerCase().includes(q)
        )
          return false;
        if (selectedCategories.length > 0) {
          const cat = t.category ?? "Uncategorised";
          if (!selectedCategories.includes(cat)) return false;
        }
        return true;
      })
      .sort((a, b) => compareRows(a, b, sort.col, sort.dir));
  }, [transactions, searchDebounced, selectedCategories, sort]);

  const totalSpend = useMemo(
    () =>
      filtered.reduce((s, t) => (t.amount < 0 ? s + Math.abs(t.amount) : s), 0),
    [filtered],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSort(col: SortCol) {
    setSort((prev) =>
      prev.col === col
        ? { col, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { col, dir: "asc" },
    );
  }

  function sortArrow(col: SortCol) {
    if (sort.col !== col) return null;
    return (
      <span className="txns-sort-arrow" aria-hidden="true">
        {sort.dir === "asc" ? "▲" : "▼"}
      </span>
    );
  }

  function toggleCategory(cat: string) {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
    setPage(1);
  }

  if (months.length === 0) {
    return (
      <div className="txns-page">
        <h1>Transactions</h1>
        <p className="txns-empty">No data yet. Upload a CSV to get started.</p>
      </div>
    );
  }

  return (
    <div className="txns-page">
      <h1>Transactions</h1>

      <MonthToggleBar
        months={months}
        selectedMonth={selectedMonth}
        onMonthSelect={(m) => {
          setSelectedMonth(m);
          setPage(1);
        }}
      />

      <div className="txns-summary-bar">
        <span>
          {filtered.length} transaction{filtered.length !== 1 ? "s" : ""}
        </span>
        <span>
          Total spend: <strong>{AMT_FMT.format(totalSpend)}</strong>
        </span>
      </div>

      <div className="txns-filter-bar">
        <input
          className="txns-search"
          type="search"
          placeholder="Search transactions…"
          value={searchRaw}
          onChange={(e) => setSearchRaw(e.target.value)}
          aria-label="Search transactions"
        />
        <div className="txns-cat-filter" ref={filterRef}>
          <button
            className="txns-cat-filter__btn"
            onClick={() => setFilterOpen((v) => !v)}
            aria-haspopup="listbox"
            aria-expanded={filterOpen}
            type="button"
          >
            {selectedCategories.length === 0
              ? "All categories"
              : `${selectedCategories.length} selected`}
            <span aria-hidden="true"> ▾</span>
          </button>
          {filterOpen && (
            <ul
              className="txns-cat-filter__dropdown"
              role="listbox"
              aria-multiselectable="true"
              aria-label="Filter by category"
            >
              {ALL_CATEGORIES.map((cat) => (
                <li
                  key={cat}
                  role="option"
                  aria-selected={selectedCategories.includes(cat)}
                  className={`txns-cat-filter__option${selectedCategories.includes(cat) ? " txns-cat-filter__option--selected" : ""}`}
                  onMouseDown={() => toggleCategory(cat)}
                >
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(cat)}
                    onChange={() => toggleCategory(cat)}
                    tabIndex={-1}
                    aria-hidden="true"
                  />
                  <span
                    className="txns-cat-dot"
                    style={{
                      background: CATEGORY_COLOURS[cat] ?? "#9ca3af",
                    }}
                  />
                  {cat}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="txns-empty" data-testid="txns-empty">
          No transactions match the current filter.
        </p>
      ) : (
        <>
          <div className="txns-table-scroll">
            <table className="txns-table" data-testid="txns-table">
              <thead>
                <tr>
                  <th
                    className="txns-th txns-th--date"
                    onClick={() => handleSort("date")}
                    aria-sort={
                      sort.col === "date"
                        ? sort.dir === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    Date {sortArrow("date")}
                  </th>
                  <th
                    className="txns-th txns-th--desc"
                    onClick={() => handleSort("description")}
                    aria-sort={
                      sort.col === "description"
                        ? sort.dir === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    Description {sortArrow("description")}
                  </th>
                  <th
                    className="txns-th txns-th--cat"
                    onClick={() => handleSort("category")}
                    aria-sort={
                      sort.col === "category"
                        ? sort.dir === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    Category {sortArrow("category")}
                  </th>
                  <th
                    className="txns-th txns-th--num"
                    onClick={() => handleSort("amount")}
                    aria-sort={
                      sort.col === "amount"
                        ? sort.dir === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    Amount {sortArrow("amount")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((t, i) => {
                  const cat = t.category ?? "Uncategorised";
                  return (
                    <tr key={i} className="txns-row">
                      <td className="txns-td txns-td--date">
                        {DATE_FMT.format(t.date)}
                      </td>
                      <td className="txns-td txns-td--desc">{t.description}</td>
                      <td className="txns-td txns-td--cat">
                        <span
                          className="txns-cat-dot"
                          style={{
                            background: CATEGORY_COLOURS[cat] ?? "#9ca3af",
                          }}
                        />
                        {cat}
                      </td>
                      <td
                        className={`txns-td txns-td--num ${t.amount >= 0 ? "txns-td--positive" : "txns-td--negative"}`}
                      >
                        {AMT_FMT.format(t.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div
              className="txns-pagination"
              role="navigation"
              aria-label="Pagination"
            >
              <button
                className="txns-page-btn"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                aria-label="Previous page"
              >
                ‹
              </button>
              <span className="txns-page-info">
                Page {page} of {totalPages}
              </span>
              <button
                className="txns-page-btn"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                aria-label="Next page"
              >
                ›
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
