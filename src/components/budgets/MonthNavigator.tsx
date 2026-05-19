// FA-BUDG-002 T015 — Month Navigator component

interface MonthNavigatorProps {
  year: number;
  month: number;
  onPrev: () => void;
  onNext: () => void;
}

export function MonthNavigator({
  year,
  month,
  onPrev,
  onNext,
}: MonthNavigatorProps) {
  const label = new Intl.DateTimeFormat("en-NZ", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1));

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const isCurrentMonth = year === currentYear && month === currentMonth;

  return (
    <div
      className="month-navigator"
      style={{ display: "flex", alignItems: "center", gap: 12 }}
    >
      <button
        type="button"
        onClick={onPrev}
        aria-label="Previous month"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: "1.2rem",
        }}
      >
        ←
      </button>
      <span style={{ fontWeight: 600, minWidth: 140, textAlign: "center" }}>
        {label}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={isCurrentMonth}
        aria-label="Next month"
        aria-disabled={isCurrentMonth}
        style={{
          background: "none",
          border: "none",
          cursor: isCurrentMonth ? "default" : "pointer",
          fontSize: "1.2rem",
          opacity: isCurrentMonth ? 0.3 : 1,
        }}
      >
        →
      </button>
    </div>
  );
}
