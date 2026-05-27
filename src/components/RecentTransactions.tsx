import { Link } from "react-router-dom";
import type { ApiTransaction } from "../types/api";
import "./RecentTransactions.css";

// ── Category display map ─────────────────────────────────────────────────────

interface CategoryDisplay {
  emoji: string;
  iconBg: string;
  dotColor: string;
}

const CATEGORY_MAP: Record<string, CategoryDisplay> = {
  groceries: {
    emoji: "🛒",
    iconBg: "#e8f4ec",
    dotColor: "var(--cat-groceries)",
  },
  transport: {
    emoji: "🚌",
    iconBg: "#e9f2f8",
    dotColor: "var(--cat-transport)",
  },
  income: {
    emoji: "💰",
    iconBg: "#e8f5f3",
    dotColor: "var(--accent)",
  },
  dining: {
    emoji: "🍽️",
    iconBg: "#fdf3e8",
    dotColor: "var(--cat-dining)",
  },
  utilities: {
    emoji: "⚡",
    iconBg: "#fef9ec",
    dotColor: "var(--cat-utilities)",
  },
  healthcare: {
    emoji: "🏥",
    iconBg: "#fdf3f3",
    dotColor: "var(--cat-healthcare)",
  },
  entertainment: {
    emoji: "🎬",
    iconBg: "#f3f0f9",
    dotColor: "var(--cat-entertainment)",
  },
  shopping: {
    emoji: "🛍️",
    iconBg: "#e8f5f3",
    dotColor: "var(--accent-mid)",
  },
};

const FALLBACK_DISPLAY: CategoryDisplay = {
  emoji: "💳",
  iconBg: "#f4f1ed",
  dotColor: "var(--muted)",
};

function getCategoryDisplay(category: string | null): CategoryDisplay {
  if (!category) return FALLBACK_DISPLAY;
  return CATEGORY_MAP[category.toLowerCase()] ?? FALLBACK_DISPLAY;
}

// ── Date formatting ──────────────────────────────────────────────────────────

const DATE_LABEL_FMT = new Intl.DateTimeFormat("en-NZ", {
  day: "numeric",
  month: "short",
});

const AMT_FMT = new Intl.NumberFormat("en-NZ", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatDateLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return DATE_LABEL_FMT.format(d);
}

function formatAmount(amount: number): string {
  const abs = `$${AMT_FMT.format(Math.abs(amount))}`;
  return amount > 0 ? `+${abs}` : `−${abs}`;
}

// ── Grouping ─────────────────────────────────────────────────────────────────

interface Group {
  dateStr: string;
  label: string;
  txns: ApiTransaction[];
}

function groupByDate(txns: ApiTransaction[]): Group[] {
  const map = new Map<string, ApiTransaction[]>();
  for (const t of txns) {
    const existing = map.get(t.date);
    if (existing) {
      existing.push(t);
    } else {
      map.set(t.date, [t]);
    }
  }
  // Map preserves insertion order; txns are already sorted date-desc so groups
  // will appear newest-first.
  return Array.from(map.entries()).map(([dateStr, items]) => ({
    dateStr,
    label: formatDateLabel(dateStr),
    txns: items,
  }));
}

// ── Props ────────────────────────────────────────────────────────────────────

interface RecentTransactionsProps {
  transactions: ApiTransaction[];
  monthLabel: string;
}

const MAX_ROWS = 7;

// ── Component ────────────────────────────────────────────────────────────────

export function RecentTransactions({
  transactions,
  monthLabel,
}: RecentTransactionsProps) {
  // Filter out transfers and take the 7 most recent by date.
  const recent = [...transactions]
    .filter((t) => !t.isTransfer)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, MAX_ROWS);

  const groups = groupByDate(recent);

  return (
    <div className="recent-txns" data-testid="recent-transactions-widget">
      {/* Card header */}
      <div className="recent-txns__header">
        <div>
          <div className="recent-txns__title">Recent Transactions</div>
          <div className="recent-txns__subtitle">{monthLabel}</div>
        </div>
        <Link className="recent-txns__view-all" to="/transactions">
          View all
        </Link>
      </div>

      {/* List */}
      {recent.length === 0 ? (
        <div className="recent-txns__empty">
          No transactions for this period.
        </div>
      ) : (
        <ul className="recent-txns__list">
          {groups.map((group) => (
            <li key={group.dateStr}>
              {/* Date divider */}
              <div
                className="recent-txns__date-divider"
                data-testid="date-divider"
              >
                <span className="recent-txns__date-label">{group.label}</span>
                <span className="recent-txns__date-line" />
              </div>

              {/* Rows for this date */}
              {group.txns.map((t) => {
                const display = getCategoryDisplay(t.category);
                const isCredit = t.amount > 0;
                return (
                  <div
                    key={t.id}
                    className="recent-txns__row"
                    data-testid="recent-txn-row"
                  >
                    {/* Emoji icon */}
                    <div
                      className="recent-txns__icon"
                      style={{ background: display.iconBg }}
                      aria-hidden="true"
                    >
                      {display.emoji}
                    </div>

                    {/* Body */}
                    <div className="recent-txns__body">
                      <div className="recent-txns__payee">{t.description}</div>
                      <div className="recent-txns__meta">
                        <span
                          className="recent-txns__cat-dot"
                          style={{ background: display.dotColor }}
                          aria-hidden="true"
                        />
                        <span>{t.category ?? "Uncategorised"}</span>
                      </div>
                    </div>

                    {/* Amount */}
                    <span
                      className={`recent-txns__amount${isCredit ? " recent-txns__amount--credit" : " recent-txns__amount--debit"}`}
                    >
                      {formatAmount(t.amount)}
                    </span>
                  </div>
                );
              })}
            </li>
          ))}
        </ul>
      )}

      {/* Card footer */}
      <div className="recent-txns__footer">
        <Link className="recent-txns__footer-link" to="/transactions">
          See all transactions →
        </Link>
      </div>
    </div>
  );
}
