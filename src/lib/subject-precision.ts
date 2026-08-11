import { prisma } from "@/lib/db";
import { getSchoolSettings } from "@/lib/school-settings";

export type ResourceKind = "grades" | "diary" | "schedule" | "exercises";

export type ResourcePrecision = {
  kind: ResourceKind;
  label: string;
  count: number;
  coveragePercent: number;
  precisionScore: number;
  precisionLabel: PrecisionLabel;
  lastActivityAt: string | null;
  detail: string;
};

export type PrecisionLabel = "Excelente" | "Alta" | "Moderada" | "Baixa" | "Insuficiente";

export type SubjectPrecisionEntry = {
  subject: string;
  configured: boolean;
  /** Precisão geral do monitoramento + ensino nesta disciplina (0–100) */
  precisionScore: number;
  precisionLabel: PrecisionLabel;
  /** Confiança nos dados — cobertura e volume de registros (0–100) */
  dataConfidence: number;
  /** Efetividade pedagógica — desempenho vs meta (0–100) */
  teachingEffectiveness: number;
  average: number;
  gradeCount: number;
  studentsWithGrades: number;
  studentsBelowPass: number;
  coveragePercent: number;
  passRatePercent: number;
  resources: ResourcePrecision[];
  recommendations: string[];
};

export type SubjectPrecisionOverview = {
  overallPrecision: number;
  overallLabel: PrecisionLabel;
  summary: string;
  totalStudents: number;
  configuredSubjects: string[];
  entries: SubjectPrecisionEntry[];
  insights: string[];
};

function precisionLabel(score: number): PrecisionLabel {
  if (score >= 85) return "Excelente";
  if (score >= 70) return "Alta";
  if (score >= 55) return "Moderada";
  if (score >= 35) return "Baixa";
  return "Insuficiente";
}

