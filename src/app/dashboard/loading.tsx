export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Carregando conteúdo">
      <div className="space-y-2">
        <div className="h-8 w-48 rounded-lg bg-[var(--border)]" />
        <div className="h-4 w-72 max-w-full rounded bg-[var(--border-subtle)]" />
      </div>
      <div className="responsive-grid">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-28 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
          >
            <div className="h-4 w-24 rounded bg-[var(--border-subtle)]" />
            <div className="mt-4 h-8 w-16 rounded bg-[var(--border)]" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-64 rounded-xl border border-[var(--border)] bg-[var(--surface)]" />
        <div className="h-64 rounded-xl border border-[var(--border)] bg-[var(--surface)]" />
      </div>
    </div>
  );
}
