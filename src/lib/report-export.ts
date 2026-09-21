import type { InstitutionalReport } from "@/lib/institutional-report";

const UTF8_BOM = "\uFEFF";

function escapeCsv(value: string | number | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (/[",;\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function rowsToCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [
    headers.map(escapeCsv).join(";"),
    ...rows.map((row) => row.map(escapeCsv).join(";")),
  ];
  return UTF8_BOM + lines.join("\r\n");
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR");
}

export type ReportExportKind =
  | "summary"
  | "subjects"
  | "students"
  | "student-subjects"
  | "classes"
  | "censo-escolar"
  | "full";

export function buildReportCsv(report: InstitutionalReport, kind: ReportExportKind): {
  filename: string;
  content: string;
  mime: string;
} {
  const dateStamp = report.generatedAt.slice(0, 10);
  const slug = report.schoolName.replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").slice(0, 40);

  switch (kind) {
    case "summary":
      return {
        filename: `ecohub-resumo-${slug}-${dateStamp}.csv`,
        mime: "text/csv;charset=utf-8",
        content: rowsToCsv(["Campo", "Valor"], [
          ["Instituição", report.schoolName],
          ["Gerado em", formatDate(report.generatedAt)],
          ["Conta desde", report.accountSince ? formatDate(report.accountSince) : " - "],
          ["Meta de aprovação", report.passGrade],
          ["Nota máxima", report.maxGrade],
          ["Alunos", report.summary.totalStudents],
          ["Turmas", report.summary.totalClasses],
          ["Professores", report.summary.totalTeachers],
          ["Média institucional", report.summary.averageGrade],
          ["Frequência %", report.summary.attendanceRate],
          ["Taxa aprovação %", report.summary.passRate],
          ["Saúde pedagógica", report.summary.healthScore],
          ["Classificação saúde", report.summary.healthLabel],
          ["XP total", report.summary.totalXp],
          ["Entregas exercícios", report.summary.exerciseSubmissions],
          ["Precisão média disciplinas", report.summary.overallPrecision],
          ["Disciplinas configuradas", report.configuredSubjects.join(", ")],
        ]),
      };

    case "subjects":
      return {
        filename: `ecohub-disciplinas-${slug}-${dateStamp}.csv`,
        mime: "text/csv;charset=utf-8",
        content: rowsToCsv(
          [
            "Disciplina",
            "Configurada",
            "Média",
            "Notas",
            "Alunos c/ notas",
            "Aprovação %",
            "Precisão",
            "Classificação precisão",
          ],
          report.subjects.map((s) => [
            s.subject,
            s.configured ? "Sim" : "Não",
            s.average,
            s.gradeCount,
            s.studentsWithGrades,
            s.passRatePercent,
            s.precisionScore,
            s.precisionLabel,
          ])
        ),
      };

    case "students":
      return {
        filename: `ecohub-alunos-${slug}-${dateStamp}.csv`,
        mime: "text/csv;charset=utf-8",
        content: rowsToCsv(
          [
            "Nome",
            "Matrícula",
            "E-mail",
            "Turma",
            "Média geral",
            "Frequência %",
            "XP",
            "Nível",
            "Situação",
            "Qtd disciplinas",
          ],
          report.students.map((s) => [
            s.name,
            s.enrollmentCode,
            s.email,
            s.className,
            s.overallAverage ?? "",
            s.attendanceRate ?? "",
            s.xpTotal,
            s.level,
            s.approvalStatus,
            s.subjectCount,
          ])
        ),
      };

    case "student-subjects":
      return {
        filename: `ecohub-aluno-disciplinas-${slug}-${dateStamp}.csv`,
        mime: "text/csv;charset=utf-8",
        content: rowsToCsv(
          [
            "Aluno",
            "Matrícula",
            "Turma",
            "Disciplina",
            "Média",
            "Qtd notas",
            "Períodos",
            "Situação",
          ],
          report.studentSubjectRows.map((r) => [
            r.studentName,
            r.enrollmentCode,
            r.className,
            r.subject,
            r.average,
            r.gradeCount,
            r.periods,
            r.status,
          ])
        ),
      };

    case "classes":
      return {
        filename: `ecohub-turmas-${slug}-${dateStamp}.csv`,
        mime: "text/csv;charset=utf-8",
        content: rowsToCsv(
          ["Turma", "Alunos", "Média", "Aprovação %", "Frequência %"],
          report.classes.map((c) => [
            c.className,
            c.studentCount,
            c.averageGrade,
            c.passRate,
            c.attendanceRate,
          ])
        ),
      };

    case "censo-escolar":
      return {
        filename: `censo-escolar-ministerial-${slug}-${dateStamp}.csv`,
        mime: "text/csv;charset=utf-8",
        content: rowsToCsv(
          [
            "COD_INSTITUICAO",
            "NOME_INSTITUICAO",
            "COD_ALUNO_MATRICULA",
            "NOME_COMPLETO_ALUNO",
            "TURMA_SÉRIE",
            "E_MAIL_ALUNO",
            "FREQUENCIA_GLOBAL_PERCENTUAL",
            "MEDIA_GERAL_DESEMPENHO",
            "PONTUACAO_XP_TOTAL",
            "SITUACAO_MATRICULA_DISCIPLINA",
            "DISCIPLINAS_CURSADAS_DETALHE",
          ],
          report.students.map((s) => [
            report.schoolName,
            report.schoolName,
            s.enrollmentCode,
            s.name,
            s.className,
            s.email || "NÃO INFORMADO",
            s.attendanceRate !== null ? `${s.attendanceRate}%` : "100%",
            s.overallAverage !== null ? s.overallAverage.toFixed(1) : "-",
            s.xpTotal,
            s.approvalStatus,
            s.subjects.map((sub) => `${sub.subject}: ${sub.average} (${sub.status})`).join(" | "),
          ])
        ),
      };

    case "full": {
      const sections = [
        "=== RESUMO INSTITUCIONAL ===",
        buildReportCsv(report, "summary").content.replace(UTF8_BOM, ""),
        "",
        "=== MAPA PADRÃO CENSO ESCOLAR ===",
        buildReportCsv(report, "censo-escolar").content.replace(UTF8_BOM, ""),
        "",
        "=== DISCIPLINAS ===",
        buildReportCsv(report, "subjects").content.replace(UTF8_BOM, ""),
        "",
        "=== ALUNOS ===",
        buildReportCsv(report, "students").content.replace(UTF8_BOM, ""),
        "",
        "=== ALUNO POR DISCIPLINA ===",
        buildReportCsv(report, "student-subjects").content.replace(UTF8_BOM, ""),
        "",
        "=== TURMAS ===",
        buildReportCsv(report, "classes").content.replace(UTF8_BOM, ""),
      ];
      return {
        filename: `ecohub-relatorio-completo-${slug}-${dateStamp}.csv`,
        mime: "text/csv;charset=utf-8",
        content: UTF8_BOM + sections.join("\r\n"),
      };
    }
  }
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function triggerPrintReport() {
  window.print();
}