function round0(n: number) {
  return Math.round(n);
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function daysSince(date: Date | null) {
  if (!date) return null;
  return Math.floor((Date.now() - date.getTime()) / 86_400_000);
}

function recencyScore(days: number | null): number {
  if (days === null) return 0;
  if (days <= 14) return 100;
  if (days <= 30) return 85;
  if (days <= 60) return 65;
  if (days <= 90) return 45;
  if (days <= 180) return 25;
  return 10;
}

function resourcePrecisionScore(input: {
  count: number;
  coveragePercent: number;
  recencyDays: number | null;
  minCountForFull?: number;
}): number {
  const minCount = input.minCountForFull ?? 5;
  const volumeScore = Math.min(100, (input.count / minCount) * 100);
  const coverageScore = input.coveragePercent;
  const freshScore = recencyScore(input.recencyDays);
  return round0(volumeScore * 0.35 + coverageScore * 0.4 + freshScore * 0.25);
}

function normalizeSubjectKey(s: string) {
  return s.trim().toLowerCase();
}

function matchExerciseToSubject(title: string, description: string | null, subject: string): boolean {
  const hay = `${title} ${description ?? ""}`.toLowerCase();
  const needle = subject.toLowerCase();
  if (hay.includes(needle)) return true;
  const aliases: Record<string, string[]> = {
    matemática: ["mat", "algebra", "geometria", "calculo"],
    português: ["port", "redacao", "gramatica", "lingua"],
    ciências: ["ciencia", "biologia", "fisica", "quimica"],
    "educação física": ["edf", "esporte", "fisica"],
    inglês: ["english", "ing"],
  };
  const list = aliases[needle] ?? [];
  return list.some((a) => hay.includes(a));
}

function buildRecommendations(entry: Omit<SubjectPrecisionEntry, "recommendations">): string[] {
  const tips: string[] = [];
  const gradesRes = entry.resources.find((r) => r.kind === "grades");
  const diaryRes = entry.resources.find((r) => r.kind === "diary");
  const scheduleRes = entry.resources.find((r) => r.kind === "schedule");
  const exerciseRes = entry.resources.find((r) => r.kind === "exercises");

  if (entry.dataConfidence < 50) {
    tips.push("Amplie o lançamento de notas para mais alunos — a cobertura ainda é baixa para análises confiáveis.");
  }
  if (gradesRes && gradesRes.precisionScore < 55) {
    tips.push("Registre notas com regularidade (ideal: ao fim de cada bimestre ou unidade).");
  }
  if (diaryRes && diaryRes.count === 0) {
    tips.push("Use o diário de classe vinculado à disciplina para enriquecer o histórico pedagógico.");
  }
  if (scheduleRes && scheduleRes.count === 0) {
    tips.push("Cadastre horários da disciplina na grade — reforça o planejamento institucional.");
  }
  if (exerciseRes && exerciseRes.count === 0) {
    tips.push("Crie exercícios com a disciplina no título para rastrear engajamento por matéria.");
  }
  if (entry.teachingEffectiveness < 55 && entry.gradeCount >= 3) {
    tips.push("Desempenho abaixo da meta — considere reforço, trilhas ou missões focadas nesta matéria.");
  }
  if (entry.teachingEffectiveness >= 80 && entry.dataConfidence >= 70) {
    tips.push("Disciplina com monitoramento sólido e bons resultados — documente as práticas de sucesso.");
  }
  if (tips.length === 0) {
    tips.push("Mantenha o ritmo de registros para preservar a precisão dos indicadores.");
  }
  return tips.slice(0, 4);
}

export async function getSubjectPrecisionOverview(
  schoolId: string | null
): Promise<SubjectPrecisionOverview> {
  if (!schoolId) return emptyOverview();

  const settings = await getSchoolSettings(schoolId);
  const passGrade = settings.academic.passGrade;
  const configuredSubjects = settings.academic.subjects;

  const [totalStudents, grades, diaryEntries, scheduleSlots, exercises] = await Promise.all([
    prisma.student.count({ where: { user: { schoolId } } }),
    prisma.grade.findMany({
      where: { student: { user: { schoolId } } },
      select: {
        subject: true,
        value: true,
        studentId: true,
        createdAt: true,
      },
    }),
    prisma.classDiaryEntry.findMany({
      where: { classGroup: { schoolId } },
      select: { subject: true, date: true, createdAt: true },
    }),
    prisma.classScheduleSlot.findMany({
      where: { schoolId },
      select: { subject: true },
    }),
    prisma.exercise.findMany({
      where: { schoolId, isActive: true },
      select: { title: true, description: true, createdAt: true },
    }),
  ]);

  const studentDenominator = Math.max(totalStudents, 1);

  type GradeBucket = {
    values: number[];
    byStudent: Map<string, number[]>;
    lastAt: Date | null;
  };

  const gradeBySubject = new Map<string, GradeBucket>();
  for (const g of grades) {
    const key = g.subject.trim();
    const bucket =
      gradeBySubject.get(key) ??
      ({ values: [] as number[], byStudent: new Map<string, number[]>(), lastAt: null } satisfies GradeBucket);
    bucket.values.push(g.value);
    const list = bucket.byStudent.get(g.studentId) ?? [];
    list.push(g.value);
    bucket.byStudent.set(g.studentId, list);
    if (!bucket.lastAt || g.createdAt > bucket.lastAt) bucket.lastAt = g.createdAt;
    gradeBySubject.set(key, bucket);
  }

  const diaryBySubject = new Map<string, { count: number; lastAt: Date | null }>();
  for (const d of diaryEntries) {
    const subj = d.subject?.trim();
    if (!subj) continue;
    const cur = diaryBySubject.get(subj) ?? { count: 0, lastAt: null };
    cur.count++;
    const ref = d.date > d.createdAt ? d.date : d.createdAt;
    if (!cur.lastAt || ref > cur.lastAt) cur.lastAt = ref;
    diaryBySubject.set(subj, cur);
  }

  const scheduleBySubject = new Map<string, { count: number }>();
  for (const s of scheduleSlots) {
    const subj = s.subject.trim();
    const cur = scheduleBySubject.get(subj) ?? { count: 0 };
    cur.count++;
    scheduleBySubject.set(subj, cur);
  }

  const allSubjectNames = new Set<string>([
    ...configuredSubjects,
    ...gradeBySubject.keys(),
    ...diaryBySubject.keys(),
    ...scheduleBySubject.keys(),
  ]);

  const entries: SubjectPrecisionEntry[] = [];

  for (const subject of allSubjectNames) {
    const configured = configuredSubjects.some(
      (s) => normalizeSubjectKey(s) === normalizeSubjectKey(subject)
    );

    const gradeBucket = gradeBySubject.get(subject) ?? {
      values: [],
      byStudent: new Map<string, number[]>(),
      lastAt: null,
    };

    const gradeCount = gradeBucket.values.length;
    const studentsWithGrades = gradeBucket.byStudent.size;
    const average =
      gradeCount > 0 ? round1(gradeBucket.values.reduce((a, v) => a + v, 0) / gradeCount) : 0;

    let studentsBelowPass = 0;
    let passing = 0;
    for (const vals of gradeBucket.byStudent.values()) {
      const avg = vals.reduce((a, v) => a + v, 0) / vals.length;
      if (avg >= passGrade) passing++;
      else studentsBelowPass++;
    }
    const passRatePercent =
      gradeBucket.byStudent.size > 0 ? round0((passing / gradeBucket.byStudent.size) * 100) : 0;

    const coveragePercent = round0((studentsWithGrades / studentDenominator) * 100);

    const diary = diaryBySubject.get(subject) ?? { count: 0, lastAt: null };
    const schedule = scheduleBySubject.get(subject) ?? { count: 0 };
    const exerciseMatches = exercises.filter((e) =>
      matchExerciseToSubject(e.title, e.description, subject)
    );
    const exerciseLast =
      exerciseMatches.length > 0
        ? exerciseMatches.reduce(
            (max, e) => (e.createdAt > max ? e.createdAt : max),
            exerciseMatches[0].createdAt
          )
        : null;

    const resources: ResourcePrecision[] = [
      {
        kind: "grades",
        label: "Notas e avaliações",
        count: gradeCount,
        coveragePercent,
        precisionScore: resourcePrecisionScore({
          count: gradeCount,
          coveragePercent,
          recencyDays: daysSince(gradeBucket.lastAt),
          minCountForFull: Math.max(5, Math.ceil(studentDenominator * 0.3)),
        }),
        precisionLabel: precisionLabel(
          resourcePrecisionScore({
            count: gradeCount,
            coveragePercent,
            recencyDays: daysSince(gradeBucket.lastAt),
          })
        ),
        lastActivityAt: gradeBucket.lastAt?.toISOString() ?? null,
        detail: `${gradeCount} nota(s) · ${studentsWithGrades} aluno(s)`,
      },
      {
        kind: "diary",
        label: "Diário de classe",
        count: diary.count,
        coveragePercent: diary.count > 0 ? Math.min(100, diary.count * 10) : 0,
        precisionScore: resourcePrecisionScore({
          count: diary.count,
          coveragePercent: diary.count > 0 ? 70 : 0,
          recencyDays: daysSince(diary.lastAt),
          minCountForFull: 8,
        }),
        precisionLabel: precisionLabel(
          resourcePrecisionScore({
            count: diary.count,
            coveragePercent: diary.count > 0 ? 70 : 0,
            recencyDays: daysSince(diary.lastAt),
          })
        ),
        lastActivityAt: diary.lastAt?.toISOString() ?? null,
        detail: diary.count > 0 ? `${diary.count} registro(s) no diário` : "Nenhum registro",
      },
      {
        kind: "schedule",
        label: "Grade de horários",
        count: schedule.count,
        coveragePercent: schedule.count > 0 ? Math.min(100, schedule.count * 15) : 0,
        precisionScore: resourcePrecisionScore({
          count: schedule.count,
          coveragePercent: schedule.count > 0 ? 80 : 0,
          recencyDays: schedule.count > 0 ? 0 : null,
          minCountForFull: 4,
        }),
        precisionLabel: precisionLabel(
          resourcePrecisionScore({
            count: schedule.count,
            coveragePercent: schedule.count > 0 ? 80 : 0,
            recencyDays: schedule.count > 0 ? 0 : null,
          })
        ),
        lastActivityAt: null,
        detail: schedule.count > 0 ? `${schedule.count} slot(s) na grade` : "Não cadastrada",
      },
      {
        kind: "exercises",
        label: "Exercícios e atividades",
        count: exerciseMatches.length,
        coveragePercent:
          exerciseMatches.length > 0
            ? Math.min(100, round0((exerciseMatches.length / Math.max(exercises.length, 1)) * 100))
            : 0,
        precisionScore: resourcePrecisionScore({
          count: exerciseMatches.length,
          coveragePercent: exerciseMatches.length > 0 ? 75 : 0,
          recencyDays: daysSince(exerciseLast),
          minCountForFull: 3,
        }),
        precisionLabel: precisionLabel(
          resourcePrecisionScore({
            count: exerciseMatches.length,
            coveragePercent: exerciseMatches.length > 0 ? 75 : 0,
            recencyDays: daysSince(exerciseLast),
          })
        ),
        lastActivityAt: exerciseLast?.toISOString() ?? null,
        detail:
          exerciseMatches.length > 0
            ? `${exerciseMatches.length} exercício(s) vinculado(s)`
            : "Nenhum exercício identificado",
      },
    ];

    const dataConfidence = round0(
      resources.reduce((sum, r) => sum + r.precisionScore, 0) / resources.length
    );

    const gradeScore = passGrade > 0 ? Math.min(100, (average / passGrade) * 100) : 0;
    const teachingEffectiveness =
      gradeCount > 0
        ? round0(gradeScore * 0.5 + passRatePercent * 0.35 + coveragePercent * 0.15)
        : 0;

    const precisionScore =
      gradeCount > 0
        ? round0(dataConfidence * 0.5 + teachingEffectiveness * 0.5)
        : round0(dataConfidence * 0.85);

    const partial: Omit<SubjectPrecisionEntry, "recommendations"> = {
      subject,
      configured,
      precisionScore,
      precisionLabel: precisionLabel(precisionScore),
      dataConfidence,
      teachingEffectiveness,
      average,
      gradeCount,
      studentsWithGrades,
      studentsBelowPass,
      coveragePercent,
      passRatePercent,
      resources,
    };

    entries.push({
      ...partial,
      recommendations: buildRecommendations(partial),
    });
  }

  entries.sort((a, b) => {
    if (a.configured !== b.configured) return a.configured ? -1 : 1;
    return b.precisionScore - a.precisionScore;
  });

  const overallPrecision =
    entries.length > 0
      ? round0(entries.reduce((s, e) => s + e.precisionScore, 0) / entries.length)
      : 0;

  const weak = entries.filter((e) => e.precisionScore < 55);
  const strong = entries.filter((e) => e.precisionScore >= 75);

  const insights: string[] = [
    `Precisão institucional média: ${overallPrecision}/100 (${precisionLabel(overallPrecision)}).`,
  ];
  if (strong.length > 0) {
    insights.push(
      `Disciplinas com alta precisão: ${strong.slice(0, 4).map((e) => e.subject).join(", ")}.`
    );
  }
  if (weak.length > 0) {
    insights.push(
      `${weak.length} disciplina(s) com precisão baixa — reforce registros de notas, diário e horários.`
    );
  }
  const unconfiguredWithData = entries.filter((e) => !e.configured && e.gradeCount > 0);
  if (unconfiguredWithData.length > 0) {
    insights.push(
      `Há notas em disciplinas fora da lista configurada (${unconfiguredWithData.map((e) => e.subject).join(", ")}). Revise em Configurações.`
    );
  }

  return {
    overallPrecision,
    overallLabel: precisionLabel(overallPrecision),
    summary: buildOverallSummary(overallPrecision, entries.length, totalStudents),
    totalStudents,
    configuredSubjects,
    entries,
    insights: insights.slice(0, 5),
  };
}

function buildOverallSummary(precision: number, subjectCount: number, students: number) {
  if (subjectCount === 0) {
    return "Configure disciplinas e lance dados para gerar indicadores de precisão por matéria.";
  }
  if (precision >= 75) {
    return `Monitoramento pedagógico sólido em ${subjectCount} disciplina(s) — indicadores confiáveis para ${students} aluno(s).`;
  }
  if (precision >= 55) {
    return "Precisão moderada — expanda registros por disciplina para decisões mais assertivas.";
  }
  return "Precisão insuficiente — priorize lançamento de notas, diário e grade horária por matéria.";
}

function emptyOverview(): SubjectPrecisionOverview {
  return {
    overallPrecision: 0,
    overallLabel: "Insuficiente",
    summary: "Escola não configurada.",
    totalStudents: 0,
    configuredSubjects: [],
    entries: [],
    insights: ["Cadastre a instituição e as disciplinas para iniciar os indicadores de precisão."],
  };
}

export function getPrecisionColor(label: PrecisionLabel) {
  switch (label) {
    case "Excelente":
      return "text-emerald-700 bg-emerald-50 border-emerald-200";
    case "Alta":
      return "text-indigo-700 bg-indigo-50 border-indigo-200";
    case "Moderada":
      return "text-amber-700 bg-amber-50 border-amber-200";
    case "Baixa":
      return "text-orange-700 bg-orange-50 border-orange-200";
    default:
      return "text-red-700 bg-red-50 border-red-200";
  }
}
