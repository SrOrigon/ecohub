"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import {
  approvalLabel,
  buildSubjectMatrix,
  computeAttendanceSummary,
  computeOverallAverage,
  formatGradeDisplay,
  gradeVariant,
  sortPeriods,
  type GradeRow,
} from "@/lib/boletim";
import { cn } from "@/lib/utils";
import { Calendar, GraduationCap, TrendingUp, UserCheck } from "lucide-react";

type BoletimPayload = {
  studentName: string;
  avatarUrl: string | null;
  enrollmentCode: string;
  email: string;
  className: string | null;
  schoolName: string;
  year: number;
  passGrade: number;
  maxGrade: number;
  schoolPeriods: string[];
  grades: GradeRow[];
  attendance: { status: string; date: string }[];
  level: number;
  xpTotal: number;
  badgeCount: number;
  badgeNames: string[];
};

function gradeCellClass(variant: "success" | "warning" | "danger") {
  if (variant === "success") return "bg-emerald-50 text-emerald-900 font-semibold";
  if (variant === "warning") return "bg-amber-50 text-amber-900 font-semibold";
  return "bg-red-50 text-red-900 font-semibold";
}

export function BoletimView({ data }: { data: BoletimPayload }) {
  const allPeriods = useMemo(
    () => sortPeriods([...new Set(data.grades.map((g) => g.period))], data.schoolPeriods),
    [data.grades, data.schoolPeriods]
  );

  const [periodFilter, setPeriodFilter] = useState<string>("all");

  const filteredGrades = useMemo(
    () =>
      periodFilter === "all"
        ? data.grades
        : data.grades.filter((g) => g.period === periodFilter),
    [data.grades, periodFilter]
  );

  const displayPeriods =
    periodFilter === "all" ? allPeriods : allPeriods.filter((p) => p === periodFilter);

  const matrix = buildSubjectMatrix(filteredGrades, displayPeriods);
  const overallAvg = computeOverallAverage(filteredGrades);
  const approval = approvalLabel(overallAvg, data.passGrade);
  const attendance = computeAttendanceSummary(data.attendance);

  return (
    <div className="space-y-6">
      <section className="flex flex-col items-center gap-4 rounded-2xl border-2 border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-white p-5 sm:flex-row sm:items-start sm:p-6">
        <ProfileAvatar name={data.studentName} avatarUrl={data.avatarUrl} size="lg" />
        <div className="min-w-0 flex-1 space-y-2 text-center sm:text-left">
          <h2 className="text-xl font-bold text-slate-900">{data.studentName}</h2>
          <p className="text-sm text-slate-600">
            Matrícula {data.enrollmentCode} · {data.className ?? "Sem turma"}
          </p>
          <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
            <Badge
              variant={
                approval.tone === "success"
                  ? "success"
                  : approval.tone === "warning"
                    ? "warning"
                    : approval.tone === "danger"
                      ? "danger"
                      : "secondary"
              }
            >
              {approval.label}
              {overallAvg != null && ` · média ${overallAvg.toFixed(1)}`}
            </Badge>
            {attendance && (
              <Badge variant={attendance.rate >= 75 ? "success" : "warning"}>
                Frequência {attendance.rate}%
              </Badge>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        <SummaryCard
          icon={TrendingUp}
          label="Média geral"
          value={overallAvg != null ? overallAvg.toFixed(1) : "—"}
          hint={`Aprovação ≥ ${data.passGrade}`}
        />
        <SummaryCard
          icon={GraduationCap}
          label="Disciplinas"
          value={String(matrix.length)}
          hint={`Escala 0–${data.maxGrade}`}
        />
        <SummaryCard
          icon={UserCheck}
          label="Presença"
          value={attendance ? `${attendance.rate}%` : "—"}
          hint={attendance ? `${attendance.present + attendance.late} de ${attendance.total} aulas` : "Sem registros"}
        />
        <SummaryCard
          icon={Calendar}
          label="Gamificação"
          value={`Nv. ${data.level}`}
          hint={`${data.xpTotal} XP · ${data.badgeCount} badge(s)`}
        />
      </div>

      {allPeriods.length > 1 && (
        <div className="touch-scroll-x flex gap-2 pb-1" role="tablist" aria-label="Filtrar por período">
          <PeriodChip active={periodFilter === "all"} onClick={() => setPeriodFilter("all")}>
            Todos
          </PeriodChip>
          {allPeriods.map((p) => (
            <PeriodChip key={p} active={periodFilter === p} onClick={() => setPeriodFilter(p)}>
              {p.length > 28 ? `${p.slice(0, 28)}…` : p}
            </PeriodChip>
          ))}
        </div>
      )}

      <section className="min-w-0">
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-indigo-700">
          <GraduationCap className="h-5 w-5" aria-hidden="true" />
          Desempenho acadêmico
        </h2>
        {filteredGrades.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-600">
            Nenhuma nota lançada para este período.
          </p>
        ) : (
          <ResponsiveTable minWidth="28rem" className="border-collapse">
            <thead>
              <tr className="bg-indigo-50">
                <th className="border p-2 text-left">Disciplina</th>
                {displayPeriods.map((p) => (
                  <th key={p} className="border p-2 text-center text-xs sm:text-sm">
                    {p.length > 20 ? `${p.slice(0, 20)}…` : p}
                  </th>
                ))}
                <th className="border p-2 text-center">Média</th>
              </tr>
            </thead>
            <tbody>
              {matrix.map(({ subject, byPeriod, avg }) => (
                <tr key={subject}>
                  <td className="border p-2 font-medium">{subject}</td>
                  {displayPeriods.map((period) => {
                    const g = byPeriod[period];
                    if (!g) {
                      return (
                        <td key={period} className="border p-2 text-center text-slate-400">
                          —
                        </td>
                      );
                    }
                    const variant = gradeVariant(g.value, data.passGrade, g.maxValue);
                    return (
                      <td
                        key={period}
                        className={cn("border p-2 text-center", gradeCellClass(variant))}
                        title={`Lançada em ${new Date(g.createdAt).toLocaleDateString("pt-BR")}`}
                      >
                        {formatGradeDisplay(g.value, g.maxValue, data.maxGrade)}
                      </td>
                    );
                  })}
                  <td
                    className={cn(
                      "border p-2 text-center font-bold",
                      avg != null ? gradeCellClass(gradeVariant(avg, data.passGrade, data.maxGrade)) : ""
                    )}
                  >
                    {avg != null ? avg.toFixed(1) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            {periodFilter === "all" && overallAvg != null && (
              <tfoot>
                <tr className="bg-slate-50 font-semibold">
                  <td className="border p-2" colSpan={displayPeriods.length + 1}>
                    Média geral
                  </td>
                  <td
                    className={cn(
                      "border p-2 text-center",
                      gradeCellClass(gradeVariant(overallAvg, data.passGrade, data.maxGrade))
                    )}
                  >
                    {overallAvg.toFixed(1)}
                  </td>
                </tr>
              </tfoot>
            )}
          </ResponsiveTable>
        )}
        <p className="mt-2 text-xs text-slate-500">
          Verde = acima da média de aprovação ({data.passGrade}). Amarelo = recuperação. Vermelho = abaixo.
        </p>
      </section>

      {attendance && (
        <section className="rounded-xl border border-slate-200 p-4">
          <h2 className="mb-3 font-semibold text-indigo-700">Frequência recente</h2>
          <div className="stat-grid gap-3 text-sm">
            <StatPill label="Presenças" value={attendance.present} tone="success" />
            <StatPill label="Faltas" value={attendance.absent} tone="danger" />
            <StatPill label="Atrasos" value={attendance.late} tone="warning" />
            <StatPill label="Justificadas" value={attendance.justified} tone="default" />
          </div>
        </section>
      )}

      {data.badgeNames.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold text-indigo-700">Conquistas</h2>
          <div className="flex flex-wrap gap-2">
            {data.badgeNames.map((name) => (
              <Badge key={name} variant="default">
                {name}
              </Badge>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-0.5 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

function PeriodChip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-4 py-2 text-sm font-medium min-h-11 transition-colors",
        active
          ? "bg-[color:var(--school-primary)] text-white"
          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
      )}
    >
      {children}
    </button>
  );
}

function StatPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "success" | "warning" | "danger" | "default";
}) {
  const colors = {
    success: "bg-emerald-50 text-emerald-800",
    warning: "bg-amber-50 text-amber-800",
    danger: "bg-red-50 text-red-800",
    default: "bg-slate-50 text-slate-800",
  };
  return (
    <div className={cn("rounded-lg px-3 py-2 text-center", colors[tone])}>
      <p className="text-xs opacity-80">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}
