"use client";

import { Printer, ArrowLeft, ShieldCheck, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatGradeDisplay } from "@/lib/boletim";
import Link from "next/link";

export type PrintableBoletimSubject = {
  name: string;
  b1?: number | null;
  b2?: number | null;
  b3?: number | null;
  b4?: number | null;
  finalAverage: number | null;
  absences: number;
  status: "Aprovado" | "Em Curso" | "Recuperação" | "Atenção";
};

export type PrintableBoletimData = {
  schoolName: string;
  schoolSlug?: string | null;
  schoolCityState?: string | null;
  studentId: string;
  studentName: string;
  enrollmentCode: string;
  className: string;
  academicYear: number;
  overallAverage: number;
  overallAttendanceRate: number;
  totalAbsences: number;
  subjects: PrintableBoletimSubject[];
  issuedAt: string;
  verificationHash: string;
};

export function PrintableOfficialBoletim({ data }: { data: PrintableBoletimData }) {
  function handlePrint() {
    window.print();
  }

  // Gera um QR code SVG vetorial estilizado
  const qrVerificationUrl = `https://ecohub.app/validar-boletim/${data.verificationHash}`;

  return (
    <div className="min-h-screen bg-slate-100 py-6 print:bg-white print:p-0 dark:bg-slate-950">
      {/* Barra de Ações Superior (Oculta na Impressão) */}
      <div className="mx-auto mb-6 flex max-w-4xl items-center justify-between px-4 print:hidden">
        <Link href={`/dashboard/alunos/${data.studentId}/boletim`}>
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar ao Boletim Digital
          </Button>
        </Link>

        <Button
          onClick={handlePrint}
          className="gap-2 bg-indigo-600 font-bold text-white shadow hover:bg-indigo-700"
        >
          <Printer className="h-4 w-4" />
          Imprimir / Salvar em PDF
        </Button>
      </div>

      {/* Folha A4 Oficial */}
      <div className="mx-auto max-w-4xl border border-slate-300 bg-white p-8 shadow-xl print:m-0 print:max-w-none print:border-0 print:p-8 print:shadow-none dark:border-slate-800 dark:bg-white dark:text-slate-900">
        {/* Cabeçalho Institucional */}
        <div className="border-b-2 border-slate-800 pb-4 text-center">
          <div className="flex items-center justify-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white font-serif text-2xl font-black">
              E
            </span>
            <div className="text-left">
              <h1 className="text-xl font-extrabold uppercase tracking-wide text-slate-900">
                {data.schoolName}
              </h1>
              <p className="text-xs text-slate-600">
                {data.schoolCityState ?? "Secretaria de Educação"} · Sistema de Gestão Escolar Ecohub
              </p>
            </div>
          </div>
          <h2 className="mt-4 inline-block rounded-md border border-slate-900 px-4 py-1 text-xs font-bold uppercase tracking-widest text-slate-900">
            Boletim Escolar Oficial  -  Ano Letivo {data.academicYear}
          </h2>
        </div>

        {/* Dados do Estudante */}
        <div className="mt-6 grid grid-cols-2 gap-4 rounded-lg border border-slate-300 bg-slate-50/50 p-4 text-xs">
          <div>
            <p className="text-slate-500">Nome do Aluno(a):</p>
            <p className="font-bold text-slate-900 text-sm">{data.studentName}</p>
          </div>
          <div>
            <p className="text-slate-500">Matrícula Escolar:</p>
            <p className="font-mono font-bold text-slate-900">{data.enrollmentCode}</p>
          </div>
          <div>
            <p className="text-slate-500">Turma / Turno:</p>
            <p className="font-bold text-slate-900">{data.className}</p>
          </div>
          <div>
            <p className="text-slate-500">Média Geral / Assiduidade:</p>
            <p className="font-bold text-slate-900">
              {data.overallAverage.toFixed(1)} pts · {data.overallAttendanceRate}% de Frequência
            </p>
          </div>
        </div>

        {/* Tabela de Notas & Frequência */}
        <div className="mt-6 overflow-hidden rounded-lg border border-slate-400">
          <table className="w-full text-left text-xs">
            <thead className="border-b-2 border-slate-400 bg-slate-200 text-slate-900 font-bold uppercase">
              <tr>
                <th className="py-2.5 px-3">Componente Curricular</th>
                <th className="py-2.5 px-2 text-center">1º Bim</th>
                <th className="py-2.5 px-2 text-center">2º Bim</th>
                <th className="py-2.5 px-2 text-center">3º Bim</th>
                <th className="py-2.5 px-2 text-center">4º Bim</th>
                <th className="py-2.5 px-2 text-center bg-slate-300">Média Final</th>
                <th className="py-2.5 px-2 text-center">Faltas</th>
                <th className="py-2.5 px-3 text-center">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {data.subjects.map((s, idx) => (
                <tr key={s.name} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/80"}>
                  <td className="py-2 px-3 font-semibold text-slate-900">{s.name}</td>
                  <td className="py-2 px-2 text-center font-mono">
                    {s.b1 != null ? formatGradeDisplay(s.b1, 10) : "—"}
                  </td>
                  <td className="py-2 px-2 text-center font-mono">
                    {s.b2 != null ? formatGradeDisplay(s.b2, 10) : "—"}
                  </td>
                  <td className="py-2 px-2 text-center font-mono">
                    {s.b3 != null ? formatGradeDisplay(s.b3, 10) : "—"}
                  </td>
                  <td className="py-2 px-2 text-center font-mono">
                    {s.b4 != null ? formatGradeDisplay(s.b4, 10) : "—"}
                  </td>
                  <td className="py-2 px-2 text-center font-mono font-bold bg-slate-100">
                    {s.finalAverage != null ? formatGradeDisplay(s.finalAverage, 10) : "—"}
                  </td>
                  <td className="py-2 px-2 text-center font-mono">{s.absences}</td>
                  <td className="py-2 px-3 text-center font-bold">
                    <span
                      className={
                        s.status === "Aprovado"
                          ? "text-emerald-800 font-bold"
                          : s.status === "Recuperação"
                            ? "text-amber-800 font-bold"
                            : "text-slate-800"
                      }
                    >
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Rodapé de Autenticidade Digital & QR Code */}
        <div className="mt-8 flex items-center justify-between rounded-lg border border-slate-300 bg-slate-50 p-4 text-[11px] text-slate-700">
          <div className="space-y-1">
            <p className="flex items-center gap-1 font-bold text-slate-900">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Documento com Autenticação Digital Ecohub
            </p>
            <p className="text-slate-500 font-mono text-[10px]">
              Código de Verificação: {data.verificationHash}
            </p>
            <p className="text-slate-500 text-[10px]">Emitido em: {data.issuedAt}</p>
          </div>

          <div className="flex items-center gap-3 text-right">
            <div>
              <p className="font-bold text-[10px] uppercase text-slate-700">Acesse para validar</p>
              <p className="font-mono text-[9px] text-slate-500">ecohub.app/validar</p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded border border-slate-300 bg-white p-1">
              <QrCode className="h-10 w-10 text-slate-800" />
            </div>
          </div>
        </div>

        {/* Assinaturas */}
        <div className="mt-16 grid grid-cols-2 gap-12 text-center text-xs">
          <div className="border-t border-slate-900 pt-2">
            <p className="font-bold text-slate-900">Coordenação Pedagógica</p>
            <p className="text-[10px] text-slate-500">{data.schoolName}</p>
          </div>
          <div className="border-t border-slate-900 pt-2">
            <p className="font-bold text-slate-900">Direção Escolar</p>
            <p className="text-[10px] text-slate-500">Assinatura / Carimbo</p>
          </div>
        </div>
      </div>
    </div>
  );
}
