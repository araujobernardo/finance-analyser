import "./IncomeExpenseChart.css";

// Minimal shape from DashboardPage — mirrors AdaptedTxn fields used here.
interface TxnSlice {
  month: string;
  amount: number;
  isCredit: boolean;
  isTransfer: boolean;
}

interface IncomeExpenseChartProps {
  // All transactions already filtered by active account (but NOT by month pill).
  adapted: TxnSlice[];
  // The most-recently-selected month pill ("YYYY-MM"), used to highlight the row.
  currentMonth: string;
}

interface MonthSummary {
  month: string;
  label: string;
  income: number;
  expense: number;
  net: number;
  isCurrent: boolean;
}

function fmtMonthSh(m: string): string {
  if (!m) return "";
  const [y, mo] = m.split("-");
  return (
    new Date(+y, +mo - 1, 1).toLocaleString("en-NZ", { month: "short" }) +
    " '" +
    y.slice(2)
  );
}

function fmtNZD(n: number): string {
  return "$" + Math.abs(n).toLocaleString("en-NZ");
}

const MAX_MONTHS = 5;

export function IncomeExpenseChart({
  adapted,
  currentMonth,
}: IncomeExpenseChartProps) {
  // Derive last 5 months with data (chronological order, oldest first).
  const monthSummaries: MonthSummary[] = (() => {
    const real = adapted.filter((t) => !t.isTransfer);
    const monthSet = new Set(real.map((t) => t.month));
    const sortedMonths = Array.from(monthSet)
      .sort()
      .reverse()
      .slice(0, MAX_MONTHS)
      .reverse(); // chronological order

    return sortedMonths.map((m) => {
      const txns = real.filter((t) => t.month === m);
      const income = txns
        .filter((t) => t.isCredit)
        .reduce((s, t) => s + t.amount, 0);
      const expense = txns
        .filter((t) => !t.isCredit)
        .reduce((s, t) => s + Math.abs(t.amount), 0);
      return {
        month: m,
        label: fmtMonthSh(m),
        income,
        expense,
        net: income - expense,
        isCurrent: m === currentMonth,
      };
    });
  })();

  if (monthSummaries.length === 0) {
    return (
      <div className="ie-chart" data-testid="income-expense-chart">
        <div className="ie-header">
          <div className="ie-title">Income vs Expenses</div>
          <div className="ie-subtitle">Last 5 months</div>
        </div>
        <div className="ie-empty">No data for selected account</div>
      </div>
    );
  }

  const maxVal = Math.max(
    ...monthSummaries.flatMap((d) => [d.income, d.expense]),
    1, // guard against division by zero
  );

  return (
    <div className="ie-chart" data-testid="income-expense-chart">
      <div className="ie-header">
        <div className="ie-title">Income vs Expenses</div>
        <div className="ie-subtitle">Last 5 months</div>
      </div>

      <div className="ie-rows">
        {monthSummaries.map((d) => {
          const incomeW = Math.round((d.income / maxVal) * 100);
          const expenseW = Math.round((d.expense / maxVal) * 100);
          const netPositive = d.net >= 0;

          return (
            <div
              key={d.month}
              className={`ie-row${d.isCurrent ? " ie-row--current" : ""}`}
              data-testid={`month-row-${d.month}`}
            >
              <div className="ie-month-name">{d.label}</div>

              <div className="ie-bars-col">
                {/* Income bar */}
                <div className="ie-bar-row">
                  <span className="ie-bar-label">I</span>
                  <div className="ie-bar-track">
                    <div
                      className="ie-bar-fill ie-bar-fill--income"
                      style={{ width: `${incomeW}%` }}
                    />
                  </div>
                  <span className="ie-bar-amount ie-bar-amount--income">
                    {fmtNZD(d.income)}
                  </span>
                </div>

                {/* Expense bar */}
                <div className="ie-bar-row">
                  <span className="ie-bar-label">E</span>
                  <div className="ie-bar-track">
                    <div
                      className="ie-bar-fill ie-bar-fill--expense"
                      style={{ width: `${expenseW}%` }}
                    />
                  </div>
                  <span className="ie-bar-amount ie-bar-amount--expense">
                    {fmtNZD(d.expense)}
                  </span>
                </div>

                {/* Net badge */}
                <div
                  className={`ie-net-badge${netPositive ? " ie-net-badge--positive" : " ie-net-badge--negative"}`}
                  data-testid={`net-badge-${d.month}`}
                >
                  {netPositive ? "+" : "-"}
                  {fmtNZD(d.net)} saved
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="ie-legend">
        <div className="ie-legend-item">
          <div className="ie-legend-swatch ie-legend-swatch--income" />
          Income
        </div>
        <div className="ie-legend-item">
          <div className="ie-legend-swatch ie-legend-swatch--expense" />
          Expenses
        </div>
      </div>
    </div>
  );
}
