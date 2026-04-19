import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { MonthToggleBar } from "../components/MonthToggleBar";
import {
  overrideTransactionCategory,
  bulkOverrideTransactionCategory,
} from "../services/storage";
import { CATEGORIES } from "../services/categorisation";
import {
  useActiveMonths,
  useActiveTransactions,
  useAccount,
  ALL_ACCOUNTS_ID,
  type TransactionWithAccount,
} from "../context/AccountContext";
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
  a: TransactionWithAccount,
  b: TransactionWithAccount,
  col: SortCol,
  dir: SortDir,
): number {
  let cmp = 0;
  const catA = a.categoryOverride ?? a.category ?? "Uncategorised";
  const catB = b.categoryOverride ?? b.category ?? "Uncategorised";
  switch (col) {
    case "date":
      cmp = a.date.getTime() - b.date.getTime();
      break;
    case "description":
      cmp = a.description.localeCompare(b.description);
      break;
    case "category":
      cmp = catA.localeCompare(catB);
      break;
    case "amount":
      cmp = a.amount - b.amount;
      break;
  }
  return dir === "asc" ? cmp : -cmp;
}

const ALL_CATEGORIES = ["Uncategorised", ...CATEGORIES];

// ── Inline category dropdown ──────────────────────────────────────────────────

interface InlineCategoryDropdownProps {
  category: string;
  isOverridden: boolean;
  onSelect: (newCat: string) => void;
  onCancel: () => void;
}

