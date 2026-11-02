import { prisma } from "@/lib/db";

export type InstitutionTuitionPlan = {
  studentId: string;
  studentName: string;
  classId: string | null;
  className: string | null;
  monthlyAmountCents: number;
  dueDay: number;
  discountPercent: number;
  expectedInstallments: number;
};

export type InstitutionTuitionClass = {
  id: string;
  name: string;
  studentCount: number;
};

export async function listInstitutionTuitionPlans(schoolId: string): Promise<{
  classes: InstitutionTuitionClass[];
  plans: InstitutionTuitionPlan[];
}> {
  const [classes, students] = await Promise.all([
    prisma.classGroup.findMany({
      where: { schoolId },
      select: {
        id: true,
        name: true,
        _count: { select: { students: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.student.findMany({
      where: { user: { schoolId } },
      select: {
        id: true,
        classId: true,
        user: { select: { fullName: true } },
        classGroup: { select: { name: true } },
        financeAccount: {
          select: {
            monthlyAmountCents: true,
            dueDay: true,
            discountPercent: true,
            expectedInstallments: true,
          },
        },
      },
      orderBy: { user: { fullName: "asc" } },
    }),
  ]);

  return {
    classes: classes.map((item) => ({
      id: item.id,
      name: item.name,
      studentCount: item._count.students,
    })),
    plans: students.map((student) => ({
      studentId: student.id,
      studentName: student.user.fullName,
      classId: student.classId,
      className: student.classGroup?.name ?? null,
      monthlyAmountCents: student.financeAccount?.monthlyAmountCents ?? 0,
      dueDay: student.financeAccount?.dueDay ?? 10,
      discountPercent: student.financeAccount?.discountPercent ?? 0,
      expectedInstallments: student.financeAccount?.expectedInstallments ?? 10,
    })),
  };
}
