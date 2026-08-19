import { prisma } from "@/lib/db";
import { buildFinanceSnapshot, type FinanceSnapshot } from "@/lib/student-finance";

export type WalletItem = {
  kind: "xp" | "coins" | "badge" | "reward" | "discount" | "benefit";
  label: string;
  value: string;
  detail?: string;
};

export type StudentWallet = {
  xpTotal: number;
  coins: number;
  badges: number;
  rewards: number;
  discountPercent: number;
  items: WalletItem[];
  finance: FinanceSnapshot;
};

export async function getStudentWallet(studentId: string): Promise<StudentWallet> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      xpTotal: true,
      coins: true,
      studentBadges: { select: { id: true } },
      rewardRedemptions: {
        include: { reward: { select: { name: true } } },
        orderBy: { redeemedAt: "desc" },
        take: 8,
      },
      financeAccount: {
        include: { payments: { orderBy: { paidAt: "desc" } } },
      },
    },
  });

  const finance = buildFinanceSnapshot({
    monthlyAmountCents: student?.financeAccount?.monthlyAmountCents ?? 0,
    dueDay: student?.financeAccount?.dueDay ?? 10,
    discountPercent: student?.financeAccount?.discountPercent ?? 0,
    expectedInstallments: student?.financeAccount?.expectedInstallments ?? 10,
    payments: student?.financeAccount?.payments ?? [],
  });

  const items: WalletItem[] = [
    { kind: "xp", label: "XP acumulado", value: String(student?.xpTotal ?? 0) },
    { kind: "coins", label: "Moedas", value: String(student?.coins ?? 0) },
    { kind: "badge", label: "Conquistas", value: String(student?.studentBadges.length ?? 0) },
    {
      kind: "reward",
      label: "Recompensas resgatadas",
      value: String(student?.rewardRedemptions.length ?? 0),
    },
  ];

  if (finance.discountPercent > 0) {
    items.push({
      kind: "discount",
      label: "Desconto na mensalidade",
      value: `${finance.discountPercent}%`,
      detail: "Benefício financeiro vinculado ao perfil",
    });
  }

  for (const redemption of student?.rewardRedemptions ?? []) {
    items.push({
      kind: "benefit",
      label: redemption.reward.name,
      value: redemption.status === "pending" ? "A retirar" : "Resgatada",
      detail: `${redemption.coinCost} moedas`,
    });
  }

  return {
    xpTotal: student?.xpTotal ?? 0,
    coins: student?.coins ?? 0,
    badges: student?.studentBadges.length ?? 0,
    rewards: student?.rewardRedemptions.length ?? 0,
    discountPercent: finance.discountPercent,
    items,
    finance,
  };
}
