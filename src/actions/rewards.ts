"use server";

import { revalidatePath } from "next/cache";
import { requireSessionResult } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notifyStudent, notifyStudentParents } from "@/lib/notifications";
import { getSchoolSettings } from "@/lib/school-settings";
import { hasPermission } from "@/lib/permissions";

function revalidateLoja() {
  ["/dashboard/loja", "/dashboard/aluno", "/dashboard/gamificacao", "/dashboard/notificacoes"].forEach((p) =>
    revalidatePath(p)
  );
}

export async function createRewardAction(formData: FormData) {
  const session = await requireSessionResult(["admin", "director"]);
  if (!session.ok) return { error: session.error };
  const user = session.user;
  if (!user.schoolId) return { error: "Escola não configurada." };

  const settings = await getSchoolSettings(user.schoolId);
  if (user.role === "director" && !hasPermission(user.role, settings, "director.manageRewards")) {
    return { error: "Sem permissão para gerenciar prêmios." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "").trim() || null;
  const coinCost = parseInt(String(formData.get("coinCost") ?? "0"), 10);
  const stockStr = String(formData.get("stock") ?? "").trim();
  const stock = stockStr ? parseInt(stockStr, 10) : null;
  const itemType = String(formData.get("itemType") ?? "physical").trim();
  const cosmeticKey = String(formData.get("cosmeticKey") ?? "").trim() || null;

  if (!name || coinCost <= 0) return { error: "Nome e custo em moedas são obrigatórios." };

  const activeCategories = await prisma.rewardCategory.count({
    where: { schoolId: user.schoolId, isActive: true },
  });
  if (itemType === "physical" && activeCategories > 0 && !categoryId) {
    return { error: "Selecione uma categoria para o item." };
  }

  if (categoryId) {
    const cat = await prisma.rewardCategory.findFirst({
      where: { id: categoryId, schoolId: user.schoolId, isActive: true },
    });
    if (!cat) return { error: "Categoria inválida ou inativa." };
  }

  await prisma.reward.create({
    data: {
      schoolId: user.schoolId,
      categoryId,
      name,
      description: description || null,
      coinCost,
      stock: stock && stock > 0 ? stock : null,
      itemType,
      cosmeticKey,
      isActive: true,
    },
  });

  revalidateLoja();
  return { success: true };
}

export async function updateRewardAction(formData: FormData) {
  const session = await requireSessionResult(["admin", "director"]);
  if (!session.ok) return { error: session.error };
  const user = session.user;
  if (!user.schoolId) return { error: "Escola não configurada." };

  const settings = await getSchoolSettings(user.schoolId);
  if (user.role === "director" && !hasPermission(user.role, settings, "director.manageRewards")) {
    return { error: "Sem permissão para gerenciar prêmios." };
  }

  const rewardId = String(formData.get("rewardId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "").trim() || null;
  const coinCost = parseInt(String(formData.get("coinCost") ?? "0"), 10);
  const stockStr = String(formData.get("stock") ?? "").trim();
  const stock = stockStr ? parseInt(stockStr, 10) : null;
  const itemType = String(formData.get("itemType") ?? "physical").trim();
  const cosmeticKey = String(formData.get("cosmeticKey") ?? "").trim() || null;

  if (!rewardId || !name || coinCost <= 0) {
    return { error: "Nome e custo em moedas são obrigatórios." };
  }

  const reward = await prisma.reward.findFirst({
    where: { id: rewardId, schoolId: user.schoolId },
  });
  if (!reward) return { error: "Item não encontrado." };

  if (categoryId) {
    const cat = await prisma.rewardCategory.findFirst({
      where: { id: categoryId, schoolId: user.schoolId },
    });
    if (!cat) return { error: "Categoria inválida." };
  }

  await prisma.reward.update({
    where: { id: rewardId },
    data: {
      categoryId,
      name,
      description: description || null,
      coinCost,
      stock: stock !== null && stock >= 0 ? stock : null,
      itemType,
      cosmeticKey,
    },
  });

  revalidateLoja();
  return { success: true };
}

export async function deleteRewardAction(formData: FormData) {
  const session = await requireSessionResult(["admin", "director"]);
  if (!session.ok) return { error: session.error };
  const user = session.user;
  if (!user.schoolId) return { error: "Escola não configurada." };

  const settings = await getSchoolSettings(user.schoolId);
  if (user.role === "director" && !hasPermission(user.role, settings, "director.manageRewards")) {
    return { error: "Sem permissão para gerenciar prêmios." };
  }

  const rewardId = String(formData.get("rewardId") ?? "");
  const reward = await prisma.reward.findFirst({
    where: { id: rewardId, schoolId: user.schoolId },
    include: { _count: { select: { redemptions: true } } },
  });
  if (!reward) return { error: "Item não encontrado." };

  if (reward._count.redemptions > 0) {
    await prisma.reward.update({
      where: { id: rewardId },
      data: { isActive: false },
    });
    revalidateLoja();
    return {
      success: true,
      message: "Item desativado (já possui resgates e não pode ser excluído).",
    };
  }

  await prisma.reward.delete({ where: { id: rewardId } });
  revalidateLoja();
  return { success: true };
}

export async function toggleRewardAction(formData: FormData) {
  const session = await requireSessionResult(["admin", "director"]);
  if (!session.ok) return { error: session.error };
  const user = session.user;
  if (!user.schoolId) return { error: "Escola não configurada." };

  const settings = await getSchoolSettings(user.schoolId);
  if (user.role === "director" && !hasPermission(user.role, settings, "director.manageRewards")) {
    return { error: "Sem permissão para gerenciar prêmios." };
  }

  const rewardId = String(formData.get("rewardId") ?? "");
  const reward = await prisma.reward.findFirst({
    where: { id: rewardId, schoolId: user.schoolId },
  });
  if (!reward) return { error: "Recompensa não encontrada." };

  await prisma.reward.update({
    where: { id: rewardId },
    data: { isActive: !reward.isActive },
  });

  revalidateLoja();
  return { success: true };
}

export async function redeemRewardAction(formData: FormData) {
  const session = await requireSessionResult(["admin", "director", "teacher", "student"]);
  if (!session.ok) return { error: session.error };
  const user = session.user;
  const rewardId = String(formData.get("rewardId") ?? "");
  let studentId = String(formData.get("studentId") ?? "");

  if (user.role === "student") {
    const st = await prisma.student.findFirst({ where: { userId: user.id } });
    if (!st) return { error: "Perfil de aluno não encontrado." };
    studentId = st.id;
    const settings = await getSchoolSettings(user.schoolId);
    if (!hasPermission(user.role, settings, "student.redeemShop")) {
      return { error: "Resgates na loja estão desativados." };
    }
  }

  if (!rewardId || !studentId) return { error: "Dados inválidos." };

  const [reward, student] = await Promise.all([
    prisma.reward.findFirst({
      where: { id: rewardId, isActive: true, schoolId: user.schoolId ?? undefined },
    }),
    prisma.student.findFirst({
      where: { id: studentId, user: { schoolId: user.schoolId } },
    }),
  ]);

  if (!reward) return { error: "Recompensa indisponível." };
  if (!student) return { error: "Aluno não encontrado." };

  const isCosmetic = reward.itemType === "frame" || reward.itemType === "background";

  const settings = await getSchoolSettings(user.schoolId);
  if (!isCosmetic && settings.shop.requireStock && reward.stock === null) {
    return { error: "Esta escola exige estoque definido para resgates." };
  }
  if (reward.stock !== null && reward.stock <= 0) {
    return { error: "Recompensa esgotada." };
  }

  // Verificar se o aluno já possui o cosmético
  if (isCosmetic && reward.cosmeticKey) {
    const existingRedemption = await prisma.rewardRedemption.findFirst({
      where: {
        studentId,
        reward: { cosmeticKey: reward.cosmeticKey },
        status: "fulfilled",
      },
    });
    if (existingRedemption) {
      return { error: "Você já possui este item no seu inventário!" };
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      const debited = await tx.student.updateMany({
        where: { id: studentId, coins: { gte: reward.coinCost } },
        data: { coins: { decrement: reward.coinCost } },
      });
      if (debited.count === 0) throw new Error("INSUFFICIENT_COINS");

      if (reward.stock !== null) {
        const stocked = await tx.reward.updateMany({
          where: { id: rewardId, stock: { gt: 0 } },
          data: { stock: { decrement: 1 } },
        });
        if (stocked.count === 0) throw new Error("OUT_OF_STOCK");
      }

      const status = isCosmetic ? "fulfilled" : "pending";
      const fulfilledAt = isCosmetic ? new Date() : null;

      await tx.rewardRedemption.create({
        data: { studentId, rewardId, coinCost: reward.coinCost, status, fulfilledAt },
      });

      // Se for cosmético e o aluno não tiver um equipado do tipo, equipar automaticamente
      if (isCosmetic && reward.cosmeticKey) {
        if (reward.itemType === "frame" && !student.equippedFrame) {
          await tx.student.update({
            where: { id: studentId },
            data: { equippedFrame: reward.cosmeticKey },
          });
        } else if (reward.itemType === "background" && !student.equippedBackground) {
          await tx.student.update({
            where: { id: studentId },
            data: { equippedBackground: reward.cosmeticKey },
          });
        }
      }
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "INSUFFICIENT_COINS") {
      return {
        error: `Moedas insuficientes. Você tem ${student.coins}, precisa de ${reward.coinCost}.`,
      };
    }
    if (msg === "OUT_OF_STOCK") return { error: "Recompensa esgotada." };
    throw e;
  }

  if (isCosmetic) {
    await notifyStudent(
      studentId,
      "Cosmético desbloqueado!",
      `Você comprou ${reward.name}! O item já foi adicionado ao seu inventário.`,
      "/dashboard/loja"
    );
    revalidateLoja();
    return {
      success: true,
      message: `Item desbloqueado: ${reward.name}! Acesse a aba Meu Inventário para equipar.`,
    };
  }

  await notifyStudent(
    studentId,
    "Resgate solicitado!",
    `Você resgatou: ${reward.name} (-${reward.coinCost} moedas). Aguarde a entrega na escola.`,
    "/dashboard/loja"
  );
  await notifyStudentParents(
    studentId,
    "Resgate na loja",
    `Resgate pendente: ${reward.name} (${reward.coinCost} moedas)`,
    `/dashboard/responsavel/filho/${studentId}`,
    "shop"
  );

  revalidateLoja();
  return { success: true, message: `Resgate confirmado: ${reward.name}! Retire na escola.` };
}

export async function equipStudentCosmeticAction(formData: FormData) {
  const session = await requireSessionResult(["student"]);
  if (!session.ok) return { error: session.error };
  const user = session.user;

  const cosmeticType = String(formData.get("cosmeticType") ?? "").trim(); // "frame" | "background"
  const cosmeticKey = String(formData.get("cosmeticKey") ?? "").trim(); // "" to unequip

  if (cosmeticType !== "frame" && cosmeticType !== "background") {
    return { error: "Tipo de cosmético inválido." };
  }

  const student = await prisma.student.findFirst({ where: { userId: user.id } });
  if (!student) return { error: "Perfil de aluno não encontrado." };

  if (cosmeticKey) {
    // Validar se o aluno é dono deste cosmético
    const redemption = await prisma.rewardRedemption.findFirst({
      where: {
        studentId: student.id,
        status: "fulfilled",
        reward: { cosmeticKey, itemType: cosmeticType },
      },
    });
    if (!redemption) {
      return { error: "Você não possui este item cosmético." };
    }
  }

  if (cosmeticType === "frame") {
    await prisma.student.update({
      where: { id: student.id },
      data: { equippedFrame: cosmeticKey || null },
    });
  } else {
    await prisma.student.update({
      where: { id: student.id },
      data: { equippedBackground: cosmeticKey || null },
    });
  }

  revalidateLoja();
  revalidatePath("/dashboard/perfil");
  return {
    success: true,
    message: cosmeticKey ? "Item equipado com sucesso!" : "Item desequipado.",
  };
}

export async function seedPresetCosmeticsForSchoolAction() {
  const session = await requireSessionResult(["admin", "director"]);
  if (!session.ok) return { error: session.error };
  const user = session.user;
  if (!user.schoolId) return { error: "Escola não configurada." };

  const { ALL_PRESET_COSMETICS } = await import("@/lib/cosmetics-catalog");

  let createdCount = 0;

  for (const preset of ALL_PRESET_COSMETICS) {
    const exists = await prisma.reward.findFirst({
      where: { schoolId: user.schoolId, cosmeticKey: preset.key },
    });
    if (!exists) {
      await prisma.reward.create({
        data: {
          schoolId: user.schoolId,
          name: preset.name,
          description: preset.description,
          coinCost: preset.defaultCoinCost,
          itemType: preset.itemType,
          cosmeticKey: preset.key,
          isActive: true,
        },
      });
      createdCount++;
    }
  }

  revalidateLoja();
  return {
    success: true,
    message: createdCount > 0 ? `${createdCount} cosmético(s) adicionado(s) à loja da escola!` : "Todos os cosméticos já foram adicionados.",
  };
}

export async function fulfillRedemptionAction(formData: FormData) {
  const session = await requireSessionResult(["admin", "director", "teacher"]);
  if (!session.ok) return { error: session.error };
  const user = session.user;
  const settings = await getSchoolSettings(user.schoolId);
  if (user.role === "teacher") {
    if (!hasPermission(user.role, settings, "teacher.fulfillShop")) {
      return { error: "Sem permissão para entregar prêmios." };
    }
    if (!settings.shop.teachersCanFulfill) {
      return { error: "Professores não podem marcar entrega nesta escola." };
    }
  }
  const redemptionId = String(formData.get("redemptionId") ?? "");
  if (!redemptionId) return { error: "Resgate inválido." };

  const redemption = await prisma.rewardRedemption.findFirst({
    where: {
      id: redemptionId,
      student: { user: { schoolId: user.schoolId } },
    },
    include: { reward: true, student: true },
  });
  if (!redemption) return { error: "Resgate não encontrado." };
  if (redemption.status === "fulfilled") {
    return { error: "Este resgate já foi entregue." };
  }

  await prisma.rewardRedemption.update({
    where: { id: redemptionId },
    data: { status: "fulfilled", fulfilledAt: new Date() },
  });

  await notifyStudent(
    redemption.studentId,
    "Prêmio entregue!",
    `Você recebeu: ${redemption.reward.name}. Aproveite!`,
    "/dashboard/loja"
  );
  await notifyStudentParents(
    redemption.studentId,
    "Prêmio entregue",
    `${redemption.reward.name} foi entregue na escola.`,
    `/dashboard/responsavel/filho/${redemption.studentId}`,
    "shop"
  );

  revalidateLoja();
  return { success: true };
}

export async function getRewardsForSchool(schoolId: string | null) {
  if (!schoolId) return [];
  return prisma.reward.findMany({
    where: { schoolId },
    include: {
      category: { select: { id: true, name: true, isActive: true } },
      _count: { select: { redemptions: true } },
    },
    orderBy: [{ category: { sortOrder: "asc" } }, { coinCost: "asc" }],
  });
}

export async function getStudentRedemptions(studentId: string) {
  return prisma.rewardRedemption.findMany({
    where: { studentId },
    include: { reward: true },
    orderBy: { redeemedAt: "desc" },
    take: 20,
  });
}
