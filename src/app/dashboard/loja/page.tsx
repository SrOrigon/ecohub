import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getRewardsForSchool, getStudentRedemptions } from "@/actions/rewards";
import { getRewardCategoriesForSchool } from "@/actions/reward-categories";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateRewardForm } from "@/components/forms/create-reward-form";
import { InstitutionShopManager } from "@/components/shop/institution-shop-manager";
import { StudentShopByCategory } from "@/components/shop/student-shop-by-category";
import { StudentInventory } from "@/components/shop/student-inventory";
import { ShopTabsContainer } from "@/components/shop/shop-tabs-container";
import { EcohubShopPanel } from "@/components/shop/ecohub-shop-panel";
import { PageHeader } from "@/components/layout/page-header";
import { FulfillRedemptionButton } from "@/components/forms/fulfill-redemption-button";
import { redirect } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { isKidFriendlyRole } from "@/lib/constants";
import { getSchoolSettings } from "@/lib/school-settings";
import { hasPermission } from "@/lib/permissions";

export default async function LojaPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const isAdmin = user.role === "admin" || user.role === "director";
  const canManageShop = isAdmin;
  const settings = await getSchoolSettings(user.schoolId);
  const isStaff =
    isAdmin || (user.role === "teacher" && settings.shop.teachersCanFulfill);
  const isStudent = user.role === "student";
  const canRedeem =
    !isStudent || hasPermission(user.role, settings, "student.redeemShop");
  const kidFriendly = isKidFriendlyRole(user.role);

  let student = null;
  if (isStudent) {
    if (!canRedeem) redirect("/dashboard/aluno");
    student = await prisma.student.findFirst({ where: { userId: user.id } });
    if (!student) redirect("/dashboard/aluno");
  }

  const [rewards, categories] = await Promise.all([
    getRewardsForSchool(user.schoolId),
    getRewardCategoriesForSchool(user.schoolId),
  ]);

  const categoryOptions = categories.map((c) => ({
    id: c.id,
    name: c.name,
    isActive: c.isActive,
  }));

  const redemptions = student
    ? await getStudentRedemptions(student.id)
    : isStaff
      ? await prisma.rewardRedemption.findMany({
          where: { student: { user: { schoolId: user.schoolId } } },
          include: {
            student: { include: { user: { select: { fullName: true } } } },
            reward: true,
          },
          orderBy: { redeemedAt: "desc" },
          take: 30,
        })
      : [];

  const pendingCount = isStaff
    ? redemptions.filter((r) => r.status === "pending").length
    : 0;

  const redemptionsSection = (
    <Card className={kidFriendly ? "kid-card" : ""}>
      <CardHeader>
        <CardTitle className={kidFriendly ? "text-xl" : undefined}>
          {isStudent ? "Meus resgates e compras" : "Resgates recentes"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {redemptions.length === 0 ? (
          <p className={kidFriendly ? "text-lg text-slate-600" : "text-sm text-slate-500"}>
            Nenhum resgate ainda.
          </p>
        ) : (
          <ul className="space-y-3">
            {redemptions.map((r) => (
              <li
                key={r.id}
                className={`flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 py-3 ${kidFriendly ? "text-base" : "text-sm"}`}
              >
                <span>
                  {!isStudent && "student" in r && (
                    <strong>
                      {(r as { student: { user: { fullName: string } } }).student.user.fullName}:{" "}
                    </strong>
                  )}
                  {r.reward.name}
                  <Badge
                    variant={r.status === "fulfilled" ? "success" : "warning"}
                    className="ml-2"
                  >
                    {r.status === "fulfilled" ? "Concluído" : "Aguardando entrega"}
                  </Badge>
                </span>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-slate-600">
                    -{r.coinCost} moedas · {formatDate(r.redeemedAt)}
                  </span>
                  {isStaff && r.status === "pending" && (
                    <FulfillRedemptionButton redemptionId={r.id} />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Loja de Moedas & Cosméticos"
        description={
          isStudent
            ? `Você tem ${student?.coins ?? 0} moedas. Prêmios da escola na vitrine; molduras e pets oficiais na Loja Ecohub.`
            : canManageShop
              ? "Edite quantidade, preço e itens já cadastrados na aba Gerenciador. A Loja Ecohub (molduras e pets) continua em desenvolvimento."
              : pendingCount > 0
                ? `${pendingCount} resgate(s) aguardando entrega`
                : "Prêmios e cosméticos disponíveis para resgate com moedas"
        }
      >
        {canManageShop && !isStudent && (
          <CreateRewardForm categories={categoryOptions} />
        )}
      </PageHeader>

      {isStudent && student && (
        <Card className="kid-card border-amber-300 bg-amber-50">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 py-6">
            <span className="text-lg font-bold text-amber-900">Suas moedas acumuladas</span>
            <span className="kid-stat text-amber-600" aria-label={`${student.coins} moedas disponíveis`}>
              🪙 {student.coins} moedas
            </span>
          </CardContent>
        </Card>
      )}

      <ShopTabsContainer
        isStudent={isStudent}
        canManageShop={canManageShop}
        shopTabContent={
          <section aria-labelledby="rewards-heading">
            <h2 id="rewards-heading" className="sr-only">
              Prêmios por categoria
            </h2>
            <StudentShopByCategory
              rewards={rewards}
              categories={categories}
              student={student}
              role={user.role}
              preview={!isStudent && !canManageShop}
              canRedeem={canRedeem}
              canManage={canManageShop}
            />
          </section>
        }
        ecohubTabContent={<EcohubShopPanel />}
        inventoryTabContent={
          student ? (
            <StudentInventory
              student={{
                id: student.id,
                equippedFrame: student.equippedFrame,
                equippedBackground: student.equippedBackground,
              }}
              userFullName={user.fullName}
              avatarUrl={user.avatarUrl}
              redemptions={redemptions.map((r) => ({
                id: r.id,
                reward: {
                  id: r.reward.id,
                  name: r.reward.name,
                  description: r.reward.description,
                  itemType: r.reward.itemType ?? "physical",
                  cosmeticKey: r.reward.cosmeticKey ?? null,
                },
              }))}
            />
          ) : null
        }
        managerTabContent={
          canManageShop ? (
            <InstitutionShopManager categories={categories} rewards={rewards} />
          ) : null
        }
        redemptionsTabContent={redemptionsSection}
      />
    </div>
  );
}