function InlineCategoryDropdown({
  category,
  isOverridden,
  onSelect,
  onCancel,
}: InlineCategoryDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        onCancel();
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        onCancel();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onCancel]);

  function handleSelect(cat: string) {
    setOpen(false);
    onSelect(cat);
  }

  return (
    <div className="txns-cat-cell" ref={containerRef}>
      {isOverridden && (
        <span
          className="txns-edited-dot"
          aria-label="Category manually edited"
          title="Category manually edited"
        />
      )}
      <span
        className="txns-cat-dot"
        style={{ background: CATEGORY_COLOURS[category] ?? "#9ca3af" }}
      />
      <button
        className="txns-cat-inline-btn"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        type="button"
        title="Click to change category"
      >
        {category}
        <span className="txns-cat-inline-arrow" aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <ul
          className="txns-cat-inline-dropdown"
          role="listbox"
          aria-label="Select category"
        >
          {ALL_CATEGORIES.map((cat) => (
            <li
              key={cat}
              role="option"
              aria-selected={cat === category}
              className={`txns-cat-inline-option${cat === category ? " txns-cat-inline-option--active" : ""}`}
              onMouseDown={() => handleSelect(cat)}
            >
              <span
                className="txns-cat-dot"
                style={{ background: CATEGORY_COLOURS[cat] ?? "#9ca3af" }}
              />
              {cat}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function TransactionsPage() {
  const months = useActiveMonths();
  const { activeAccountId } = useAccount();
  const isAllAccounts = activeAccountId === ALL_ACCOUNTS_ID;
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
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

  // Resolve the selected month against available months
  const resolvedMonth =
    selectedMonth && months.includes(selectedMonth)
      ? selectedMonth
      : (months[months.length - 1] ?? null);

  // Load transactions via context hook (merges all accounts when activeAccountId === 'all')
  const contextTransactions = useActiveTransactions(resolvedMonth);

  // Local transactions state so inline edits reflect immediately
  const [localTransactions, setLocalTransactions] = useState<
    TransactionWithAccount[]
  >([]);

  // Checkbox selection state — keyed by the transaction's position in
  // `localTransactions` (stable within a session for a given month)
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
    new Set(),
  );

  // Debounce search and reset page together
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

  // Sync local transactions when context transactions change (month or account switch).
  // localTransactions is a mutable copy allowing inline category edits without
  // re-fetching from storage; syncing from an effect here is intentional.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setLocalTransactions(contextTransactions);
    setSelectedIndices(new Set());
  }, [contextTransactions]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const filtered = useMemo(() => {
    const q = searchDebounced.toLowerCase();
    return localTransactions
      .map((t, originalIndex) => ({ t, originalIndex }))
      .filter(({ t }) => {
        const displayCat = t.categoryOverride ?? t.category ?? "";
        if (
          q &&
          !t.description.toLowerCase().includes(q) &&
          !displayCat.toLowerCase().includes(q)
        )
          return false;
        if (selectedCategories.length > 0) {
          const cat = displayCat || "Uncategorised";
          if (!selectedCategories.includes(cat)) return false;
        }
        return true;
      })
      .sort((a, b) => compareRows(a.t, b.t, sort.col, sort.dir));
  }, [localTransactions, searchDebounced, selectedCategories, sort]);

  // Category edits are disabled in 'All Accounts' view because transactions are
  // read-only composites from multiple accounts — no single account index applies.

  const totalSpend = useMemo(
    () =>
      filtered.reduce(
        (s, { t }) => (t.amount < 0 ? s + Math.abs(t.amount) : s),
        0,
      ),
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

  // ── Inline category editing ────────────────────────────────────────────────

  const handleCategorySelect = useCallback(
    (originalIndex: number, newCat: string) => {
      if (!resolvedMonth || isAllAccounts) return;
      overrideTransactionCategory(resolvedMonth, originalIndex, newCat);
      setLocalTransactions((prev) =>
        prev.map((t, i) =>
          i === originalIndex ? { ...t, categoryOverride: newCat } : t,
        ),
      );
    },
    [resolvedMonth, isAllAccounts],
  );

  // ── Checkbox selection ─────────────────────────────────────────────────────

  const allPageIndices = paginated.map(({ originalIndex }) => originalIndex);
  const allPageSelected =
    allPageIndices.length > 0 &&
    allPageIndices.every((i) => selectedIndices.has(i));

  function toggleSelectAll() {
    if (allPageSelected) {
      setSelectedIndices((prev) => {
        const next = new Set(prev);
        allPageIndices.forEach((i) => next.delete(i));
        return next;
      });
    } else {
      setSelectedIndices((prev) => {
        const next = new Set(prev);
        allPageIndices.forEach((i) => next.add(i));
        return next;
      });
    }
  }

  function toggleSelectRow(originalIndex: number) {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(originalIndex)) {
        next.delete(originalIndex);
      } else {
        next.add(originalIndex);
      }
      return next;
    });
  }

  // ── Bulk category update ───────────────────────────────────────────────────

  function handleBulkCategorySelect(newCat: string) {
    if (!resolvedMonth || isAllAccounts || selectedIndices.size === 0) return;
    const indices = Array.from(selectedIndices);
    bulkOverrideTransactionCategory(resolvedMonth, indices, newCat);
    setLocalTransactions((prev) =>
      prev.map((t, i) =>
        selectedIndices.has(i) ? { ...t, categoryOverride: newCat } : t,
      ),
    );
    setSelectedIndices(new Set());
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
        selectedMonth={resolvedMonth}
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
                  <th className="txns-th txns-th--check">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={toggleSelectAll}
                      aria-label="Select all visible rows"
                      title="Select all"
                    />
                  </th>
                  {isAllAccounts && (
                    <th
                      className="txns-th txns-th--acct"
                      aria-label="Account"
                    />
                  )}
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
                {paginated.map(({ t, originalIndex }) => {
                  const displayCat =
                    t.categoryOverride ?? t.category ?? "Uncategorised";
                  const isOverridden = Boolean(t.categoryOverride);
                  const isSelected = selectedIndices.has(originalIndex);
                  return (
                    <tr
                      key={originalIndex}
                      className={`txns-row${isSelected ? " txns-row--selected" : ""}`}
                    >
                      <td className="txns-td txns-td--check">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(originalIndex)}
                          aria-label={`Select row for ${t.description}`}
                        />
                      </td>
                      {isAllAccounts && (
                        <td className="txns-td txns-td--acct">
                          {t.accountColour && (
                            <span
                              className="txns-acct-dot"
                              style={{ background: t.accountColour }}
                              aria-hidden="true"
                            />
                          )}
                        </td>
                      )}
                      <td className="txns-td txns-td--date">
                        {DATE_FMT.format(t.date)}
                      </td>
                      <td className="txns-td txns-td--desc">{t.description}</td>
                      <td className="txns-td txns-td--cat">
                        <InlineCategoryDropdown
                          category={displayCat}
                          isOverridden={isOverridden}
                          onSelect={(newCat) =>
                            handleCategorySelect(originalIndex, newCat)
                          }
                          onCancel={() => {
                            /* no-op: cancel just closes the dropdown */
                          }}
                        />
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

      {/* Bulk action bar — fixed at bottom when rows are selected */}
      {selectedIndices.size > 0 && (
        <div className="txns-bulk-bar" role="region" aria-label="Bulk actions">
          <span className="txns-bulk-bar__count">
            {selectedIndices.size} row{selectedIndices.size !== 1 ? "s" : ""}{" "}
            selected
          </span>
          <div className="txns-bulk-bar__actions">
            <label className="txns-bulk-bar__label" htmlFor="bulk-cat-select">
              Set category:
            </label>
            <select
              id="bulk-cat-select"
              className="txns-bulk-bar__select"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  handleBulkCategorySelect(e.target.value);
                  e.target.value = "";
                }
              }}
              aria-label="Bulk category"
            >
              <option value="" disabled>
                Choose…
              </option>
              {ALL_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <button
              className="txns-bulk-bar__clear"
              onClick={() => setSelectedIndices(new Set())}
              type="button"
            >
              Clear selection
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
