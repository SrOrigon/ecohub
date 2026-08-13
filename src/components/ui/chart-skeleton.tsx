export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={className ?? "h-72 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--muted)]/30"}
      aria-hidden="true"
    />
  );
}
