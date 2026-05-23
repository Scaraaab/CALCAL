export default function Skeleton({ className = '', height = 'h-4', rounded = 'rounded-xl' }) {
  return <div className={`skeleton ${height} ${rounded} ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="card p-5 space-y-3">
      <Skeleton height="h-4" className="w-1/3" />
      <Skeleton height="h-8" className="w-1/2" />
      <Skeleton height="h-3" className="w-full" />
      <Skeleton height="h-3" className="w-2/3" />
    </div>
  );
}
