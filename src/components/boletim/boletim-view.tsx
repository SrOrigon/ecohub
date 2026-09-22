"use client";

import { useMemo, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  BookOpen,
  Calendar,
  Check,
  Copy,
  Edit3,
  GraduationCap,
  Loader2,
  MessageCircle,
  Sparkles,
  TrendingUp,
  UserCheck,
} from "lucide-react";
import { generatePedagogicalSummary } from "@/actions/report-card-summary";
import { buildWhatsAppLink } from "@/lib/whatsapp-billing";

type BoletimPayload = {
  studentId?: string;
  parentPhone?: string | null;
  parentName?: string | null;
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
  configuredSubjects: string[];
  grades: GradeRow[];
  attendance: { status: string; date: string }[];
  level: number;
  xpTotal: number;
  badgeCount: number;
  badgeNames: string[];
  initialObservations?: string | null;
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
  const [observations, setObservations] = useState<string>(data.initialObservations || "");
  const [isPendingAi, startAiTransition] = useTransition();
  const [aiError, setAiError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [isEditingObservations, setIsEditingObservations] = useState<boolean>(false);

  const filteredGrades = useMemo(
    () =>
      periodFilter === "all"
        ? data.grades
        : data.grades.filter((g) => g.period === periodFilter),
    [data.grades, periodFilter]
  );

  const displayPeriods =
    periodFilter === "all" ? allPeriods : allPeriods.filter((p) => p === periodFilter);

  const matrix = buildSubjectMatrix(filteredGrades, displayPeriods, data.configuredSubjects);
  const overallAvg = computeOverallAverage(filteredGrades);
  const approval = approvalLabel(overallAvg, data.passGrade);
  const attendance = computeAttendanceSummary(data.attendance);

  const handleGenerateAi = () => {
    if (!data.studentId) return;
    setAiError(null);
    startAiTransition(async () => {
      const res = await generatePedagogicalSummary(data.studentId!);
      if (res.error) {
        setAiError(res.error);
      } else if (res.summary) {
        setObservations(res.summary);
      }
    });
  };

  const handleSendWhatsApp = () => {
    let targetPhone = data.parentPhone?.trim() || "";
    if (!targetPhone) {
      const input = window.prompt(
        "Informe o WhatsApp do responsável (DDD + número, ex: 11988887777):"
      );
      if (!input) return;
      targetPhone = input.trim();
    }

    let summaryGradesText = "";
    if (displayPeriods.length > 0) {
      summaryGradesText = displayPeriods
        .map((p) => {
          const periodGrades = data.grades.filter((g) => g.period === p);
          if (periodGrades.length === 0) return null;
          const avg = periodGrades.reduce((sum, g) => sum + g.value, 0) / periodGrades.length;
          return `• ${p}: média ${avg.toFixed(1)}`;
        })
        .filter(Boolean)
        .join("\n");
    }

    let msg = `Olá, ${data.parentName || "família"}! 🎓\n`;
    msg += `Aqui está o resumo do boletim escolar de *${data.studentName}* (${data.schoolName} - ${data.year}):\n\n`;

    if (overallAvg != null) {
      msg += `📌 *Média Geral:* ${overallAvg.toFixed(1)} (Meta de aprovação: ${data.passGrade})\n`;
    }
    if (summaryGradesText) {
      msg += `📊 *Médias por Período:*\n${summaryGradesText}\n`;
    }
    if (attendance) {
      msg += `\n📅 *Frequência Escolar:* ${attendance.rate}% (${attendance.present + attendance.late} presenças em ${attendance.total} aulas)\n`;
    }

    if (observations.trim()) {
      msg += `\n📝 *Parecer Pedagógico da Escola:*\n${observations.trim()}\n`;
    } else {
      msg += `\nPara acompanhar notas detalhadas e atividades diárias, acesse o portal escolar.\n`;
    }

    msg += `\nEstamos à disposição para dialogar sobre o desenvolvimento pedagógico do estudante.\n*${data.schoolName}*`;

    const encoded = encodeURIComponent(msg);
    const link = buildWhatsAppLink(targetPhone, encoded);
    window.open(link, "_blank");
  };

  const handleCopyObservations = () => {
    if (!observations) return;
    navigator.clipboard.writeText(observations);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Barra de Ações Rápidas: IA e WhatsApp */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50/90 to-white p-4 shadow-sm print:hidden">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">Ações Rápidas do Boletim</p>
            <p className="text-xs text-slate-500">
              Síntese pedagógica assistida por IA & envio direto aos responsáveis
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGenerateAi}
            disabled={isPendingAi || !data.studentId}
            className="gap-2 border-indigo-300 bg-white font-medium text-indigo-700 hover:bg-indigo-50"
          >
            {isPendingAi ? (
              <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
            ) : (
              <Sparkles className="h-4 w-4 text-indigo-600" />
            )}
            {isPendingAi ? "Gerando Parecer..." : "Gerar Parecer com IA"}
          </Button>

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleSendWhatsApp}
            className="gap-2 bg-emerald-600 font-medium text-white hover:bg-emerald-700"
          >
            <MessageCircle className="h-4 w-4" />
            Enviar Boletim (WhatsApp)
          </Button>
        </div>
      </div>

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
          value={overallAvg != null ? overallAvg.toFixed(1) : " - "}
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
          value={attendance ? `${attendance.rate}%` : " - "}
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
                           -
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
                    {avg != null ? avg.toFixed(1) : " - "}
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

      {/* Seção de Parecer Descritivo Pedagógico */}
      <section className="rounded-2xl border-2 border-indigo-100 bg-white p-5 shadow-sm print:border-slate-300 print:shadow-none">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-indigo-50 pb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-600" aria-hidden="true" />
            <h2 className="font-bold text-slate-900">Parecer Descritivo Pedagógico</h2>
            <Badge variant="default" className="border-indigo-300 text-indigo-700">
              IA Assistida
            </Badge>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            {observations && (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditingObservations(!isEditingObservations)}
                  className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  {isEditingObservations ? "Visualizar" : "Editar"}
                </button>
                <button
                  type="button"
                  onClick={handleCopyObservations}
                  className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copiar
                    </>
                  )}
                </button>
              </>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleGenerateAi}
              disabled={isPendingAi || !data.studentId}
              className="gap-1.5 text-xs text-indigo-700 hover:bg-indigo-50"
            >
              {isPendingAi ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              )}
              {observations ? "Regenerar com IA" : "Gerar com IA"}
            </Button>
          </div>
        </div>

        {aiError && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {aiError}
          </div>
        )}

        {isEditingObservations ? (
          <textarea
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            rows={8}
            className="w-full rounded-xl border border-slate-300 p-3 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="Escreva ou edite o parecer pedagógico descritivo do estudante..."
          />
        ) : observations ? (
          <div className="whitespace-pre-line rounded-xl bg-slate-50/80 p-4 text-sm leading-relaxed text-slate-700 print:bg-transparent print:p-0">
            {observations}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-8 text-center print:hidden">
            <Sparkles className="mb-2 h-8 w-8 text-indigo-400" />
            <p className="text-sm font-medium text-slate-700">
              Nenhum parecer descritivo registrado
            </p>
            <p className="mt-1 max-w-md text-xs text-slate-500">
              Clique no botão &quot;Gerar Parecer com IA&quot; para analisar o histórico
              recente de notas, frequência e comportamento do estudante e sintetizar o documento.
            </p>
          </div>
        )}
      </section>

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
