export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Carregando conteúdo">
      <div className="space-y-2">
        <div className="h-8 w-48 rounded-lg bg-slate-200" />
        <div className="h-4 w-72 max-w-full rounded bg-slate-100" />
      </div>
      <div className="responsive-grid">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl border border-slate-200 bg-white p-4">
            <div className="h-4 w-24 rounded bg-slate-100" />
            <div className="mt-4 h-8 w-16 rounded bg-slate-200" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-64 rounded-xl border border-slate-200 bg-white" />
        <div className="h-64 rounded-xl border border-slate-200 bg-white" />
      </div>
    </div>
  );
}
