import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useState } from "react";
import { ACCOUNT_COLORS } from "../constants/colors";
import type { PfaTxn, PfaCategory, PfaBudgets } from "../types/pfa";
import {
  buildWeeklyTotals,
  buildWeeklyCategoryTotals,
} from "../utils/weeklyAggregation";
import { WeeklyTrendChart } from "../components/WeeklyTrendChart";
import { LargestTransactions } from "../components/LargestTransactions";
import { SpendingTrendsByCategoryChart } from "../components/SpendingTrendsByCategoryChart";
import type { Transaction } from "../utils/csvParser";
import "./DashboardPage.css";

interface Props {
  txns: PfaTxn[];
  months: string[];
  selectedMonths: string[];
  setSelectedMonths: (m: string[]) => void;
  budgets: PfaBudgets;
  accountList: { short: string; display: string }[];
  categories: PfaCategory[];
}

const fmt = (n: number) =>
  `$${Math.abs(n).toLocaleString("en-NZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtMonth = (m: string) => {
  if (!m) return "";
  const [y, mo] = m.split("-");
  return new Date(+y, +mo - 1, 1).toLocaleString("en-NZ", {
    month: "long",
    year: "numeric",
  });
};

const fmtMonthSh = (m: string) => {
  if (!m) return "";
  const [y, mo] = m.split("-");
  return (
    new Date(+y, +mo - 1, 1).toLocaleString("en-NZ", { month: "short" }) +
    " '" +
    y.slice(2)
  );
};

export function DashboardPage({
  txns,
  months,
  selectedMonths,
  setSelectedMonths,
  budgets,
  accountList,
  categories,
}: Props) {
  const [acctFilter, setAcctFilter] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Reset category selection whenever the account filter changes
  const handleAcctFilterChange = (next: string) => {
    setAcctFilter(next);
    setSelectedCategory(null);
  };

  const toggleMonth = (m: string) =>
    setSelectedMonths(
      selectedMonths.includes(m)
        ? selectedMonths.length > 1
          ? selectedMonths.filter((x) => x !== m)
          : selectedMonths
        : [...selectedMonths, m].sort(),
    );

  const multiMonth = selectedMonths.length > 1;
  const n = selectedMonths.length;

  const selTxns = txns.filter(
    (t) =>
      selectedMonths.includes(t.month) &&
      (acctFilter === "all" || t.account === acctFilter),
  );
  const real = selTxns.filter((t) => !t.isTransfer);
  const spend = real
    .filter((t) => !t.isCredit)
    .reduce((s, t) => s + Math.abs(t.amount), 0);
  const income = real
    .filter((t) => t.isCredit)
    .reduce((s, t) => s + t.amount, 0);
  const net = income - spend;
  const transferAmt = selTxns
    .filter((t) => t.isTransfer && !t.isCredit)
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  const catData = categories
    .filter((c) => c.name !== "Income")
    .map((c) => ({
      name: c.name,
      color: c.color,
      value: real
        .filter((t) => t.category === c.name && !t.isCredit)
        .reduce((s, t) => s + Math.abs(t.amount), 0),
    }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  const acctBreakdown = accountList.map((acct, i) => {
    const at = txns.filter(
      (t) =>
        selectedMonths.includes(t.month) &&
        t.accountShort === acct.short &&
        !t.isTransfer,
    );
    return {
      ...acct,
      color: ACCOUNT_COLORS[i % ACCOUNT_COLORS.length],
      income: at.filter((t) => t.isCredit).reduce((s, t) => s + t.amount, 0),
      spend: at
        .filter((t) => !t.isCredit)
        .reduce((s, t) => s + Math.abs(t.amount), 0),
    };
  });

  const weeklyBuckets = buildWeeklyTotals(txns, acctFilter);
  const weeklyCategoryBuckets = buildWeeklyCategoryTotals(txns, acctFilter);

  const budgetData = Object.entries(budgets)
    .map(([cat, budget]) => ({
      cat,
      budget: +budget,
      actual: real
        .filter((t) => t.category === cat && !t.isCredit)
        .reduce((s, t) => s + Math.abs(t.amount), 0),
    }))
    .filter((d) => d.budget > 0);

  // Map PfaTxns to Transaction shape for LargestTransactions component
  const txnsForLargest: Transaction[] = real
    .filter((t) => !t.isCredit)
    .map((t) => ({
      date: new Date(`${t.date}T00:00:00`),
      description: t.payee || t.memo || "Unknown",
      amount: -Math.abs(t.amount), // negative = debit in Transaction convention
      category: t.category ?? undefined,
    }));

  if (!txns.length) {
    return (
      <div className="dash-empty">
        <div className="dash-empty-icon">⬡</div>
        <div className="dash-empty-title">No data yet</div>
        <div className="dash-empty-sub">
          Upload your bank CSV exports. Select multiple files at once to import
          all accounts together.
        </div>
      </div>
    );
  }

  const headingText = multiMonth
    ? selectedMonths.map(fmtMonthSh).join(" · ")
    : fmtMonth(selectedMonths[0] ?? months[0]);

  const tooltipStyle = {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    fontSize: 12,
    color: "var(--text)",
  };

  return (
    <div className="dash-scroll">
      {/* Header */}
      <div className="dash-header">
        <div>
          <h1 className="dash-heading">{headingText}</h1>
          {multiMonth && (
            <div className="dash-heading-sub">
              {n} months selected · click to deselect
            </div>
          )}
        </div>
        <div className="dash-month-pills">
          {months.map((m) => (
            <button
              key={m}
              className={`pill${selectedMonths.includes(m) ? " pill-active" : ""}`}
              onClick={() => toggleMonth(m)}
            >
              {fmtMonthSh(m)}
            </button>
          ))}
        </div>
      </div>

      {/* Account filter pills */}
      {accountList.length > 1 && (
        <div className="dash-acct-pills">
          <button
            className={`pill${acctFilter === "all" ? " pill-active" : ""}`}
            onClick={() => handleAcctFilterChange("all")}
          >
            All Accounts
          </button>
          {accountList.map((a, i) => {
            const col = ACCOUNT_COLORS[i % ACCOUNT_COLORS.length];
            const isActive = acctFilter === a.display;
            return (
              <button
                key={a.short}
                className={`pill${isActive ? " pill-active" : ""}`}
                style={
                  isActive
                    ? { borderColor: col, color: col, background: `${col}22` }
                    : undefined
                }
                onClick={() =>
                  handleAcctFilterChange(
                    acctFilter === a.display ? "all" : a.display,
                  )
                }
              >
                {a.display}
              </button>
            );
          })}
        </div>
      )}

      {/* Summary stats */}
      <div className="dash-stats-grid">
        <div className="card">
          <Stat
            label="Income"
            value={fmt(income)}
            color="var(--accent)"
            sub={multiMonth ? `avg ${fmt(income / n)}/mo` : undefined}
          />
        </div>
        <div className="card">
          <Stat
            label="Spent"
            value={fmt(spend)}
            color="var(--red)"
            sub={multiMonth ? `avg ${fmt(spend / n)}/mo` : undefined}
          />
        </div>
        <div className="card">
          <Stat
            label="Net"
            value={`${net >= 0 ? "+" : ""}${fmt(net)}`}
            color={net >= 0 ? "var(--accent)" : "var(--red)"}
            sub={
              multiMonth
                ? `avg ${net >= 0 ? "+" : ""}${fmt(net / n)}/mo`
                : undefined
            }
          />
        </div>
        <div className="card">
          <Stat
            label="Transactions"
            value={String(selTxns.length)}
            color="var(--text)"
          />
        </div>
      </div>

      {/* Transfer notice */}
      {transferAmt > 0 && (
        <div className="dash-transfer-notice">
          ↔ {fmt(transferAmt)} in inter-account transfers detected and excluded
          from all totals.
        </div>
      )}

      {/* Per-account breakdown */}
      {acctFilter === "all" && accountList.length > 1 && (
        <div className="dash-acct-grid">
          {acctBreakdown.map(
            ({ short, display, color, income: ai, spend: as_ }) => (
              <div
                key={short}
                className="card dash-acct-card"
                style={{ borderColor: `${color}33` }}
              >
                <div className="dash-acct-name" style={{ color }}>
                  <span
                    className="dash-acct-dot"
                    style={{ background: color }}
                  />
                  {display}
                </div>
                <div className="dash-acct-rows">
                  <div className="dash-acct-row">
                    <span className="dash-acct-row-label">In</span>
                    <span className="mono" style={{ color: "var(--accent)" }}>
                      {fmt(ai)}
                    </span>
                  </div>
                  <div className="dash-acct-row">
                    <span className="dash-acct-row-label">Out</span>
                    <span className="mono" style={{ color: "var(--red)" }}>
                      {fmt(as_)}
                    </span>
                  </div>
                </div>
              </div>
            ),
          )}
        </div>
      )}

      {/* Charts row */}
      <div className="dash-charts-grid">
        <div className="card">
          <div className="card-title">Spending by Category</div>
          {catData.length ? (
            <div className="dash-cat-body">
              {/* Left: legend list */}
              <div className="dash-cat-legend-col">
                <div className="dash-cat-legend">
                  {catData.slice(0, 7).map((d) => (
                    <div
                      key={d.name}
                      className="dash-cat-legend-item"
                      style={{
                        opacity:
                          selectedCategory === null ||
                          selectedCategory === d.name
                            ? 1
                            : 0.4,
                        cursor: "pointer",
                      }}
                      onClick={() =>
                        setSelectedCategory(
                          d.name === selectedCategory ? null : d.name,
                        )
                      }
                    >
                      <span
                        className="dash-cat-legend-dot"
                        style={{ background: d.color }}
                      />
                      <span>{d.name}</span>
                      <span className="mono dash-cat-legend-val">
                        {fmt(d.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Right: donut chart */}
              <div className="dash-cat-chart-col">
                <ResponsiveContainer width="100%" height={190}>
                  <PieChart>
                    <Pie
                      data={catData}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={85}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {catData.map((d, i) => (
                        <Cell
                          key={i}
                          fill={d.color}
                          opacity={
                            selectedCategory === null ||
                            selectedCategory === d.name
                              ? 1
                              : 0.3
                          }
                          onClick={() =>
                            setSelectedCategory(
                              d.name === selectedCategory ? null : d.name,
                            )
                          }
                          style={{ cursor: "pointer" }}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => [fmt(v), "Spend"]}
                      contentStyle={tooltipStyle}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="dash-empty-chart">
              No expense data for selected period
            </div>
          )}
        </div>

        <div className="card">
          <LargestTransactions
            transactions={txnsForLargest}
            selectedCategory={selectedCategory}
            onCategoryClick={setSelectedCategory}
          />
        </div>
      </div>

      {/* Spending Trends by Category */}
      <div className="card">
        <SpendingTrendsByCategoryChart
          data={weeklyCategoryBuckets}
          selectedCategory={selectedCategory}
        />
      </div>

      {/* Weekly Trends */}
      <div className="card dash-trends">
        <div className="card-title">Weekly Trends</div>
        <WeeklyTrendChart data={weeklyBuckets} />
      </div>

      {/* Budget vs Actual */}
      {budgetData.length > 0 && (
        <div className="card">
          <div className="card-title">
            Budget vs Actual{multiMonth ? ` (${n}-month total)` : ""}
          </div>
          <div className="dash-budget-list">
            {budgetData.map((d) => {
              const limit = multiMonth ? d.budget * n : d.budget;
              const pct = Math.min((d.actual / limit) * 100, 100);
              const over = d.actual > limit;
              return (
                <div key={d.cat}>
                  <div className="dash-budget-row">
                    <span className="dash-budget-cat">{d.cat}</span>
                    <span
                      className="mono"
                      style={{ color: over ? "var(--red)" : "var(--muted)" }}
                    >
                      {fmt(d.actual)}
                      <span style={{ color: "var(--muted)" }}>
                        {" "}
                        / {fmt(limit)}
                      </span>
                    </span>
                  </div>
                  <div className="dash-budget-track">
                    <div
                      className="dash-budget-fill"
                      style={{
                        width: `${pct}%`,
                        background: over ? "var(--red)" : "var(--accent)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  color = "var(--text)",
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value mono" style={{ color }}>
        {value}
      </div>
      {sub && <div className="stat-sub mono">{sub}</div>}
    </div>
  );
}
