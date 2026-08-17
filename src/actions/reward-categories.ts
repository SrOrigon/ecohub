"use server";

import { revalidatePath } from "next/cache";
import { requireSessionResult } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSchoolSettings } from "@/lib/school-settings";
import { hasPermission } from "@/lib/permissions";
import { invalidateSchoolCaches } from "@/lib/runtime-cache";

const DEFAULT_SHOP_CATEGORIES = [
  { name: "Lanches", description: "Lanches, bebidas e recompensas da cantina.", sortOrder: 0 },
  { name: "Material escolar", description: "Itens de papelaria e material didático.", sortOrder: 1 },
  { name: "Benefícios", description: "Vantagens, vales e privilégios na escola.", sortOrder: 2 },
];

function revalidateShop(schoolId?: string | null) {
  ["/dashboard/loja", "/dashboard/gamificacao"].forEach((p) => revalidatePath(p));
  invalidateSchoolCaches(schoolId);
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

function manageRewardsError(user: { role: string; schoolId: string | null }) {
  if (!user.schoolId) return "Escola não configurada.";
  return null;
}

async function checkDirectorManageRewards(user: { role: string; schoolId: string | null }) {
  const base = manageRewardsError(user);
  if (base) return base;
  const settings = await getSchoolSettings(user.schoolId);
  if (user.role === "director" && !hasPermission(user.role, settings, "director.manageRewards")) {
    return "Sem permissão para gerenciar a loja.";
  }
  return null;
}

export async function getRewardCategoriesForSchool(schoolId: string | null) {
  if (!schoolId) return [];
  return prisma.rewardCategory.findMany({
    where: { schoolId },
    include: { _count: { select: { rewards: true } } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function createRewardCategoryAction(formData: FormData) {
  const session = await requireSessionResult(["admin", "director"]);
  if (!session.ok) return { error: session.error };
  const user = session.user;

  const permError = await checkDirectorManageRewards(user);
  if (permError) return { error: permError };

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const sortOrder = parseInt(String(formData.get("sortOrder") ?? "0"), 10);

  if (!name) return { error: "Informe o nome da categoria." };

  const existing = await prisma.rewardCategory.findFirst({
    where: { schoolId: user.schoolId!, name },
  });
  if (existing) {
    if (!existing.isActive) {
      await prisma.rewardCategory.update({
        where: { id: existing.id },
        data: {
          isActive: true,
          description: description || existing.description,
          sortOrder: Number.isFinite(sortOrder) ? sortOrder : existing.sortOrder,
        },
      });
      revalidateShop(user.schoolId);
      return { success: true };
    }
    return { error: "Já existe uma categoria com este nome." };
  }

  try {
    await prisma.rewardCategory.create({
      data: {
        schoolId: user.schoolId!,
        name,
        description: description || null,
        sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
        isActive: true,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { error: "Já existe uma categoria com este nome. Atualize a página e tente de novo." };
    }
    throw error;
  }

  revalidateShop(user.schoolId);
  return { success: true };
}

export async function seedDefaultShopCategoriesAction() {
  const session = await requireSessionResult(["admin", "director"]);
  if (!session.ok) return { error: session.error };
  const user = session.user;

  const permError = await checkDirectorManageRewards(user);
  if (permError) return { error: permError };

  let created = 0;
  for (const item of DEFAULT_SHOP_CATEGORIES) {
    const existing = await prisma.rewardCategory.findFirst({
      where: { schoolId: user.schoolId!, name: item.name },
    });
    if (existing) {
      if (!existing.isActive) {
        await prisma.rewardCategory.update({
          where: { id: existing.id },
          data: { isActive: true },
        });
        created += 1;
      }
      continue;
    }
    await prisma.rewardCategory.create({
      data: {
        schoolId: user.schoolId!,
        name: item.name,
        description: item.description,
        sortOrder: item.sortOrder,
        isActive: true,
      },
    });
    created += 1;
  }

  revalidateShop(user.schoolId);
  if (created === 0) {
    return { success: true, message: "As categorias iniciais já existem. Você já pode cadastrar itens." };
  }
  return {
    success: true,
    message: `${created} categoria(s) pronta(s). Agora você pode cadastrar os prêmios.`,
  };
}

export async function updateRewardCategoryAction(formData: FormData) {
  const session = await requireSessionResult(["admin", "director"]);
  if (!session.ok) return { error: session.error };
  const user = session.user;

  const permError = await checkDirectorManageRewards(user);
  if (permError) return { error: permError };

  const categoryId = String(formData.get("categoryId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const sortOrder = parseInt(String(formData.get("sortOrder") ?? "0"), 10);

  if (!categoryId || !name) return { error: "Dados inválidos." };

  const category = await prisma.rewardCategory.findFirst({
    where: { id: categoryId, schoolId: user.schoolId! },
  });
  if (!category) return { error: "Categoria não encontrada." };

  const duplicate = await prisma.rewardCategory.findFirst({
    where: { schoolId: user.schoolId!, name, NOT: { id: categoryId } },
  });
  if (duplicate) return { error: "Já existe outra categoria com este nome." };

  await prisma.rewardCategory.update({
    where: { id: categoryId },
    data: {
      name,
      description: description || null,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : category.sortOrder,
    },
  });

  revalidateShop(user.schoolId);
  return { success: true };
}

export async function toggleRewardCategoryAction(formData: FormData) {
  const session = await requireSessionResult(["admin", "director"]);
  if (!session.ok) return { error: session.error };
  const user = session.user;

  const permError = await checkDirectorManageRewards(user);
  if (permError) return { error: permError };

  const categoryId = String(formData.get("categoryId") ?? "");
  const category = await prisma.rewardCategory.findFirst({
    where: { id: categoryId, schoolId: user.schoolId! },
  });
  if (!category) return { error: "Categoria não encontrada." };

  await prisma.rewardCategory.update({
    where: { id: categoryId },
    data: { isActive: !category.isActive },
  });

  revalidateShop(user.schoolId);
  return { success: true };
}

export async function deleteRewardCategoryAction(formData: FormData) {
  const session = await requireSessionResult(["admin", "director"]);
  if (!session.ok) return { error: session.error };
  const user = session.user;

  const permError = await checkDirectorManageRewards(user);
  if (permError) return { error: permError };

  const categoryId = String(formData.get("categoryId") ?? "");
  const category = await prisma.rewardCategory.findFirst({
    where: { id: categoryId, schoolId: user.schoolId! },
    include: { _count: { select: { rewards: true } } },
  });
  if (!category) return { error: "Categoria não encontrada." };

  if (category._count.rewards > 0) {
    await prisma.rewardCategory.update({
      where: { id: categoryId },
      data: { isActive: false },
    });
    revalidateShop(user.schoolId);
    return {
      success: true,
      message: "Categoria desativada (ainda possui itens vinculados).",
    };
  }

  await prisma.rewardCategory.delete({ where: { id: categoryId } });
  revalidateShop(user.schoolId);
  return { success: true };
}
