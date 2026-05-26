import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useState, useMemo } from "react";
import { ACCOUNT_COLORS } from "../constants/colors";
import type { ApiTransaction } from "../types/api";
import {
  useAccount,
  useAllTransactions,
  ALL_ACCOUNTS_ID,
} from "../context/AccountContext";
import {
  buildWeeklyTotals,
  buildWeeklyCategoryTotals,
} from "../utils/weeklyAggregation";
import { WeeklyTrendChart } from "../components/WeeklyTrendChart";
import { LargestTransactions } from "../components/LargestTransactions";
import { SpendingTrendsByCategoryChart } from "../components/SpendingTrendsByCategoryChart";
import { GoalsSummaryWidget } from "../components/goals/GoalsSummaryWidget";
import { BudgetSummaryWidget } from "../components/budgets/BudgetSummaryWidget";
import type { Transaction } from "../utils/csvParser";
import "./DashboardPage.css";

// ── Local adapter type ────────────────────────────────────────────────────────
// Minimal shape required by weeklyAggregation.ts utilities (which still use
// the PfaTxn-compatible interface internally). DashboardPage uses this local
// type rather than importing PfaTxn directly, keeping this file free of the
// old localStorage data model.

interface AdaptedTxn {
  id: string;
  date: string;
  month: string;
  type: string;
  payee: string;
  memo: string;
  amount: number;
  isCredit: boolean;
  account: string;
  accountShort: string;
  category: string | null;
  isTransfer: boolean;
}

function adaptTxn(t: ApiTransaction, nickname: string): AdaptedTxn {
  return {
    id: t.id,
    date: t.date,
    month: t.date.slice(0, 7),
    type: "",
    payee: t.description,
    memo: "",
    amount: t.amount,
    isCredit: t.amount > 0,
    account: nickname,
    accountShort: t.accountId,
    category: t.category,
    isTransfer: t.isTransfer,
  };
}

// ── Formatting helpers ───────────────────────────────────────────────────────

