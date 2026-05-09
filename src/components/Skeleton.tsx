import "./Skeleton.css";

interface SkeletonProps {
  count?: number;
  height?: string;
  width?: string;
}

export function Skeleton({
  count = 1,
  height = "2.5rem",
  width = "100%",
}: SkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-block" style={{ height, width }} />
      ))}
    </>
  );
}
