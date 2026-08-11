import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ScheduleSlotForm } from "@/components/forms/schedule-slot-form";
import { ConfigureSubjectsPrompt } from "@/components/school/configure-subjects-prompt";
import { getSchoolSettings } from "@/lib/school-settings";
import { redirect } from "next/navigation";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default async function HorariosPage() {
  const user = await getSessionUser();
  if (!user?.schoolId) redirect("/login");
  if (!["admin", "director", "secretary", "teacher"].includes(user.role)) redirect("/dashboard");

  const canManageSettings = user.role === "admin" || user.role === "director";

  const classes = await prisma.classGroup.findMany({
    where: { schoolId: user.schoolId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const settings = await getSchoolSettings(user.schoolId);
  const subjects = settings.academic.subjects;

  const slots = await prisma.classScheduleSlot.findMany({
    where: { schoolId: user.schoolId },
    include: { classGroup: { select: { name: true } } },
    orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Horários"
        description="Grade semanal por turma ou curso — somente disciplinas cadastradas pela instituição."
      />

      {subjects.length === 0 ? (
        <ConfigureSubjectsPrompt canManage={canManageSettings} />
      ) : (
        <Card>
          <CardContent className="space-y-4 p-4">
            <p className="font-semibold">Adicionar horário</p>
            <ScheduleSlotForm classes={classes} subjects={subjects} />
          </CardContent>
        </Card>
      )}

      <div className="table-scroll-container rounded-xl border border-slate-200">
        <table className="min-w-[640px] w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3">Turma</th>
              <th className="px-4 py-3">Dia</th>
              <th className="px-4 py-3">Horário</th>
              <th className="px-4 py-3">Disciplina</th>
              <th className="px-4 py-3">Sala</th>
            </tr>
          </thead>
          <tbody>
            {slots.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  Nenhum horário cadastrado.
                </td>
              </tr>
            ) : (
              slots.map((slot) => (
                <tr key={slot.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">{slot.classGroup.name}</td>
                  <td className="px-4 py-3">{WEEKDAYS[slot.weekday]}</td>
                  <td className="px-4 py-3">
                    {slot.startTime} – {slot.endTime}
                  </td>
                  <td className="px-4 py-3">{slot.subject}</td>
                  <td className="px-4 py-3">{slot.room ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
