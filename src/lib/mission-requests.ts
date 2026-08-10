import { prisma } from "@/lib/db";

export async function getPendingMissionConfirmations(schoolId: string, teacherId?: string) {
  return prisma.studentMission.findMany({
    where: {
      completedAt: null,
      mission: { schoolId, isActive: true },
      ...(teacherId
        ? {
            student: {
              OR: [
                { classGroup: { teacherId } },
                { classGroup: { coTeachers: { some: { teacherId } } } },
              ],
            },
          }
        : {}),
    },
    include: {
      student: {
        include: {
          user: { select: { fullName: true } },
          classGroup: { select: { name: true } },
        },
      },
      mission: {
        select: { id: true, title: true, xpReward: true, coinReward: true, classId: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}
