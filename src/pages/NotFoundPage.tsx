export function NotFoundPage() {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 12,
        color: "var(--muted)",
      }}
    >
      <div style={{ fontSize: 48 }}>404</div>
      <div style={{ fontSize: 20, color: "var(--subtle)", fontWeight: 500 }}>
        Page Not Found
      </div>
      <div style={{ fontSize: 14, color: "var(--muted)" }}>
        The page you're looking for doesn't exist.
      </div>
    </div>
  );
}
