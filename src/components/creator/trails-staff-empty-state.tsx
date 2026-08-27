import Link from "next/link";
import { Sparkles, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateTrailForm } from "@/components/forms/create-trail-form";

type TrailFormOptions = {
  missions: { id: string; title: string }[];
  exercises: { id: string; title: string }[];
  rewards: { id: string; name: string }[];
  classes: { id: string; name: string }[];
};

export function TrailsStaffEmptyState({
  trailOptions,
  canCreate,
}: {
  trailOptions?: TrailFormOptions;
  canCreate: boolean;
}) {
  return (
    <div className="creator-trails-empty flex flex-col items-center rounded-3xl border border-dashed border-slate-200 bg-gradient-to-b from-white to-slate-50 px-6 py-12 text-center">
      <div className="creator-trails-illustration mb-6 flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-br from-violet-100 to-indigo-100 text-6xl">
        🚀
      </div>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Biblioteca — comunidade global</p>
      <h2 className="mt-2 text-2xl font-bold text-slate-900">Trilhas de aprendizado</h2>
      <p className="mt-2 max-w-md text-slate-600">
        Use IA ou crie manualmente trilhas de aprendizado gamificadas para seus alunos.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {canCreate && trailOptions ? (
          <>
            <CreateTrailForm
              options={trailOptions}
              trigger={
                <Button variant="outline" size="lg" className="gap-2">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Criar manual
                </Button>
              }
            />
            <Link href="/dashboard/assistente">
              <Button size="lg" className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Criar com IA
              </Button>
            </Link>
          </>
        ) : (
          <Link href="/dashboard/assistente">
            <Button size="lg" className="gap-2">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Explorar com IA
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
