"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Printer, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { InstitutionalReport } from "@/lib/institutional-report";
import { triggerPrintReport } from "@/lib/report-export";

export function PrintableReport({ report }: { report: InstitutionalReport }) {
  const generatedLabel = new Date(report.generatedAt).toLocaleString("pt-BR");

  useEffect(() => {
    document.body.classList.add("report-print-mode");
    return () => document.body.classList.remove("report-print-mode");
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-8 bg-white p-6 text-slate-900 print:p-0">
      <div className="no-print flex items-center justify-between gap-4 border-b pb-4">
        <Link href="/dashboard/relatorios">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </Link>
        <Button type="button" className="gap-2" onClick={triggerPrintReport}>
          <Printer className="h-4 w-4" />
          Imprimir / Salvar PDF
        </Button>
      </div>

      <header className="border-b pb-4">
        <h1 className="text-2xl font-bold">Relatório institucional pedagógico</h1>
        <p className="mt-1 text-lg font-semibold">{report.schoolName}</p>
        <p className="text-sm text-slate-600">
          Gerado em {generatedLabel} · Meta de aprovação: {report.passGrade} · Nota máxima:{" "}
          {report.maxGrade}
        </p>
      </header>

      <section>
        <h2 className="mb-3 text-lg font-bold">1. Resumo executivo</h2>
        <table className="w-full border-collapse text-sm">
          <tbody>
            {[
              ["Alunos", report.summary.totalStudents],
              ["Turmas", report.summary.totalClasses],
              ["Média institucional", report.summary.averageGrade.toFixed(1)],
              ["Frequência", `${report.summary.attendanceRate}%`],
              ["Taxa de aprovação", `${report.summary.passRate}%`],
              ["Saúde pedagógica", `${report.summary.healthScore} (${report.summary.healthLabel})`],
              ["Precisão disciplinas", `${report.summary.overallPrecision}/100`],
              ["XP total", report.summary.totalXp.toLocaleString("pt-BR")],
            ].map(([k, v]) => (
              <tr key={String(k)} className="border-b border-slate-200">
                <td className="py-2 pr-4 font-medium">{k}</td>
                <td className="py-2">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">2. Disciplinas</h2>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b bg-slate-100 text-left">
              <th className="p-2">Disciplina</th>
              <th className="p-2">Média</th>
              <th className="p-2">Notas</th>
              <th className="p-2">Alunos</th>
              <th className="p-2">Aprovação</th>
              <th className="p-2">Precisão</th>
            </tr>
          </thead>
          <tbody>
            {report.subjects.map((s) => (
              <tr key={s.subject} className="border-b border-slate-100">
                <td className="p-2 font-medium">{s.subject}</td>
                <td className="p-2">{s.average.toFixed(1)}</td>
                <td className="p-2">{s.gradeCount}</td>
                <td className="p-2">{s.studentsWithGrades}</td>
                <td className="p-2">{s.passRatePercent}%</td>
                <td className="p-2">
                  {s.precisionScore} ({s.precisionLabel})
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">3. Alunos</h2>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b bg-slate-100 text-left">
              <th className="p-2">Nome</th>
              <th className="p-2">Matrícula</th>
              <th className="p-2">Turma</th>
              <th className="p-2">Média</th>
              <th className="p-2">Freq.</th>
              <th className="p-2">Situação</th>
            </tr>
          </thead>
          <tbody>
            {report.students.map((s) => (
              <tr key={s.studentId} className="border-b border-slate-100">
                <td className="p-2 font-medium">{s.name}</td>
                <td className="p-2">{s.enrollmentCode}</td>
                <td className="p-2">{s.className}</td>
                <td className="p-2">{s.overallAverage?.toFixed(1) ?? " - "}</td>
                <td className="p-2">{s.attendanceRate != null ? `${s.attendanceRate}%` : " - "}</td>
                <td className="p-2">{s.approvalStatus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="break-before-page">
        <h2 className="mb-3 text-lg font-bold">4. Detalhe  -  aluno por disciplina</h2>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b bg-slate-100 text-left">
              <th className="p-2">Aluno</th>
              <th className="p-2">Turma</th>
              <th className="p-2">Disciplina</th>
              <th className="p-2">Média</th>
              <th className="p-2">Notas</th>
              <th className="p-2">Períodos</th>
              <th className="p-2">Situação</th>
            </tr>
          </thead>
          <tbody>
            {report.studentSubjectRows.map((r, i) => (
              <tr key={`${r.studentId}-${r.subject}-${i}`} className="border-b border-slate-100">
                <td className="p-2">{r.studentName}</td>
                <td className="p-2">{r.className}</td>
                <td className="p-2 font-medium">{r.subject}</td>
                <td className="p-2">{r.average.toFixed(1)}</td>
                <td className="p-2">{r.gradeCount}</td>
                <td className="p-2">{r.periods || " - "}</td>
                <td className="p-2">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer className="border-t pt-4 text-xs text-slate-500">
        Ecohub  -  Relatório gerado automaticamente. Disciplinas configuradas:{" "}
        {report.configuredSubjects.join(", ")}.
      </footer>
    </div>
  );
}
