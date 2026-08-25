import { getSessionUser } from "@/lib/auth";
import { getExerciseById, EXERCISE_KIND_LABELS } from "@/lib/exercises";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExerciseSubmitForm } from "@/components/forms/exercise-submit-form";
import { GradeSubmissionForm } from "@/components/forms/grade-submission-form";
import { EditExerciseForm } from "@/components/forms/edit-exercise-form";
import {
  ExerciseRewardPills,
  ExerciseStatusBadge,
  getStudentExerciseStatus,
} from "@/components/exercises/exercise-status-badge";
import { formatDate } from "@/lib/utils";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { ExerciseClassProgress } from "@/components/exercises/exercise-class-progress";
import { ExerciseQuestionStats } from "@/components/exercises/exercise-question-stats";
import { getSchoolSettings } from "@/lib/school-settings";
import { AlertCircle, CheckCircle2, PartyPopper, FileText } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DeleteConfirmButton } from "@/components/ui/delete-confirm-button";
import { deleteExerciseAction } from "@/actions/exercises";
import { SaoCelebrationLayer } from "@/components/celebration/sao-celebration-layer";
import { saoCelebrationKey } from "@/lib/sao-celebration-storage";

export default async function ExerciseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const [exercise, settings] = await Promise.all([
    getExerciseById(id, user),
    getSchoolSettings(user.schoolId),
  ]);
  if (!exercise) notFound();

  const classStudentCount = exercise.classId
    ? await prisma.student.count({ where: { classId: exercise.classId } })
    : 0;

  let studentRecord: { id: string } | null = null;

  const isStaff =
    user.role === "admin" || user.role === "director" || user.role === "teacher";
  const canEdit = isStaff && (user.role !== "teacher" || exercise.teacherId === user.id);

  let studentSubmission = null;
  if (user.role === "student") {
    studentRecord = await prisma.student.findUnique({ where: { userId: user.id } });
    studentSubmission = exercise.submissions.find((s) => s.studentId === studentRecord?.id) ?? null;
  }

  const answerMap = studentSubmission
    ? Object.fromEntries(studentSubmission.answers.map((a) => [a.questionId, a]))
    : undefined;

  const pastDue = exercise.dueDate ? new Date() > exercise.dueDate : false;
  const studentStatus =
    user.role === "student"
      ? getStudentExerciseStatus(studentSubmission ?? undefined, exercise.dueDate, !!studentSubmission)
      : null;

  const pendingSubs = exercise.submissions.filter((s) => s.status === "submitted");
  const gradedSubs = exercise.submissions.filter((s) => s.status === "graded");

  return (
    <div className="space-y-6">
      {user.role === "student" && (
        <SaoCelebrationLayer celebrationKey={saoCelebrationKey("exercise", exercise.id)} />
      )}
      <PageHeader
        backHref="/dashboard/exercicios"
        backLabel="Voltar aos exercícios"
        title={exercise.title}
        description={
          `${EXERCISE_KIND_LABELS[exercise.kind as keyof typeof EXERCISE_KIND_LABELS] ?? exercise.kind}` +
          (exercise.classGroup ? ` · ${exercise.classGroup.name}` : "")
        }
      >
        <ExerciseRewardPills
          xp={exercise.xpReward}
          coins={exercise.coinReward}
          points={exercise.maxPoints}
        />
      </PageHeader>

      {exercise.kind === "exam" && (
        <div className="rounded-2xl border-2 border-purple-200 bg-purple-50/80 p-4 text-purple-950 dark:border-purple-900/40 dark:bg-purple-950/40 dark:text-purple-100 flex items-center gap-3">
          <FileText className="h-6 w-6 text-purple-600 dark:text-purple-400 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-bold text-base">📝 Prova / Avaliação Oficial</p>
            <p className="text-sm opacity-90">
              Esta atividade vale <strong>{exercise.maxPoints} pontos</strong> e compõe a nota oficial do período letivo.
            </p>
          </div>
        </div>
      )}

      {user.role === "student" && studentStatus && (
        <div
          className={`rounded-2xl border-2 px-5 py-4 ${
            studentStatus === "graded"
              ? "border-emerald-200 bg-emerald-50"
              : studentStatus === "pending"
                ? "border-indigo-200 bg-indigo-50"
                : studentStatus === "overdue"
                  ? "border-red-200 bg-red-50"
                  : "border-slate-200 bg-slate-50"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ExerciseStatusBadge
              status={studentStatus}
              score={studentSubmission?.score}
              maxScore={studentSubmission?.maxScore}
              className="text-base px-3 py-1"
            />
            {exercise.dueDate && (
              <p className="text-sm text-slate-600">
                Prazo: <strong>{formatDate(exercise.dueDate)}</strong>
              </p>
            )}
          </div>
          {studentStatus === "pending" && (
            <p className="mt-2 text-base text-indigo-900">
              Responda questão por questão  -  ao enviar, seu professor será avisado.
            </p>
          )}
          {studentStatus === "graded" && studentSubmission?.feedback && (
            <p className="mt-3 rounded-lg bg-white/80 p-3 text-base text-slate-800">
              <strong>Mensagem do professor:</strong> {studentSubmission.feedback}
            </p>
          )}
          {studentStatus === "graded" && settings.exercises.postGradeToBulletin && studentRecord && (
            <Link href={`/dashboard/alunos/${studentRecord.id}/boletim`} className="mt-3 inline-block">
              <Button variant="outline" size="sm" className="gap-2">
                <FileText className="h-4 w-4" aria-hidden="true" />
                Ver nota no boletim
              </Button>
            </Link>
          )}
        </div>
      )}

      {exercise.description && (
        <Card className={user.role === "student" ? "kid-card border-indigo-100" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-slate-600">Instruções</CardTitle>
          </CardHeader>
          <CardContent className="text-slate-700">{exercise.description}</CardContent>
        </Card>
      )}

      {isStaff && exercise.dueDate && (
        <p className="text-sm text-slate-600">
          Prazo de entrega: <strong>{formatDate(exercise.dueDate)}</strong>
        </p>
      )}

      {user.role === "student" && (
        <Card className="kid-card border-2 border-indigo-100">
          <CardHeader>
            <CardTitle className="text-xl">
              {studentSubmission?.status === "graded"
                ? "Suas respostas"
                : studentSubmission
                  ? "Revisar e reenviar"
                  : "Hora de responder!"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {studentSubmission?.status === "graded" ? (
              <>
                <div className="mb-6 flex items-center gap-3 rounded-xl bg-emerald-100 px-4 py-3">
                  <PartyPopper className="h-8 w-8 text-emerald-600" aria-hidden="true" />
                  <div>
                    <p className="text-xl font-bold text-emerald-900">
                      Nota: {studentSubmission.score?.toFixed(1)} / {studentSubmission.maxScore?.toFixed(1)} pts
                    </p>
                    <p className="text-sm text-emerald-800">
                      +{Math.round((studentSubmission.score ?? 0) / (studentSubmission.maxScore ?? 1) * exercise.xpReward)} XP
                      {" · "}
                      +{Math.round((studentSubmission.score ?? 0) / (studentSubmission.maxScore ?? 1) * exercise.coinReward)} moedas
                    </p>
                  </div>
                </div>
                <ExerciseSubmitForm
                  exerciseId={exercise.id}
                  questions={exercise.questions}
                  readOnly
                  existingAnswers={answerMap}
                  kidFriendly
                />
              </>
            ) : !pastDue || studentSubmission ? (
              <ExerciseSubmitForm
                exerciseId={exercise.id}
                questions={exercise.questions}
                existingAnswers={answerMap}
                kidFriendly
              />
            ) : (
              <p className="text-lg text-slate-600">O prazo para entrega encerrou. Fale com seu professor.</p>
            )}
          </CardContent>
        </Card>
      )}

      {isStaff && (
        <>
          <ExerciseClassProgress
            className={exercise.classGroup?.name ?? null}
            totalStudents={classStudentCount}
            delivered={exercise.submissions.length}
            graded={gradedSubs.length}
            pendingGrade={pendingSubs.length}
          />

          {gradedSubs.length > 0 && (
            <ExerciseQuestionStats questions={exercise.questions} submissions={exercise.submissions} />
          )}

          {canEdit && (
            <>
              <EditExerciseForm
                exercise={{
                  id: exercise.id,
                  title: exercise.title,
                  description: exercise.description,
                  kind: exercise.kind,
                  maxPoints: exercise.maxPoints,
                  xpReward: exercise.xpReward,
                  coinReward: exercise.coinReward,
                  dueDate: exercise.dueDate?.toISOString().slice(0, 16) ?? "",
                  isActive: exercise.isActive,
                }}
              />
              <div className="flex justify-end">
                <DeleteConfirmButton
                  label="Excluir exercício"
                  variant="destructive"
                  confirmMessage={`Excluir "${exercise.title}" e todas as entregas? Esta ação não pode ser desfeita.`}
                  hiddenFields={{ id: exercise.id }}
                  action={deleteExerciseAction}
                  redirectTo="/dashboard/exercicios"
                />
              </div>
            </>
          )}

          {pendingSubs.length > 0 && (
            <Card className="border-amber-200 bg-amber-50/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertCircle className="h-5 w-5 text-amber-600" aria-hidden="true" />
                  {pendingSubs.length} entrega(s) para corrigir
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {pendingSubs.map((sub) => (
                  <GradeSubmissionForm
                    key={sub.id}
                    submissionId={sub.id}
                    studentName={sub.student.user.fullName}
                    questions={exercise.questions}
                    answers={sub.answers}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {gradedSubs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                  Já corrigidas ({gradedSubs.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {gradedSubs.map((sub) => (
                  <div key={sub.id} className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                    <p className="font-semibold">{sub.student.user.fullName}</p>
                    <p className="text-sm text-emerald-800">
                      {sub.score?.toFixed(1)}/{sub.maxScore?.toFixed(1)} pts
                    </p>
                    {sub.feedback && <p className="mt-1 text-sm text-slate-600">{sub.feedback}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {exercise.submissions.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-slate-500">
                Nenhum aluno entregou ainda. Compartilhe o link ou avise a turma.
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
