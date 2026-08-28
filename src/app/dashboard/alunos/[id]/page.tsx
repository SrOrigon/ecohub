import { getSessionUser } from "@/lib/auth";
import { getStudentById, getClasses, getRanking } from "@/lib/queries";
import { fetchChildForParent } from "@/lib/reads/parent-reads";
import { prisma } from "@/lib/db";
import { getStudentHistory } from "@/lib/institutional-history";
import { getSubjectPrecisionOverview } from "@/lib/subject-precision";
import { getSchoolSettings } from "@/lib/school-settings";
import { getStudentWallet } from "@/lib/student-wallet";
import { formatBRL } from "@/lib/student-finance";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { formatDate } from "@/lib/utils";
import { ATTENDANCE_LABELS, type AttendanceStatus } from "@/lib/constants";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { BookOpen, FileText, Medal, MapPin, Target } from "lucide-react";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { EditStudentForm } from "@/components/forms/edit-student-form";
import { CreateStudentActivityForm } from "@/components/forms/create-student-activity-form";
import { AdjustStudentPointsForm } from "@/components/forms/adjust-student-points-form";
import { DeleteStudentButton } from "@/components/forms/delete-student-button";
import { StudentPerformanceDashboard } from "@/components/students/student-performance-dashboard";
import { Student360Nav, parseStudent360Tab } from "@/components/students/student-360-nav";
import { StudentFinancePanel } from "@/components/students/student-finance-panel";
import { Button } from "@/components/ui/button";
import { calculateAge } from "@/lib/student-age";
import {
  activityTypeLabel,
  genderLabel,
  parseInterests,
  parseSocialLinks,
  SOCIAL_NETWORKS,
} from "@/lib/student-profile";
import { formatStudentClasses } from "@/lib/student-enrollments";
import { StudentEnrollmentsManager } from "@/components/forms/student-enrollments-manager";
import { hasPermission } from "@/lib/permissions";
import { StudentDocumentsPanel } from "@/components/documents/student-documents-panel";

function attendanceLabel(status: string) {
  return ATTENDANCE_LABELS[status as AttendanceStatus] ?? status;
}

