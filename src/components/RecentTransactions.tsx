import { Link } from "react-router-dom";
import type { ApiTransaction } from "../types/api";
import {
  getCategoryDisplay,
  formatDateLabel,
  formatTxnAmount,
} from "../utils/categoryDisplay";
import "./RecentTransactions.css";

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
                      {formatTxnAmount(t.amount)}
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
