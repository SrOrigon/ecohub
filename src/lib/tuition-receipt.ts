import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { referenceMonthLabel } from "@/lib/billing-status";

const STAFF_ROLES = ["admin", "director", "secretary"];

export function paymentMethodLabel(method: string) {
  if (method === "pix_gateway") return "Pix";
  if (method === "webhook_gateway") return "Pagamento online";
  if (method === "manual_proof_verified") return "Comprovante conferido pela escola";
  if (method === "manual") return "Registrado pela escola";
  return method;
}

export async function loadTuitionReceipt(user: SessionUser, receiptCode: string) {
  const payment = await prisma.tuitionPayment.findUnique({
    where: { receiptCode },
    select: {
      receiptCode: true,
      amountCents: true,
      paidAt: true,
      dueDate: true,
      method: true,
      installment: { select: { title: true } },
      student: {
        select: {
          id: true,
          userId: true,
          enrollmentCode: true,
          classGroup: { select: { name: true } },
          user: {
            select: {
              fullName: true,
              school: {
                select: { id: true, name: true, legalName: true, cnpj: true, city: true, state: true },
              },
            },
          },
          parentLinks: { select: { parentId: true, parent: { select: { fullName: true } } } },
        },
      },
    },
  });
  if (!payment) return null;

  const school = payment.student.user.school;
  if (!school) return null;

  const isStaff = STAFF_ROLES.includes(user.role) && user.schoolId === school.id;
  const isParent =
    user.role === "parent" && payment.student.parentLinks.some((link) => link.parentId === user.id);
  const isStudent = user.role === "student" && payment.student.userId === user.id;
  if (!isStaff && !isParent && !isStudent) return null;

  return {
    receiptCode: payment.receiptCode,
    amountCents: payment.amountCents,
    paidAt: payment.paidAt,
    dueDate: payment.dueDate,
    methodLabel: paymentMethodLabel(payment.method),
    title: payment.installment?.title || `Mensalidade · ${referenceMonthLabel(payment.dueDate)}`,
    studentId: payment.student.id,
    studentName: payment.student.user.fullName,
    enrollmentCode: payment.student.enrollmentCode,
    className: payment.student.classGroup?.name ?? null,
    payerNames: payment.student.parentLinks.map((link) => link.parent.fullName),
    school,
    backHref: isStaff
      ? `/dashboard/alunos/${payment.student.id}`
      : isParent
        ? `/dashboard/responsavel/filho/${payment.student.id}#financeiro`
        : "/dashboard",
  };
}