function toDateInputValue(date: Date | null | undefined) {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export default async function StudentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aba?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const tabRaw = parseStudent360Tab((await searchParams).aba);
  const canManageDocuments =
    user.role === "admin" || user.role === "director" || user.role === "secretary";
  const tab = tabRaw === "documentos" && !canManageDocuments ? "cadastro" : tabRaw;

  if (user.role === "parent") {
    const link = await fetchChildForParent(user, user.id, id);
    if (!link) redirect("/dashboard/responsavel");
    redirect(`/dashboard/responsavel/filho/${id}`);
  }

  if (user.role === "student") {
    const own = await prisma.student.findFirst({ where: { userId: user.id } });
    if (!own || own.id !== id) redirect("/dashboard/aluno");
  }

  const [student, classes, history, precision, settings, wallet, ranking] = await Promise.all([
    getStudentById(id, user.schoolId),
    getClasses(user.schoolId),
    getStudentHistory(id),
    getSubjectPrecisionOverview(user.schoolId, { studentId: id }),
    getSchoolSettings(user.schoolId),
    getStudentWallet(id),
    getRanking(user.schoolId, null, 50),
  ]);
  if (!student) notFound();

  const classOptions = classes.map((c) => ({ id: c.id, name: c.name }));
  const canManage =
    user.role === "admin" ||
    user.role === "director" ||
    user.role === "secretary" ||
    user.role === "teacher";
  const canDelete = user.role === "admin" || user.role === "director" || user.role === "secretary";
  const canAdjustPoints =
    canManage &&
    (user.role === "admin" ||
      user.role === "director" ||
      user.role === "secretary" ||
      hasPermission(user.role, settings, "teacher.adjustPoints"));

  const avgGrade =
    student.grades.length > 0
      ? student.grades.reduce((s, g) => s + g.value, 0) / student.grades.length
      : 0;

  const displayName = student.user.displayName || student.user.fullName;
  const age = student.birthDate ? calculateAge(student.birthDate) : null;
  const interests = parseInterests(student.user.interests);
  const socialLinks = parseSocialLinks(student.user.socialLinks);
  const socialEntries = SOCIAL_NETWORKS.filter((network) => socialLinks[network.key]);
  const locationParts = [
    [student.user.street, student.user.streetNumber].filter(Boolean).join(", "),
    student.user.addressComplement,
    student.user.city,
    student.user.state,
    student.user.zipCode,
  ].filter(Boolean);
  const recordedActivities = student.profileActivities ?? [];
  const timeline = [
    ...recordedActivities.map((activity) => ({
      id: activity.id,
      at: activity.occurredAt,
      label: activity.title,
      detail: [activityTypeLabel(activity.type), activity.detail].filter(Boolean).join(" · "),
    })),
    ...student.attendance.map((record) => ({
      id: `att-${record.id}`,
      at: record.date,
      label: `Frequência: ${attendanceLabel(record.status)}`,
      detail: "Presença escolar",
    })),
    ...student.studentMissions
      .filter((mission) => mission.completedAt)
      .map((mission) => ({
        id: `mission-${mission.id}`,
        at: mission.completedAt!,
        label: mission.mission.title,
        detail: "Missão concluída",
      })),
    ...student.xpTransactions.map((tx) => ({
      id: `xp-${tx.id}`,
      at: tx.createdAt,
      label: tx.reason,
      detail: `+${tx.amount} XP`,
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 40);

  const canWriteFinance = canManageDocuments;
  const isActive = student.status !== "inactive";
  const attendancePresent = student.attendance.filter((a) => a.status === "present").length;
  const attendanceLate = student.attendance.filter((a) => a.status === "late").length;
  const attendanceAbsent = student.attendance.filter((a) => a.status === "absent").length;
  const attendanceRate =
    student.attendance.length > 0
      ? Math.round(((attendancePresent + attendanceLate) / student.attendance.length) * 100)
      : 0;
  const streak = [...student.attendance]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .reduce((count, record) => {
      if (count === null) return count;
      if (record.status === "present" || record.status === "late") return (count as number) + 1;
      return null;
    }, 0 as number | null) ?? 0;
  const myRank = ranking.find((entry) => entry.id === student.id);
  const completedTrails = (student.trailProgress ?? []).filter((item) => item.completedAt).length;
  const currentTrail = (student.trailProgress ?? []).find((item) => !item.completedAt);
  const performancePercent =
    settings.academic.maxGrade > 0
      ? Math.round((avgGrade / settings.academic.maxGrade) * 100)
      : 0;
  const relationLabels: Record<string, string> = {
    mae: "Mãe",
    pai: "Pai",
    responsavel: "Responsável",
    avo: "Avô/Avó",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        backHref="/dashboard/alunos"
        backLabel="Voltar aos alunos"
        title={displayName}
        description={`Matrícula ${student.enrollmentCode} · ${formatStudentClasses(student.classEnrollments ?? [], student.classGroup)}`}
      >
        <div className="flex flex-wrap gap-2">
          <Badge variant={isActive ? "success" : "danger"}>{isActive ? "Ativo" : "Inativo"}</Badge>
          <Badge variant="default">Nível {student.level}</Badge>
          <Badge variant="success">{student.xpTotal} XP</Badge>
          <Badge variant="warning">{student.coins} moedas</Badge>
          <Link href={`/dashboard/alunos/${id}/boletim`}>
            <Button variant="outline" size="sm">
              <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
              Boletim
            </Button>
          </Link>
          <Link href={`/dashboard/alunos/${id}?aba=evolucao`}>
            <Button variant="outline" size="sm">
              <Target className="mr-2 h-4 w-4" aria-hidden="true" />
              Evolução
            </Button>
          </Link>
          {canManage && (
            <EditStudentForm
              studentId={student.id}
              currentEmail={student.user.email}
              accountType={student.accountType}
              currentStatus={student.status}
              profile={{
                fullName: student.user.fullName,
                displayName: student.user.displayName,
                username: student.user.username,
                avatarUrl: student.user.avatarUrl,
                birthDate: toDateInputValue(student.birthDate),
                gender: student.user.gender,
                pronouns: student.user.pronouns,
                phone: student.user.phone,
                street: student.user.street,
                streetNumber: student.user.streetNumber,
                addressComplement: student.user.addressComplement,
                city: student.user.city,
                state: student.user.state,
                zipCode: student.user.zipCode,
                latitude: student.user.latitude,
                longitude: student.user.longitude,
                bio: student.user.bio,
                interests: student.user.interests,
                socialLinks,
              }}
            />
          )}
          {canDelete && (
            <DeleteStudentButton studentId={student.id} studentName={student.user.fullName} />
          )}
        </div>
      </PageHeader>

      <Card className="overflow-hidden border-2 border-indigo-100">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
          <ProfileAvatar
            name={displayName}
            avatarUrl={student.user.avatarUrl}
            size="xl"
          />
          <div className="min-w-0 flex-1 space-y-2">
            <div>
              <p className="text-xl font-bold">{displayName}</p>
              <p className="font-mono text-sm text-slate-500">#{student.enrollmentCode}</p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge variant={isActive ? "success" : "danger"}>{isActive ? "Ativo" : "Inativo"}</Badge>
              <Badge variant="secondary">Turmas: {formatStudentClasses(student.classEnrollments ?? [], student.classGroup)}</Badge>
              <Badge variant="secondary">Curso: {student.classGroup?.gradeLevel ?? "Não informado"}</Badge>
              <Badge variant="secondary">Matrícula em {formatDate(student.createdAt)}</Badge>
            </div>
            <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <p>🎮 Nível {student.level}</p>
              <p>⭐ {student.xpTotal.toLocaleString("pt-BR")} XP</p>
              <p>🏆 {student.studentBadges.length} conquistas</p>
              <p>🔥 {streak} dia(s) de sequência</p>
            </div>
            <p className="text-sm text-slate-600">
              Carteira: {student.coins} moedas
              {wallet.finance.netAmountCents > 0
                ? ` · Mensalidade ${formatBRL(wallet.finance.netAmountCents)} · ${wallet.finance.statusLabel}`
                : " · Financeiro ainda não configurado"}
            </p>
          </div>
        </CardContent>
      </Card>

      <Student360Nav
        studentId={student.id}
        active={tab}
        hiddenTabs={canManageDocuments ? [] : ["documentos"]}
      />

      {tab === "cadastro" && (
        <div className="grid gap-6 lg:grid-cols-2">
        {canManage && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Turmas e cursos matriculados</CardTitle>
            </CardHeader>
            <CardContent>
              <StudentEnrollmentsManager
                studentId={student.id}
                enrollments={(student.classEnrollments ?? []).map((item) => ({
                  classId: item.classId,
                  status: item.status,
                  classGroup: item.classGroup,
                }))}
                classes={classOptions}
              />
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader>
            <CardTitle>Identificação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <ProfileRow label="Nome completo" value={student.user.fullName} />
            <ProfileRow label="Nome de exibição" value={displayName} />
            <ProfileRow label="Usuário" value={student.user.username ? `@${student.user.username}` : "Não informado"} />
            <ProfileRow
              label="Nascimento / idade"
              value={
                student.birthDate
                  ? `${formatDate(student.birthDate)}${age != null ? ` · ${age} anos` : ""}`
                  : "Não informado"
              }
            />
            <ProfileRow label="Gênero" value={genderLabel(student.user.gender)} />
            <ProfileRow label="Pronomes" value={student.user.pronouns || "Não informado"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contato e credenciais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <ProfileRow label="E-mail" value={student.user.email} />
            <ProfileRow label="Telefone" value={student.user.phone || "Não informado"} />
            <ProfileRow label="Senha" value="Armazenada como hash seguro (nunca em texto puro)" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-4 w-4" aria-hidden="true" />
              Localização
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <ProfileRow label="Cidade / Estado / CEP" value={locationParts.join(" · ") || "Não informado"} />
            <ProfileRow
              label="Coordenadas"
              value={
                student.user.latitude != null && student.user.longitude != null
                  ? `${student.user.latitude}, ${student.user.longitude}`
                  : "Não informado"
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Interesses, redes e responsáveis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {interests.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {interests.map((tag) => (
                  <Badge key={tag} variant="secondary">{tag}</Badge>
                ))}
              </div>
            ) : (
              <p className="text-slate-500">Nenhum interesse cadastrado.</p>
            )}
            {socialEntries.length > 0 ? (
              <ul className="space-y-1">
                {socialEntries.map((network) => (
                  <li key={network.key}>
                    <a
                      href={socialLinks[network.key]}
                      className="text-indigo-600 hover:underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {network.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500">Nenhuma rede social vinculada.</p>
            )}
            <div className="border-t border-slate-100 pt-3">
              <p className="mb-2 font-medium">Responsáveis</p>
              {(student.parentLinks ?? []).length === 0 ? (
                <p className="text-slate-500">Nenhum responsável vinculado.</p>
              ) : (
                <ul className="space-y-1">
                  {(student.parentLinks ?? []).map((link) => (
                    <li key={link.id}>
                      {link.parent.fullName} · {relationLabels[link.relation] ?? link.relation}
                      {link.parent.email ? ` · ${link.parent.email}` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
        </div>
      )}

      {tab === "gamificacao" && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card><CardHeader><CardTitle className="text-sm text-slate-500">Nível</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{student.level}</p></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm text-slate-500">XP</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{student.xpTotal.toLocaleString("pt-BR")}</p></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm text-slate-500">Moedas</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{student.coins}</p></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm text-slate-500">Ranking</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{myRank ? `#${myRank.rank}` : "—"}</p></CardContent></Card>
          </div>
          <Card>
            <CardHeader><CardTitle>Carteira do aluno</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {wallet.items.map((item, index) => (
                <div key={`${item.kind}-${index}`} className="rounded-lg border border-slate-100 p-3">
                  <p className="text-xs text-slate-500">{item.label}</p>
                  <p className="font-semibold">{item.value}</p>
                  {item.detail && <p className="text-xs text-slate-500">{item.detail}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Missões</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {student.studentMissions.length === 0 ? (
                  <EmptyState icon={Target} title="Nenhuma missão" description="Missões da turma aparecerão aqui." className="py-6" />
                ) : (
                  student.studentMissions.map((sm) => (
                    <div key={sm.id} className="rounded-lg border p-3">
                      <p className="font-medium">{sm.mission.title}</p>
                      <p className="text-xs text-slate-500">
                        {sm.completedAt ? `Concluída em ${formatDate(sm.completedAt)}` : "Em andamento"}
                        {sm.completedAt ? ` · +${sm.mission.xpReward} XP` : ""}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Conquistas</CardTitle></CardHeader>
              <CardContent>
                {student.studentBadges.length === 0 ? (
                  <p className="text-sm text-slate-500">Nenhuma conquista ainda.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {student.studentBadges.map((sb) => (
                      <Badge key={sb.id} variant="default">{sb.badge.name}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          {canAdjustPoints && (
            <Card className="border-violet-200">
              <CardHeader>
                <CardTitle>Ajuste manual de pontos</CardTitle>
              </CardHeader>
              <CardContent>
                <AdjustStudentPointsForm
                  students={[{ id: student.id, name: student.user.fullName, className: student.classGroup?.name }]}
                  fixedStudentId={student.id}
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {tab === "academico" && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card><CardHeader><CardTitle className="text-sm text-slate-500">Média</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{avgGrade.toFixed(1)}</p></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm text-slate-500">Desempenho</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{performancePercent}%</p></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm text-slate-500">Projetos / trilhas</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{completedTrails}</p></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm text-slate-500">Módulo atual</CardTitle></CardHeader><CardContent><p className="text-lg font-bold">{currentTrail?.trail.title ?? "—"}</p></CardContent></Card>
          </div>
          <Card>
            <CardHeader><CardTitle>Notas, aulas e projetos</CardTitle></CardHeader>
            <CardContent>
              {student.grades.length === 0 ? (
                <EmptyState icon={BookOpen} title="Nenhuma nota" description="As notas aparecerão aqui quando forem lançadas." className="py-6" />
              ) : (
                <ul className="space-y-2 text-sm">
                  {student.grades.map((g) => (
                    <li key={g.id} className="flex justify-between border-b border-slate-100 py-2">
                      <span>{g.subject} · {g.period}</span>
                      <Badge variant={g.value >= settings.academic.passGrade ? "success" : g.value >= 5 ? "warning" : "danger"}>
                        {g.value.toFixed(1)}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "financeiro" && (
        <StudentFinancePanel studentId={student.id} finance={wallet.finance} canWrite={canWriteFinance} />
      )}

      {tab === "frequencia" && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card><CardHeader><CardTitle className="text-sm text-slate-500">Frequência</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{attendanceRate}%</p></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm text-slate-500">Presenças</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{attendancePresent}</p></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm text-slate-500">Faltas</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{attendanceAbsent}</p></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm text-slate-500">Atrasos</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{attendanceLate}</p></CardContent></Card>
          </div>
          <Card>
            <CardHeader><CardTitle>Registros recentes</CardTitle></CardHeader>
            <CardContent>
              {student.attendance.length === 0 ? (
                <EmptyState title="Sem registros" description="A frequência aparecerá após a chamada ser feita." className="py-6" />
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
        </div>
      )}

      {tab === "evolucao" && history && (
        <StudentPerformanceDashboard
          history={history}
          precision={precision}
          passGrade={settings.academic.passGrade}
          studentName={displayName}
        />
      )}

      {tab === "documentos" && canManageDocuments && user.schoolId && (
        <StudentDocumentsPanel studentId={student.id} schoolId={user.schoolId} />
      )}

      {tab === "historico" && (
      <Card>
        <CardHeader>
          <CardTitle>Histórico de atividades e acontecimentos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {canManage && <CreateStudentActivityForm studentId={student.id} />}
          {student.xpTransactions.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium">Movimentações de XP e carteira</p>
              <ul className="space-y-2 text-sm">
                {student.xpTransactions.map((tx) => (
                  <li key={tx.id} className="flex justify-between border-b border-slate-100 py-2">
                    <span>{tx.reason}</span>
                    <Badge variant={tx.amount >= 0 ? "success" : "danger"}>
                      {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                      {tx.amount === 0 ? " · moedas" : " XP"}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {timeline.length === 0 ? (
            <EmptyState
              icon={Medal}
              title="Sem atividades"
              description="Eventos, presenças, check-ins e interações aparecerão aqui."
              className="py-6"
            />
          ) : (
            <ul className="space-y-2 text-sm">
              {timeline.map((item) => (
                <li key={item.id} className="flex justify-between gap-4 border-b border-slate-100 py-2">
                  <div>
                    <p className="font-medium">{item.label}</p>
                    <p className="text-xs text-slate-500">{item.detail}</p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-500">{formatDate(item.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      )}
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-2 last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-800">{value}</span>
    </div>
  );
}
