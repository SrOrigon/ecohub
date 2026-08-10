import { getSessionUser } from "@/lib/auth";
import { getStudentById, getClasses } from "@/lib/queries";
import { fetchChildForParent } from "@/lib/reads/parent-reads";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { formatDate } from "@/lib/utils";
import { ATTENDANCE_LABELS, type AttendanceStatus } from "@/lib/constants";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { BookOpen, FileText, Medal, Target } from "lucide-react";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { EditStudentForm } from "@/components/forms/edit-student-form";
import { DeleteStudentButton } from "@/components/forms/delete-student-button";
import { Button } from "@/components/ui/button";

function attendanceLabel(status: string) {
  return ATTENDANCE_LABELS[status as AttendanceStatus] ?? status;
}

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { id } = await params;

  if (user.role === "parent") {
    const link = await fetchChildForParent(user, user.id, id);
    if (!link) redirect("/dashboard/responsavel");
    redirect(`/dashboard/responsavel/filho/${id}`);
  }

  if (user.role === "student") {
    const own = await prisma.student.findFirst({ where: { userId: user.id } });
    if (!own || own.id !== id) redirect("/dashboard/aluno");
  }

  const [student, classes] = await Promise.all([
    getStudentById(id, user.schoolId),
    getClasses(user.schoolId),
  ]);
  if (!student) notFound();

  const classOptions = classes.map((c) => ({ id: c.id, name: c.name }));
  const canManage = user.role === "admin" || user.role === "director" || user.role === "teacher";
  const canDelete = user.role === "admin" || user.role === "director";

  const avgGrade =
    student.grades.length > 0
      ? student.grades.reduce((s, g) => s + g.value, 0) / student.grades.length
      : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        backHref="/dashboard/alunos"
        backLabel="Voltar aos alunos"
        title={student.user.fullName}
        description={`Matrícula ${student.enrollmentCode} · ${student.classGroup?.name ?? "Sem turma"}`}
      >
        <div className="flex flex-wrap gap-2">
          <Badge variant="default">Nível {student.level}</Badge>
          <Badge variant="success">{student.xpTotal} XP</Badge>
          <Badge variant="warning">{student.coins} moedas</Badge>
          <Link href={`/dashboard/alunos/${id}/boletim`}>
            <Button variant="outline" size="sm">
              <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
              Boletim
            </Button>
          </Link>
          {canManage && (
            <EditStudentForm
              studentId={student.id}
              currentClassId={student.classId}
              classes={classOptions}
            />
          )}
          {canDelete && (
            <DeleteStudentButton studentId={student.id} studentName={student.user.fullName} />
          )}
        </div>
      </PageHeader>

      <Card className="overflow-hidden border-2 border-indigo-100">
        <CardContent className="flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:items-center sm:text-left">
          <ProfileAvatar
            name={student.user.fullName}
            avatarUrl={student.user.avatarUrl}
            size="xl"
          />
          <div className="min-w-0 space-y-1">
            <p className="text-sm text-slate-500">{student.user.email}</p>
            {!student.user.avatarUrl && (
              <p className="text-xs text-slate-500">
                Sem foto de perfil — o aluno pode adicionar em Minha conta.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-sm text-slate-500">Média geral</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{avgGrade.toFixed(1)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-slate-500">Notas lançadas</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{student.grades.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-slate-500">Conquistas</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{student.studentBadges.length}</p></CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Notas</CardTitle></CardHeader>
          <CardContent>
            {student.grades.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="Nenhuma nota"
                description="As notas aparecerão aqui quando forem lançadas."
                className="py-6"
              />
            ) : (
              <ul className="space-y-2 text-sm">
                {student.grades.map((g) => (
                  <li key={g.id} className="flex justify-between border-b border-slate-100 py-2">
                    <span>{g.subject} · {g.period}</span>
                    <Badge variant={g.value >= 7 ? "success" : g.value >= 5 ? "warning" : "danger"}>
                      {g.value.toFixed(1)}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Histórico de XP</CardTitle></CardHeader>
          <CardContent>
            {student.xpTransactions.length === 0 ? (
              <EmptyState
                icon={Medal}
                title="Sem XP registrado"
                description="XP é ganho com notas, presença e missões."
                className="py-6"
              />
            ) : (
              <ul className="space-y-2 text-sm">
                {student.xpTransactions.map((tx) => (
                  <li key={tx.id} className="flex justify-between border-b border-slate-100 py-2">
                    <span>{tx.reason}</span>
                    <Badge variant="success">+{tx.amount}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Frequência recente</CardTitle></CardHeader>
          <CardContent>
            {student.attendance.length === 0 ? (
              <EmptyState
                title="Sem registros"
                description="A frequência aparecerá após a chamada ser feita."
                className="py-6"
              />
            ) : (
              <ul className="space-y-2 text-sm">
                {student.attendance.map((a) => (
                  <li key={a.id} className="flex justify-between border-b border-slate-100 py-2">
                    <span>{formatDate(a.date)}</span>
                    <Badge>{attendanceLabel(a.status)}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Missões e badges</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {student.studentMissions.length === 0 && student.studentBadges.length === 0 ? (
              <EmptyState
                icon={Target}
                title="Nenhuma missão ou badge"
                description="Missões concluídas e conquistas aparecerão aqui."
                className="py-6"
              />
            ) : (
              <>
                {student.studentMissions.map((sm) => (
                  <div key={sm.id} className="rounded-lg border p-3">
                    <p className="font-medium">{sm.mission.title}</p>
                    <p className="text-xs text-slate-500">
                      {sm.completedAt ? `Concluída em ${formatDate(sm.completedAt)}` : "Em andamento"}
                    </p>
                  </div>
                ))}
                {student.studentBadges.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {student.studentBadges.map((sb) => (
                      <Badge key={sb.id} variant="default">{sb.badge.name}</Badge>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
