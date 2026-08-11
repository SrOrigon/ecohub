"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Download,
  FileSpreadsheet,
  Printer,
  Users,
  BookOpen,
  GraduationCap,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { InstitutionalReport } from "@/lib/institutional-report";
import {
  buildReportCsv,
  downloadCsv,
  type ReportExportKind,
} from "@/lib/report-export";
import { cn } from "@/lib/utils";

type Tab = "summary" | "subjects" | "students" | "matrix";

const EXPORT_OPTIONS: { kind: ReportExportKind; label: string; description: string }[] = [
  { kind: "full", label: "Relatório completo", description: "Todas as seções em um arquivo" },
  { kind: "summary", label: "Resumo", description: "Indicadores institucionais" },
  { kind: "subjects", label: "Disciplinas", description: "Precisão e desempenho por matéria" },
  { kind: "students", label: "Alunos", description: "Lista geral de alunos" },
  { kind: "student-subjects", label: "Aluno × Disciplina", description: "Detalhe por matéria de cada aluno" },
  { kind: "classes", label: "Turmas", description: "Desempenho por turma" },
];

export function InstitutionalReportDashboard({ report }: { report: InstitutionalReport }) {
  const [tab, setTab] = useState<Tab>("summary");
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  const generatedLabel = useMemo(
    () => new Date(report.generatedAt).toLocaleString("pt-BR"),
    [report.generatedAt]
  );

  function handleExport(kind: ReportExportKind) {
    const { filename, content } = buildReportCsv(report, kind);
    downloadCsv(filename, content);
    setExportOpen(false);
  }

  return (
    <div className="report-root space-y-6">
      <div className="no-print flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-semibold text-slate-900">{report.schoolName}</p>
          <p className="text-sm text-slate-500">Gerado em {generatedLabel}</p>
        </div>
        <div className="mobile-action-row sm:justify-end">
          <div className="relative w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2 sm:w-auto"
              onClick={() => setExportOpen((v) => !v)}
            >
              <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
              Exportar Excel (CSV)
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </Button>
            {exportOpen && (
              <div className="absolute left-0 right-0 z-20 mt-2 max-h-[min(70dvh,24rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-lg sm:left-auto sm:right-0 sm:w-72">
                {EXPORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.kind}
                    type="button"
                    className="flex w-full flex-col rounded-lg px-3 py-2 text-left hover:bg-slate-50"
                    onClick={() => handleExport(opt.kind)}
                  >
                    <span className="text-sm font-medium text-slate-900">{opt.label}</span>
                    <span className="text-xs text-slate-500">{opt.description}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Link href="/dashboard/relatorios/imprimir" target="_blank" className="w-full sm:w-auto">
            <Button type="button" variant="outline" className="w-full gap-2 sm:w-auto">
              <Printer className="h-4 w-4" aria-hidden="true" />
              Imprimir / PDF
            </Button>
          </Link>
          <Button type="button" className="w-full gap-2 sm:w-auto" onClick={() => handleExport("full")}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Baixar completo
          </Button>
        </div>
      </div>

      <div className="print-only hidden print:block mb-4 border-b pb-4">
        <h1 className="text-2xl font-bold">Relatório institucional — {report.schoolName}</h1>
        <p className="text-sm text-slate-600">Gerado em {generatedLabel} · Meta {report.passGrade}</p>
      </div>

      <div className="no-print touch-scroll-x flex gap-2 pb-1">
        <TabButton active={tab === "summary"} onClick={() => setTab("summary")} label="Resumo" />
        <TabButton active={tab === "subjects"} onClick={() => setTab("subjects")} label="Disciplinas" />
        <TabButton active={tab === "students"} onClick={() => setTab("students")} label="Alunos" />
        <TabButton active={tab === "matrix"} onClick={() => setTab("matrix")} label="Aluno × Matéria" />
      </div>

      {tab === "summary" && <SummarySection report={report} />}
      {tab === "subjects" && <SubjectsSection report={report} />}
      {tab === "students" && (
        <StudentsSection
          report={report}
          expandedStudent={expandedStudent}
          onToggle={(id) => setExpandedStudent((c) => (c === id ? null : id))}
        />
      )}
      {tab === "matrix" && <MatrixSection report={report} />}

      <p className="no-print text-xs text-slate-500">
        Arquivos CSV usam separador <strong>;</strong> e codificação UTF-8 — abra no Excel, Google Sheets ou LibreOffice.
        Para PDF, use <strong>Imprimir / PDF</strong> e escolha &quot;Salvar como PDF&quot; no navegador.
      </p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition",
        active ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
      )}
    >
      {label}
    </button>
  );
}

function SummarySection({ report }: { report: InstitutionalReport }) {
  const s = report.summary;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Alunos" value={String(s.totalStudents)} />
        <StatCard icon={GraduationCap} label="Turmas" value={String(s.totalClasses)} />
        <StatCard icon={BookOpen} label="Média geral" value={s.averageGrade.toFixed(1)} sub={`Meta ${report.passGrade}`} />
        <StatCard icon={BookOpen} label="Saúde pedagógica" value={`${s.healthScore}`} sub={s.healthLabel} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Indicadores consolidados</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <Row label="Frequência institucional" value={`${s.attendanceRate}%`} />
          <Row label="Taxa de aprovação" value={`${s.passRate}%`} />
          <Row label="XP total distribuído" value={s.totalXp.toLocaleString("pt-BR")} />
          <Row label="Entregas de exercícios" value={String(s.exerciseSubmissions)} />
          <Row label="Precisão média (disciplinas)" value={`${s.overallPrecision}/100`} />
          <Row label="Professores" value={String(s.totalTeachers)} />
        </CardContent>
      </Card>
    </div>
  );
}