const fmt = (n: number) =>
  `$${Math.abs(n).toLocaleString("en-NZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const fmtMonthSh = (m: string) => {
  if (!m) return "";
  const [y, mo] = m.split("-");
  return (
    new Date(+y, +mo - 1, 1).toLocaleString("en-NZ", { month: "short" }) +
    " '" +
    y.slice(2)
  );
};

// Stable category colours derived from position in the sorted category list.
const CAT_COLORS = [
  "#6C8EBF",
  "#82B366",
  "#D79B00",
  "#AE4132",
  "#9673A6",
  "#006EAF",
  "#23850B",
  "#BD7000",
  "#6E0023",
  "#603E8A",
  "#0E7A8A",
];

// ── DashboardPage ────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { accounts, activeAccountId, isLoading } = useAccount();
  const rawTransactions = useAllTransactions();

  // Adapt ApiTransaction rows for chart utilities.
  const adapted = useMemo(() => {
    const nicknameById = new Map(accounts.map((a) => [a.id, a.nickname]));
    return rawTransactions.map((t) => {
      const nickname = nicknameById.get(t.accountId) ?? t.accountId;
      return adaptTxn(t, nickname);
    });
  }, [rawTransactions, accounts]);

  // Derive sorted month list from transactions (newest first).
  const months = useMemo(() => {
    const set = new Set(adapted.map((t) => t.month));
    return Array.from(set).sort().reverse();
  }, [adapted]);

  // Derive categories from transaction data (unique expense category values).
  const uniqueCategories = useMemo(() => {
    const catSet = new Set<string>();
    for (const t of adapted) {
      if (t.category && !t.isCredit && !t.isTransfer) {
        catSet.add(t.category);
      }
    }
    return Array.from(catSet).sort();
  }, [adapted]);

  // Month selection state — controlled; reset to most-recent when months change.
  const [selectedMonthsRaw, setSelectedMonths] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Effective selected months: filter out stale values, default to most-recent.
  const selectedMonths = useMemo(() => {
    if (months.length === 0) return [];
    const valid = selectedMonthsRaw.filter((m) => months.includes(m));
    return valid.length > 0 ? valid : [months[0]];
  }, [selectedMonthsRaw, months]);

  const toggleMonth = (m: string) =>
    setSelectedMonths(
      selectedMonths.includes(m)
        ? selectedMonths.length > 1
          ? selectedMonths.filter((x) => x !== m)
          : selectedMonths
        : [...selectedMonths, m].sort(),
    );

  const n = selectedMonths.length;

  const selAdapted = useMemo(
    () =>
      adapted.filter(
        (t) =>
          selectedMonths.includes(t.month) &&
          (activeAccountId === ALL_ACCOUNTS_ID ||
            t.accountShort === activeAccountId),
      ),
    [adapted, selectedMonths, activeAccountId],
  );

  const real = useMemo(
    () => selAdapted.filter((t) => !t.isTransfer),
    [selAdapted],
  );

  const spend = useMemo(
    () =>
      real
        .filter((t) => !t.isCredit)
        .reduce((s, t) => s + Math.abs(t.amount), 0),
    [real],
  );
  const income = useMemo(
    () => real.filter((t) => t.isCredit).reduce((s, t) => s + t.amount, 0),
    [real],
  );
  const net = income - spend;
  const transferAmt = useMemo(
    () =>
      selAdapted
        .filter((t) => t.isTransfer && !t.isCredit)
        .reduce((s, t) => s + Math.abs(t.amount), 0),
    [selAdapted],
  );

  // Previous month — for comparison badge.
  // "Previous month" = the calendar month immediately before the earliest
  // selected month. Badge only renders when prior-month data exists.
  const prevMonth = useMemo(() => {
    if (selectedMonths.length === 0) return null;
    const earliest = [...selectedMonths].sort()[0];
    const [y, mo] = earliest.split("-").map(Number);
    const prevDate = new Date(y, mo - 2, 1); // mo-1 is current, mo-2 is previous
    return `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
  }, [selectedMonths]);

  const prevAdapted = useMemo(
    () =>
      prevMonth
        ? adapted.filter(
            (t) =>
              t.month === prevMonth &&
              (activeAccountId === ALL_ACCOUNTS_ID ||
                t.accountShort === activeAccountId) &&
              !t.isTransfer,
          )
        : [],
    [adapted, prevMonth, activeAccountId],
  );

  const prevIncome = useMemo(
    () =>
      prevAdapted.filter((t) => t.isCredit).reduce((s, t) => s + t.amount, 0),
    [prevAdapted],
  );
  const prevSpend = useMemo(
    () =>
      prevAdapted
        .filter((t) => !t.isCredit)
        .reduce((s, t) => s + Math.abs(t.amount), 0),
    [prevAdapted],
  );
  // Only show badge when prev month data actually exists in our dataset
  const hasPrevData = prevAdapted.length > 0;

  const catData = useMemo(
    () =>
      uniqueCategories
        .map((name, i) => ({
          name,
          color: CAT_COLORS[i % CAT_COLORS.length],
          value: real
            .filter((t) => t.category === name && !t.isCredit)
            .reduce((s, t) => s + Math.abs(t.amount), 0),
        }))
        .filter((d) => d.value > 0)
        .sort((a, b) => b.value - a.value),
    [uniqueCategories, real],
  );
  const catTotal = useMemo(
    () => catData.reduce((s, d) => s + d.value, 0),
    [catData],
  );

  // Per-account breakdown.
  const acctBreakdown = useMemo(
    () =>
      accounts.map((acct, i) => {
        const at = adapted.filter(
          (t) =>
            selectedMonths.includes(t.month) &&
            t.accountShort === acct.id &&
            !t.isTransfer,
        );
        return {
          short: acct.id,
          display: acct.nickname,
          color: ACCOUNT_COLORS[i % ACCOUNT_COLORS.length],
          income: at
            .filter((t) => t.isCredit)
            .reduce((s, t) => s + t.amount, 0),
          spend: at
            .filter((t) => !t.isCredit)
            .reduce((s, t) => s + Math.abs(t.amount), 0),
        };
      }),
    [accounts, adapted, selectedMonths],
  );

  // Resolve the nickname for the weekly aggregation utilities, which filter
  // by t.account (nickname). When "all" is selected pass "all" unchanged.
  const weeklyAccountFilter = useMemo(() => {
    if (activeAccountId === ALL_ACCOUNTS_ID) return ALL_ACCOUNTS_ID;
    return (
      accounts.find((a) => a.id === activeAccountId)?.nickname ??
      ALL_ACCOUNTS_ID
    );
  }, [activeAccountId, accounts]);

  const weeklyBuckets = useMemo(
    () => buildWeeklyTotals(adapted, weeklyAccountFilter),
    [adapted, weeklyAccountFilter],
  );
  const weeklyCategoryBuckets = useMemo(
    () => buildWeeklyCategoryTotals(adapted, weeklyAccountFilter),
    [adapted, weeklyAccountFilter],
  );

  // Map to Transaction shape for LargestTransactions component.
  const txnsForLargest: Transaction[] = useMemo(
    () =>
      real
        .filter((t) => !t.isCredit)
        .map((t) => ({
          date: new Date(`${t.date}T00:00:00`),
          description: t.payee || "Unknown",
          amount: -Math.abs(t.amount),
          category: t.category ?? undefined,
        })),
    [real],
  );

  // Loading state — shown only while initial fetch is running with no data yet.
  if (isLoading && adapted.length === 0) {
    return (
      <div className="dash-empty" data-testid="dashboard-loading">
        <div className="dash-empty-icon">⬡</div>
        <div className="dash-empty-title">Loading…</div>
      </div>
    );
  }

  // Empty state — shown once loading completes but there are no transactions.
  if (!isLoading && adapted.length === 0) {
    return (
      <div className="dash-empty">
        <div className="dash-empty-icon">⬡</div>
        <div className="dash-empty-title">No data yet</div>
        <div className="dash-empty-sub">
          Upload your bank CSV exports using the sidebar. Select multiple files
          at once to import all accounts together.
        </div>
      </div>
    );
  }

  // Condensed heading: 1 month → short label ("May '25");
  // 2+ months → range from chronologically first to last ("Jan '25 – Mar '25").
  const headingText = (() => {
    if (selectedMonths.length === 0) return "No month selected";
    if (selectedMonths.length === 1) return fmtMonthSh(selectedMonths[0]);
    const sorted = [...selectedMonths].sort();
    return `${fmtMonthSh(sorted[0])} – ${fmtMonthSh(sorted[sorted.length - 1])}`;
  })();

  // Subtitle for single month shows account + transaction count.
  const subtitleText = (() => {
    if (selectedMonths.length === 0) return null;
    if (selectedMonths.length === 1) {
      const acctLabel =
        activeAccountId === ALL_ACCOUNTS_ID
          ? "All accounts"
          : (accounts.find((a) => a.id === activeAccountId)?.nickname ??
            "All accounts");
      return `${acctLabel} · ${selAdapted.length} transaction${selAdapted.length === 1 ? "" : "s"}`;
    }
    return `${n} months selected · click to deselect`;
  })();

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
        <div className="dash-title-block">
          <h1 className="dash-heading" data-testid="dash-heading">
            {headingText}
          </h1>
          {subtitleText && (
            <div className="dash-heading-sub" data-testid="dash-subtitle">
              {subtitleText}
            </div>
          )}
        </div>
        <div className="dash-month-pills" data-testid="month-filter">
          {months.map((m) => (
            <button
              key={m}
              className={`pill${selectedMonths.includes(m) ? " pill-active" : ""}`}
              onClick={() => toggleMonth(m)}
              aria-pressed={selectedMonths.includes(m)}
              data-testid={`month-pill-${m}`}
            >
              {fmtMonthSh(m)}
            </button>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      <div className="dash-stats-grid" data-testid="summary-stats">
        <StatCard
          label="Income"
          value={fmt(income)}
          color="var(--accent)"
          barColor="var(--accent)"
          badge={
            hasPrevData
              ? {
                  delta: income - prevIncome,
                  isPositive: income >= prevIncome,
                  prevLabel: prevMonth ? fmtMonthSh(prevMonth) : "prev",
                }
              : undefined
          }
          data-testid="stat-income"
        />
        <StatCard
          label="Spent"
          value={fmt(spend)}
          color="var(--red)"
          barColor="var(--red)"
          badge={
            hasPrevData
              ? {
                  delta: spend - prevSpend,
                  // For spending, a decrease is positive (good news)
                  isPositive: spend <= prevSpend,
                  prevLabel: prevMonth ? fmtMonthSh(prevMonth) : "prev",
                }
              : undefined
          }
          data-testid="stat-spent"
        />
        <StatCard
          label="Net"
          value={`${net >= 0 ? "+" : ""}${fmt(net)}`}
          color={net >= 0 ? "var(--accent)" : "var(--red)"}
          barColor="var(--accent)"
          sub={
            income > 0
              ? `${((net / income) * 100).toFixed(1)}% savings rate`
              : undefined
          }
          data-testid="stat-net"
        />
        <StatCard
          label="Transactions"
          value={String(selAdapted.length)}
          color="var(--text)"
          barColor="var(--amber, #d97706)"
          sub={
            transferAmt > 0
              ? `${selAdapted.filter((t) => t.isTransfer).length} transfers excluded`
              : undefined
          }
          data-testid="stat-transactions"
        />
      </div>

      {/* Goals Summary Widget */}
      <GoalsSummaryWidget />

      {/* Budget Summary Widget */}
      <BudgetSummaryWidget />

      {/* Transfer notice */}
      {transferAmt > 0 && (
        <div className="dash-transfer-notice" data-testid="transfer-notice">
          ↔ {fmt(transferAmt)} in inter-account transfers detected and excluded
          from all totals.
        </div>
      )}

      {/* Per-account breakdown */}
      {activeAccountId === ALL_ACCOUNTS_ID && accounts.length > 1 && (
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
                      <span className="dash-cat-legend-name">{d.name}</span>
                      <span className="mono dash-cat-legend-val">
                        {fmt(d.value)}
                      </span>
                      <span className="dash-cat-legend-pct">
                        {catTotal > 0
                          ? ((d.value / catTotal) * 100).toFixed(1)
                          : "0.0"}
                        %
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Right: donut chart */}
              <div className="dash-cat-chart-col">
                <div className="dash-cat-donut-wrap">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={catData}
                        cx="50%"
                        cy="50%"
                        innerRadius="52%"
                        outerRadius="80%"
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
                        formatter={(v) => [fmt(v as number), "Spend"]}
                        contentStyle={tooltipStyle}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
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
    </div>
  );
}

interface StatBadge {
  delta: number;
  isPositive: boolean;
  prevLabel: string;
}

function StatCard({
  label,
  value,
  color = "var(--text)",
  barColor,
  badge,
  sub,
  "data-testid": testId,
}: {
  label: string;
  value: string;
  color?: string;
  barColor: string;
  badge?: StatBadge;
  sub?: string;
  "data-testid"?: string;
}) {
  return (
    <div
      className="card stat-card"
      style={{ borderTop: `3px solid ${barColor}` }}
      data-testid={testId}
    >
      <div className="stat-label">{label}</div>
      <div className="stat-value mono" style={{ color }}>
        {value}
      </div>
      {badge && (
        <div
          className={`stat-badge ${badge.isPositive ? "stat-badge--up" : "stat-badge--down"}`}
          data-testid={testId ? `${testId}-badge` : undefined}
        >
          {badge.isPositive ? "↑" : "↓"} {fmt(Math.abs(badge.delta))} vs{" "}
          {badge.prevLabel}
        </div>
      )}
      {sub && !badge && (
        <div
          className="stat-sub"
          data-testid={testId ? `${testId}-sub` : undefined}
        >
          {sub}
        </div>
      )}
    </div>
  );
}
