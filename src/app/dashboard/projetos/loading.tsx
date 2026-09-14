import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function ProjetosLoading() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Galeria de Games e Projetos"
        description="Explore os jogos e projetos desenvolvidos pelos alunos da escola."
      />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="flex h-[320px] flex-col overflow-hidden rounded-xl border-2 shadow-sm">
            <div className="relative aspect-video w-full animate-pulse bg-slate-200 dark:bg-slate-800" />
            <CardHeader className="p-4 pb-2">
              <div className="h-6 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
              <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            </CardHeader>
            <CardContent className="flex-1 p-4 pt-2 space-y-2">
              <div className="h-3 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
              <div className="h-3 w-5/6 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
            </CardContent>
            <div className="p-4 pt-0 mt-auto">
              <div className="h-10 w-full animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
