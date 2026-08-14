"use client";

import { useMemo, useState } from "react";
import { Trophy, GraduationCap, Users, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type {
  RankingsOverview,
  StudentRankingMetric,
  ClassRankingMetric,
} from "@/lib/rankings";
import {
  getClassMetricLabel,
  getClassRankingsByMetric,
  getStudentMetricLabel,
} from "@/lib/rankings";
import { RankingPodium } from "@/components/rankings/ranking-podium";
import { StudentRankingList, YourPositionCard } from "@/components/rankings/student-ranking-list";
import { ClassRankingList } from "@/components/rankings/class-ranking-list";

type ViewMode = "classes" | "students";
type Audience = "student" | "staff";

const STUDENT_METRICS: StudentRankingMetric[] = ["xpWeek", "xp", "grade", "missions"];
const CLASS_METRICS: ClassRankingMetric[] = ["engagement", "participation", "xpWeek", "grade"];

export function RankingsDashboard({
  data,
  audience,
  currentStudentId,
  defaultClassId,
}: {
  data: RankingsOverview;
  audience: Audience;
  currentStudentId?: string;
  defaultClassId?: string | null;
}) {
  const [view, setView] = useState<ViewMode>(audience === "student" ? "students" : "classes");
  const [studentMetric, setStudentMetric] = useState<StudentRankingMetric>("xpWeek");
  const [classMetric, setClassMetric] = useState<ClassRankingMetric>("engagement");
  const [scope, setScope] = useState<"class" | "school">(audience === "student" ? "class" : "school");
  const [selectedClassId, setSelectedClassId] = useState(
    defaultClassId ?? data.classes[0]?.id ?? ""
  );

  const kidFriendly = audience === "student";

  const classRankings = useMemo(
    () => getClassRankingsByMetric(data.classRankings, classMetric),
    [data.classRankings, classMetric]
  );

  const studentList = useMemo(() => {
    if (scope === "school") return data.schoolStudentRankings[studentMetric] ?? [];
    if (!selectedClassId) return [];
    return data.classStudentRankings[selectedClassId]?.[studentMetric] ?? [];
  }, [data, studentMetric, scope, selectedClassId]);

  const myPosition = useMemo(() => {
    if (!currentStudentId || !data.currentStudent?.positions[studentMetric]) return null;
    const pos = data.currentStudent.positions[studentMetric]!;
    return scope === "class" ? pos.class : pos.school;
  }, [currentStudentId, data.currentStudent, studentMetric, scope]);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-indigo-50 p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
          <div>
            <p className="font-semibold text-emerald-900">Competição saudável</p>
            <p className="mt-1 text-sm leading-relaxed text-emerald-950/80">{data.healthyCompetitionNote}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <TabButton
          active={view === "classes"}
          onClick={() => setView("classes")}
          icon={GraduationCap}
          label="Ranking de turmas"
        />
        <TabButton
          active={view === "students"}
          onClick={() => setView("students")}
          icon={Users}
          label="Ranking de alunos"
        />
      </div>

      {view === "classes" ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-indigo-600" aria-hidden="true" />
              Competitividade entre turmas
            </CardTitle>
            <CardDescription>
              Compare salas por engajamento, participação e desempenho  -  métricas normalizadas por aluno
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <MetricTabs
              options={CLASS_METRICS.map((m) => ({ key: m, label: getClassMetricLabel(m) }))}
              value={classMetric}
              onChange={(v) => setClassMetric(v as ClassRankingMetric)}
            />
            <ClassRankingList
              items={classRankings}
              metric={classMetric}
              highlightClassId={defaultClassId}
              linkClasses={audience === "staff"}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card className={kidFriendly ? "kid-card border-indigo-200" : undefined}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" aria-hidden="true" />
                Ranking individual
              </CardTitle>
              <CardDescription>
                {kidFriendly
                  ? "Veja quem está se destacando na turma  -  foque no seu progresso!"
                  : "Desempenho individual por XP, notas e missões concluídas"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                {audience === "staff" && (
                  <ScopeTabs scope={scope} onChange={setScope} />
                )}
                {scope === "class" && data.classes.length > 1 && audience === "staff" && (
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    aria-label="Selecionar turma"
                  >
                    {data.classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.studentCount})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <MetricTabs
                options={STUDENT_METRICS.map((m) => ({ key: m, label: getStudentMetricLabel(m) }))}
                value={studentMetric}
                onChange={(v) => setStudentMetric(v as StudentRankingMetric)}
                kidFriendly={kidFriendly}
              />

              {myPosition && (
                <YourPositionCard
                  rank={myPosition.rank}
                  total={myPosition.total}
                  metric={studentMetric}
                  scope={scope}
                  scoreLabel={myPosition.entry.scoreLabel}
                  kidFriendly={kidFriendly}
                />
              )}

              <RankingPodium items={studentList} kidFriendly={kidFriendly} />

              <StudentRankingList
                items={studentList}
                metric={studentMetric}
                highlightId={currentStudentId}
                kidFriendly={kidFriendly}
                linkStudents={audience === "staff"}
                maxItems={kidFriendly ? 10 : 20}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Trophy;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition",
        active
          ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
          : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200"
      )}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </button>
  );
}

function MetricTabs<T extends string>({
  options,
  value,
  onChange,
  kidFriendly = false,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  kidFriendly?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onChange(opt.key)}
          className={cn(
            "rounded-full px-3 py-1.5 text-sm font-medium transition",
            value === opt.key
              ? kidFriendly
                ? "bg-indigo-600 text-white"
                : "bg-indigo-100 text-indigo-800"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function ScopeTabs({
  scope,
  onChange,
}: {
  scope: "class" | "school";
  onChange: (s: "class" | "school") => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
      <button
        type="button"
        onClick={() => onChange("class")}
        className={cn(
          "rounded-md px-3 py-1.5 text-sm font-medium",
          scope === "class" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600"
        )}
      >
        Por turma
      </button>
      <button
        type="button"
        onClick={() => onChange("school")}
        className={cn(
          "rounded-md px-3 py-1.5 text-sm font-medium",
          scope === "school" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600"
        )}
      >
        Escola inteira
      </button>
    </div>
  );
}
