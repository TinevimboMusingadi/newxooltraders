export function Skeleton({ width = '100%', height = '1rem', style = {} }) {
  return (
    <div
      className="skeleton-pulse"
      style={{ width, height, borderRadius: 'var(--radius-sm)', ...style }}
    />
  );
}

export function CardSkeleton({ lines = 3 }) {
  return (
    <div className="card skeleton-card">
      <Skeleton width="40%" height="1.2rem" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} width={`${70 + Math.random() * 30}%`} height="0.9rem" style={{ marginTop: '10px' }} />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="skeleton-table">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="skeleton-table-row">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} width={`${60 + Math.random() * 40}%`} height="0.85rem" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="skeleton-chart">
      <Skeleton width="100%" height="100%" />
    </div>
  );
}
