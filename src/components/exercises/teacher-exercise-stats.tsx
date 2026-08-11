import { Card, CardContent } from "@/components/ui/card";
import { ClipboardCheck, FileEdit, Users } from "lucide-react";

export function TeacherExerciseStats({
  total,
  pendingGrades,
  active,
}: {
  total: number;
  pendingGrades: number;
  active: number;
}) {
  return (
    <div className="stat-grid gap-4">
      <Card className="border-indigo-100 bg-indigo-50/40">
        <CardContent className="flex items-center gap-3 py-4">
          <FileEdit className="h-8 w-8 shrink-0 text-indigo-600" aria-hidden="true" />
          <div>
            <p className="text-2xl font-bold text-slate-900">{total}</p>
            <p className="text-sm text-slate-600">Publicados</p>
          </div>
        </CardContent>
      </Card>
      <Card className={pendingGrades > 0 ? "border-amber-200 bg-amber-50/60" : ""}>
        <CardContent className="flex items-center gap-3 py-4">
          <ClipboardCheck className="h-8 w-8 shrink-0 text-amber-600" aria-hidden="true" />
          <div>
            <p className="text-2xl font-bold text-slate-900">{pendingGrades}</p>
            <p className="text-sm text-slate-600">Aguardando correção</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-3 py-4">
          <Users className="h-8 w-8 shrink-0 text-emerald-600" aria-hidden="true" />
          <div>
            <p className="text-2xl font-bold text-slate-900">{active}</p>
            <p className="text-sm text-slate-600">Ativos agora</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
