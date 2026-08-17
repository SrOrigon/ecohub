import Link from "next/link";
import { Coins, Gift } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateRewardForm, type ShopCategoryOption } from "@/components/forms/create-reward-form";
import { EditRewardForm } from "@/components/forms/edit-reward-form";
import { ToggleRewardButton } from "@/components/forms/toggle-reward-button";
import { DeleteRewardButton } from "@/components/forms/delete-reward-button";
import { AdjustRewardStockForm } from "@/components/forms/adjust-reward-stock-form";
import { EmptyState } from "@/components/ui/empty-state";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { InstitutionShopCategories, type RewardCategoryRow } from "@/components/shop/institution-shop-categories";
import { SeedCosmeticsButton } from "@/components/shop/seed-cosmetics-button";

type RewardRow = {
  id: string;
  name: string;
  description: string | null;
  coinCost: number;
  stock: number | null;
  isActive: boolean;
  itemType?: string;
  cosmeticKey?: string | null;
  categoryId: string | null;
  category: { id: string; name: string; isActive: boolean } | null;
  _count: { redemptions: number };
};

export function InstitutionShopManager({
  categories,
  rewards,
  compact = false,
}: {
  categories: RewardCategoryRow[];
  rewards: RewardRow[];
  compact?: boolean;
}) {
  const categoryOptions: ShopCategoryOption[] = categories.map((c) => ({
    id: c.id,
    name: c.name,
    isActive: c.isActive,
  }));
  const activeCount = rewards.filter((r) => r.isActive).length;

  return (
    <div className="space-y-6">
      <InstitutionShopCategories categories={categories} />

      <Card className={compact ? "" : "border-2 border-amber-200 bg-amber-50/30"}>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-amber-600" aria-hidden="true" />
              Itens da loja de moedas
            </CardTitle>
            <CardDescription className="mt-1 max-w-2xl">
              Depois de cadastrar, você pode alterar nome, preço e quantidade, desativar ou excluir o item da loja da escola.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <SeedCosmeticsButton />
            <CreateRewardForm categories={categoryOptions} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2 text-sm text-slate-600">
            <Badge variant="warning">{activeCount} item(ns) ativo(s)</Badge>
            <Badge variant="secondary">{rewards.length} no catálogo</Badge>
            {!compact && (
              <Link href="/dashboard/loja" className="text-indigo-600 hover:underline">
                Ver loja completa e resgates →
              </Link>
            )}
          </div>

          {rewards.length === 0 ? (
            <EmptyState
              icon={Coins}
              title="Nenhum item cadastrado"
              description="Crie categorias acima e depois adicione itens com preço em moedas."
              className="py-8"
            />
          ) : (
            <ResponsiveTable minWidth="40rem" className="rounded-xl border border-slate-200 bg-white">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-slate-500">
                  <th scope="col" className="px-4 py-3 font-medium">Prêmio</th>
                  <th scope="col" className="px-4 py-3 font-medium">Categoria</th>
                  <th scope="col" className="px-4 py-3 font-medium">Preço</th>
                  <th scope="col" className="px-4 py-3 font-medium">Estoque</th>
                  <th scope="col" className="px-4 py-3 font-medium">Resgates</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                  <th scope="col" className="px-4 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rewards.map((reward) => {
                  const outOfStock = reward.stock !== null && reward.stock <= 0;
                  return (
                    <tr key={reward.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{reward.name}</p>
                        {reward.description && (
                          <p className="mt-0.5 max-w-xs truncate text-xs text-slate-500">
                            {reward.description}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {reward.category ? (
                          <Badge variant="secondary">{reward.category.name}</Badge>
                        ) : (
                          <span className="text-slate-400">Sem categoria</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="warning">{reward.coinCost} moedas</Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {reward.stock === null ? "Ilimitado" : outOfStock ? "Esgotado" : reward.stock}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{reward._count.redemptions}</td>
                      <td className="px-4 py-3">
                        <Badge variant={reward.isActive ? "success" : "secondary"}>
                          {reward.isActive ? "Ativo" : "Inativo"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex min-w-[12rem] flex-col gap-2">
                          <div className="flex flex-wrap items-center gap-1">
                            <EditRewardForm reward={reward} categories={categoryOptions} />
                            <ToggleRewardButton rewardId={reward.id} isActive={reward.isActive} />
                            <DeleteRewardButton
                              rewardId={reward.id}
                              rewardName={reward.name}
                              hasRedemptions={reward._count.redemptions > 0}
                            />
                          </div>
                          <AdjustRewardStockForm key={`${reward.id}-${reward.stock}`} rewardId={reward.id} stock={reward.stock} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </ResponsiveTable>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
