import Link from "next/link";
import { BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ConfigureSubjectsPrompt({
  canManage,
  title = "Cadastre as disciplinas da instituição",
  description = "Notas, horários, diário e exercícios usam somente as matérias que você cadastrar. Ex.: um curso de programação pode ter apenas “Programação Web”.",
}: {
  canManage: boolean;
  title?: string;
  description?: string;
}) {
  return (
    <Card className="border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/20">
      <CardContent className="flex flex-wrap items-start gap-4 py-5">
        <BookOpen className="mt-0.5 h-6 w-6 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900 dark:text-slate-100">{title}</p>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{description}</p>
          {canManage && (
            <Link href="/dashboard/disciplinas" className="mt-4 inline-block">
              <Button size="sm">Gerenciar disciplinas</Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
