import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="page-content">
      <h1>404 — Page Not Found</h1>
      <p style={{ color: "#6b7280" }}>
        The page you're looking for doesn't exist.{" "}
        <Link to="/">Go to Dashboard</Link>
      </p>
    </div>
  );
}
