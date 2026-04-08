import "./MonthToggleBar.css";

interface Props {
  months: string[];
  selectedMonth: string | null;
  onMonthSelect: (month: string) => void;
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleString("en", { month: "short", year: "numeric" });
}

export function MonthToggleBar({
  months,
  selectedMonth,
  onMonthSelect,
}: Props) {
  if (months.length === 0) return null;

  return (
    <div className="month-toggle-bar" role="group" aria-label="Select month">
      {months.map((monthKey) => (
        <button
          key={monthKey}
          type="button"
          className={
            monthKey === selectedMonth
              ? "month-toggle-btn month-toggle-btn--active"
              : "month-toggle-btn"
          }
          aria-pressed={monthKey === selectedMonth}
          onClick={() => onMonthSelect(monthKey)}
        >
          {formatMonthLabel(monthKey)}
        </button>
      ))}
    </div>
  );
}
