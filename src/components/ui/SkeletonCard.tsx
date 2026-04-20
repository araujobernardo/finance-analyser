import "./SkeletonCard.css";

interface Props {
  rows?: number;
}

export function SkeletonCard({ rows = 4 }: Props) {
  return (
    <div
      className="skeleton-card"
      data-testid="skeleton-card"
      aria-busy="true"
      aria-label="Loading…"
    >
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton-card__row">
          <div
            className="skeleton-card__bar skeleton-card__bar--wide"
            style={{ width: i === 0 ? "60%" : `${85 - i * 10}%` }}
          />
          <div className="skeleton-card__bar skeleton-card__bar--narrow" />
        </div>
      ))}
    </div>
  );
}
