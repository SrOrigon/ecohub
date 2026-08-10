import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { FileCheck } from "lucide-react";

type JustificationRecord = {
  id: string;
  date: Date;
  justificationNote: string | null;
  student: {
    id: string;
    user: { fullName: string };
    classGroup: { name: string } | null;
  };
  justifiedBy: { fullName: string } | null;
  justifiedAt: Date | null;
};

export function JustificationsPanel({ records }: { records: JustificationRecord[] }) {
  if (records.length === 0) return null;

  return (
    <Card className="border-sky-200 dark:border-sky-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileCheck className="h-5 w-5 text-sky-600" aria-hidden="true" />
          Justificativas de faltas ({records.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {records.map((r) => (
          <div key={r.id} className="rounded-lg border border-slate-100 p-3 text-sm dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <Link
                  href={`/dashboard/responsavel/filho/${r.student.id}`}
                  className="font-medium text-indigo-700 hover:underline dark:text-indigo-300"
                >
                  {r.student.user.fullName}
                </Link>
                <p className="text-xs text-slate-500">
                  {r.student.classGroup?.name ?? "Sem turma"} · {formatDate(r.date)}
                </p>
              </div>
              <Badge variant="secondary">Justificada</Badge>
            </div>
            {r.justificationNote && (
              <p className="mt-2 text-slate-700 dark:text-slate-300">{r.justificationNote}</p>
            )}
            <p className="mt-1 text-xs text-slate-400">
              Por {r.justifiedBy?.fullName ?? "Responsável"}
              {r.justifiedAt && ` · ${formatDate(r.justifiedAt)}`}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