function SubjectsSection({ report }: { report: InstitutionalReport }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Disciplinas — precisão e desempenho</CardTitle>
        <CardDescription>
          {report.subjects.length} disciplina(s) · configuradas: {report.configuredSubjects.join(", ")}
        </CardDescription>
      </CardHeader>
      <CardContent className="table-scroll-container">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b text-left text-slate-500">
              <th className="pb-3 pr-3">Disciplina</th>
              <th className="pb-3 pr-3">Média</th>
              <th className="pb-3 pr-3">Notas</th>
              <th className="pb-3 pr-3">Alunos</th>
              <th className="pb-3 pr-3">Aprovação</th>
              <th className="pb-3 pr-3">Precisão</th>
              <th className="pb-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {report.subjects.map((s) => (
              <tr key={s.subject} className="border-b border-slate-50">
                <td className="py-2.5 pr-3 font-medium">
                  {s.subject}
                  {!s.configured && (
                    <Badge variant="warning" className="ml-2 text-xs">
                      Extra
                    </Badge>
                  )}
                </td>
                <td className="py-2.5 pr-3">{s.average.toFixed(1)}</td>
                <td className="py-2.5 pr-3">{s.gradeCount}</td>
                <td className="py-2.5 pr-3">{s.studentsWithGrades}</td>
                <td className="py-2.5 pr-3">{s.passRatePercent}%</td>
                <td className="py-2.5 pr-3 font-semibold">{s.precisionScore}</td>
                <td className="py-2.5">{s.precisionLabel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function StudentsSection({
  report,
  expandedStudent,
  onToggle,
}: {
  report: InstitutionalReport;
  expandedStudent: string | null;
  onToggle: (id: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Alunos — visão individual</CardTitle>
        <CardDescription>Clique no aluno para ver disciplinas e médias</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {report.students.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum aluno no escopo deste relatório.</p>
        ) : (
          report.students.map((s) => {
            const open = expandedStudent === s.studentId;
            return (
              <div key={s.studentId} className="rounded-xl border border-slate-100">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50"
                  onClick={() => onToggle(s.studentId)}
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{s.name}</p>
                    <p className="text-xs text-slate-500">
                      {s.enrollmentCode} · {s.className} · {s.subjectCount} disciplina(s)
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant={statusVariant(s.approvalStatus)}>{s.approvalStatus}</Badge>
                    <span className="font-bold text-indigo-600">
                      {s.overallAverage?.toFixed(1) ?? "—"}
                    </span>
                    {open ? (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                </button>
                {open && s.subjects.length > 0 && (
                  <div className="table-scroll-container border-t bg-slate-50/80 px-4 py-3">
                    <table className="min-w-[36rem] w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-slate-500">
                          <th className="pb-2 pr-2">Disciplina</th>
                          <th className="pb-2 pr-2">Média</th>
                          <th className="pb-2 pr-2">Notas</th>
                          <th className="pb-2 pr-2">Períodos</th>
                          <th className="pb-2">Situação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {s.subjects.map((sub) => (
                          <tr key={sub.subject} className="border-t border-slate-100">
                            <td className="py-1.5 pr-2 font-medium">{sub.subject}</td>
                            <td className="py-1.5 pr-2">{sub.average.toFixed(1)}</td>
                            <td className="py-1.5 pr-2">{sub.gradeCount}</td>
                            <td className="py-1.5 pr-2 text-xs">{sub.periods || "—"}</td>
                            <td className="py-1.5">
                              <Badge variant={statusVariant(sub.status)}>{sub.status}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

function MatrixSection({ report }: { report: InstitutionalReport }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Matriz aluno × disciplina</CardTitle>
        <CardDescription>{report.studentSubjectRows.length} registro(s) — ideal para exportação Excel</CardDescription>
      </CardHeader>
      <CardContent className="table-scroll-container">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b text-left text-slate-500">
              <th className="pb-3 pr-3">Aluno</th>
              <th className="pb-3 pr-3">Matrícula</th>
              <th className="pb-3 pr-3">Turma</th>
              <th className="pb-3 pr-3">Disciplina</th>
              <th className="pb-3 pr-3">Média</th>
              <th className="pb-3 pr-3">Notas</th>
              <th className="pb-3 pr-3">Períodos</th>
              <th className="pb-3">Situação</th>
            </tr>
          </thead>
          <tbody>
            {report.studentSubjectRows.map((r, i) => (
              <tr key={`${r.studentId}-${r.subject}-${i}`} className="border-b border-slate-50">
                <td className="py-2 pr-3 font-medium">{r.studentName}</td>
                <td className="py-2 pr-3">{r.enrollmentCode}</td>
                <td className="py-2 pr-3">{r.className}</td>
                <td className="py-2 pr-3">{r.subject}</td>
                <td className="py-2 pr-3">{r.average.toFixed(1)}</td>
                <td className="py-2 pr-3">{r.gradeCount}</td>
                <td className="py-2 pr-3 text-xs">{r.periods || "—"}</td>
                <td className="py-2">
                  <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function statusVariant(status: string) {
  if (status === "Aprovado") return "success" as const;
  if (status === "Recuperação") return "warning" as const;
  if (status === "Atenção") return "danger" as const;
  return "secondary" as const;
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-slate-500">{label}</CardTitle>
        <Icon className="h-4 w-4 text-indigo-600" aria-hidden="true" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        {sub && <p className="text-xs text-slate-500">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 border-b border-slate-50 py-1.5">
      <span className="text-slate-600">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
