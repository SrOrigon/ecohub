"use client";

import Link from "next/link";
import {
  BookOpen,
  Calendar,
  ClipboardList,
  PenLine,
  Target,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  SubjectPrecisionOverview,
  SubjectPrecisionEntry,
  ResourcePrecision,
  ResourceKind,
} from "@/lib/subject-precision";
import { getPrecisionColor } from "@/lib/subject-precision";

const RESOURCE_ICONS: Record<ResourceKind, typeof BookOpen> = {
  grades: ClipboardList,
  diary: BookOpen,
  schedule: Calendar,
  exercises: PenLine,
};

export function SubjectPrecisionPanel({
  data,
  passGrade,
}: {
  data: SubjectPrecisionOverview;
  passGrade: number;
}) {
  return (
    <div className="space-y-6">
      <Card className="border-teal-100 bg-gradient-to-br from-teal-50/80 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-teal-600" aria-hidden="true" />
            Precisão pedagógica por disciplina
          </CardTitle>
          <CardDescription>
            Indicador de confiabilidade dos dados e efetividade do ensino  -  por matéria e por recurso
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Precisão institucional
              </p>
              <p className="text-4xl font-bold text-teal-700">{data.overallPrecision}</p>
              <Badge className={cn("mt-1", getPrecisionColor(data.overallLabel))}>
                {data.overallLabel}
              </Badge>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-relaxed text-slate-700">{data.summary}</p>
              <ul className="mt-2 space-y-1 text-sm text-teal-950">
                {data.insights.map((line, i) => (
                  <li key={i}>• {line}</li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {data.entries.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-slate-500">
            Configure disciplinas em Configurações e lance notas para ver indicadores de precisão.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.entries.map((entry) => (
            <SubjectPrecisionCard key={entry.subject} entry={entry} passGrade={passGrade} />
          ))}
        </div>
      )}
    </div>
  );
}

function SubjectPrecisionCard({
  entry,
  passGrade,
}: {
  entry: SubjectPrecisionEntry;
  passGrade: number;
}) {
  return (
    <Card className={cn("overflow-hidden", entry.configured ? "border-slate-200" : "border-dashed border-amber-200")}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-lg">{entry.subject}</CardTitle>
            <CardDescription>
              {entry.gradeCount > 0 ? (
                <>
                  Média {entry.average.toFixed(1)} · {entry.passRatePercent}% aprovação ·{" "}
                  {entry.coveragePercent}% cobertura
                </>
              ) : (
                "Sem notas lançadas"
              )}
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-teal-700">{entry.precisionScore}</p>
            <Badge className={getPrecisionColor(entry.precisionLabel)}>{entry.precisionLabel}</Badge>
          </div>
        </div>
        {!entry.configured && (
          <Badge variant="warning" className="w-fit">
            Fora da lista configurada
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="stat-grid gap-2 text-sm">
          <MiniStat label="Confiança dos dados" value={`${entry.dataConfidence}%`} />
          <MiniStat label="Efetividade ensino" value={`${entry.teachingEffectiveness}%`} />
          <MiniStat label="Alunos c/ notas" value={String(entry.studentsWithGrades)} />
          <MiniStat label={`Abaixo de ${passGrade}`} value={String(entry.studentsBelowPass)} />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Precisão por recurso de ensino
          </p>
          {entry.resources.map((resource) => (
            <ResourceRow key={resource.kind} resource={resource} />
          ))}
        </div>

        {entry.recommendations.length > 0 && (
          <div className="rounded-lg border border-amber-100 bg-amber-50/60 p-3">
            <p className="mb-1 text-xs font-semibold text-amber-900">Recomendações</p>
            <ul className="space-y-0.5 text-xs text-amber-950">
              {entry.recommendations.map((r, i) => (
                <li key={i}>• {r}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ResourceRow({ resource }: { resource: ResourcePrecision }) {
  const Icon = RESOURCE_ICONS[resource.kind];
  const barColor =
    resource.precisionScore >= 75
      ? "bg-emerald-500"
      : resource.precisionScore >= 55
        ? "bg-amber-500"
        : "bg-red-400";

  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-medium text-slate-800">
          <Icon className="h-4 w-4 text-teal-600 shrink-0" aria-hidden="true" />
          {resource.label}
        </span>
        <span className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-bold text-slate-900">{resource.precisionScore}</span>
          <Badge variant="secondary" className="text-xs">
            {resource.precisionLabel}
          </Badge>
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${resource.precisionScore}%` }} />
      </div>
      <p className="mt-1 text-xs text-slate-500">{resource.detail}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white px-2 py-1.5 ring-1 ring-slate-100">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export function SubjectPrecisionSummaryStrip({
  data,
  passGrade,
}: {
  data: SubjectPrecisionOverview;
  passGrade: number;
}) {
  const top = data.entries.filter((e) => e.gradeCount > 0).slice(0, 6);
  if (top.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base">Precisão por disciplina</CardTitle>
          <CardDescription>Resumo dos indicadores de monitoramento e ensino</CardDescription>
        </div>
        <Link
          href="/dashboard/precisao-disciplinas"
          className="inline-flex min-h-11 shrink-0 items-center gap-1 text-sm font-medium text-teal-600 hover:underline"
        >
          Ver completo
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {top.map((e) => (
            <div
              key={e.subject}
              className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-900">{e.subject}</p>
                <p className="text-xs text-slate-500">
                  {e.average > 0 ? `Média ${e.average.toFixed(1)}` : "Sem notas"} · meta {passGrade}
                </p>
              </div>
              <Badge className={cn("shrink-0 ml-2", getPrecisionColor(e.precisionLabel))}>
                {e.precisionScore}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
