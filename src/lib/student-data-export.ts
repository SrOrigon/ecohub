import { prisma } from "@/lib/db";

export async function exportStudentData(schoolId: string, studentId: string) {
  const student = await prisma.student.findFirst({
    where: { id: studentId, user: { schoolId } },
    select: {
      enrollmentCode: true,
      birthDate: true,
      status: true,
      createdAt: true,
      user: {
        select: {
          fullName: true,
          email: true,
          phone: true,
          city: true,
          state: true,
        },
      },
      classGroup: { select: { name: true } },
      classEnrollments: {
        select: { status: true, enrolledAt: true, endedAt: true, classGroup: { select: { name: true } } },
      },
      grades: { select: { subject: true, value: true, maxValue: true, period: true, createdAt: true } },
      attendance: { select: { date: true, status: true, justificationNote: true } },
      parentLinks: { select: { relation: true, parent: { select: { fullName: true, email: true, phone: true } } } },
      tuitionPayments: {
        select: { amountCents: true, dueDate: true, paidAt: true, method: true, receiptCode: true },
      },
      tuitionInstallments: {
        select: { sequence: true, title: true, dueDate: true, amountCents: true, paymentMethod: true },
      },
      studentInvoices: {
        select: { title: true, amountCents: true, dueDate: true, status: true, paidAt: true },
      },
      studentBadges: { select: { earnedAt: true, badge: { select: { name: true } } } },
      studentMissions: { select: { completedAt: true, mission: { select: { title: true } } } },
      rewardRedemptions: { select: { coinCost: true, status: true, redeemedAt: true, reward: { select: { name: true } } } },
      issuedDocuments: { select: { title: true, contractNumber: true, issuedAt: true } },
    },
  });
  if (!student) return null;

  return {
    exportedAt: new Date().toISOString(),
    schoolId,
    aluno: {
      nome: student.user.fullName,
      email: student.user.email,
      telefone: student.user.phone,
      cidade: student.user.city,
      estado: student.user.state,
      matricula: student.enrollmentCode,
      nascimento: student.birthDate,
      situacao: student.status,
      turma: student.classGroup?.name ?? null,
      cadastradoEm: student.createdAt,
    },
    matriculas: student.classEnrollments.map((item) => ({
      turma: item.classGroup.name,
      situacao: item.status,
      inicio: item.enrolledAt,
      fim: item.endedAt,
    })),
    responsaveis: student.parentLinks.map((link) => ({
      nome: link.parent.fullName,
      email: link.parent.email,
      telefone: link.parent.phone,
      vinculo: link.relation,
    })),
    notas: student.grades,
    frequencia: student.attendance,
    parcelas: student.tuitionInstallments,
    pagamentos: student.tuitionPayments,
    cobrancas: student.studentInvoices,
    conquistas: student.studentBadges.map((item) => ({ nome: item.badge.name, em: item.earnedAt })),
    missoes: student.studentMissions.map((item) => ({ titulo: item.mission.title, concluidaEm: item.completedAt })),
    resgates: student.rewardRedemptions.map((item) => ({
      produto: item.reward.name,
      moedas: item.coinCost,
      situacao: item.status,
      em: item.redeemedAt,
    })),
    documentos: student.issuedDocuments,
  };
}
