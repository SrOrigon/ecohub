import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSchoolSettings } from "@/lib/school-settings";
import { hasPermission } from "@/lib/permissions";
import { getAnnouncementsForUser } from "@/actions/announcements";
import { PageHeader } from "@/components/layout/page-header";
import { AnnouncementBoard } from "@/components/forms/announcement-board";
import { redirect } from "next/navigation";

export default async function ComunicadosPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const settings = await getSchoolSettings(user.schoolId);
  const student = user.role === "student"
    ? await prisma.student.findUnique({ where: { userId: user.id }, select: { classId: true } })
    : null;

  const parentClassIds =
    user.role === "parent"
      ? (
          await prisma.parentStudent.findMany({
            where: { parentId: user.id },
            include: { student: { select: { classId: true } } },
          })
        )
          .map((link) => link.student.classId)
          .filter((id): id is string => Boolean(id))
      : null;

  const classIds =
    user.role === "student" && student?.classId
      ? [student.classId]
      : parentClassIds ?? undefined;

  const announcements = await getAnnouncementsForUser(user, user.id, user.schoolId, classIds);

  const canCreate =
    user.role === "admin" ||
    user.role === "director" ||
    (user.role === "teacher" && hasPermission(user.role, settings, "teacher.createAnnouncements"));

  const classFilter =
    user.role === "teacher" ? { schoolId: user.schoolId!, teacherId: user.id } : { schoolId: user.schoolId! };

  const classes = canCreate
    ? await prisma.classGroup.findMany({ where: classFilter, select: { id: true, name: true } })
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Comunicados"
        description="Avisos da escola e da turma  -  todos recebem notificação automaticamente."
      />
      <AnnouncementBoard
        announcements={announcements}
        canCreate={canCreate}
        canModerate={user.role === "admin" || user.role === "director"}
        currentUserId={user.id}
        classes={classes}
      />
    </div>
  );
}
