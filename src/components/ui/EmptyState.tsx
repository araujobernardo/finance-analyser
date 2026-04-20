import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import "./EmptyState.css";

interface Props {
  icon: ReactNode;
  message: string;
  ctaLabel?: string;
  ctaTo?: string;
}

export function EmptyState({ icon, message, ctaLabel, ctaTo }: Props) {
  return (
    <div className="empty-state" data-testid="empty-state">
      <span className="empty-state__icon" aria-hidden="true">
        {icon}
      </span>
      <p className="empty-state__message">{message}</p>
      {ctaLabel && ctaTo && (
        <Link to={ctaTo} className="empty-state__cta">
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}
