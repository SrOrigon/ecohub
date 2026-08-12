"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RedeemRewardButton } from "@/components/forms/redeem-reward-button";
import { CosmeticFrame } from "@/components/cosmetics/cosmetic-frame";
import { CosmeticBackgroundCard } from "@/components/cosmetics/cosmetic-background";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { getCosmeticDefinition } from "@/lib/cosmetics-catalog";
import { isKidFriendlyRole } from "@/lib/constants";
import type { UserRole } from "@/lib/constants";
import { Sparkles, Gift, Frame, Palette } from "lucide-react";

type RewardItem = {
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
};

type CategoryItem = {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
};

function RewardCard({
  reward,
  student,
  kidFriendly,
  canRedeem,
}: {
  reward: RewardItem;
  student: { id: string; coins: number };
  kidFriendly: boolean;
  canRedeem: boolean;
}) {
  const outOfStock = reward.stock !== null && reward.stock <= 0;
  const canAfford = student.coins >= reward.coinCost;
  const cosmeticDef = getCosmeticDefinition(reward.cosmeticKey);

  const isFrame = reward.itemType === "frame";
  const isBackground = reward.itemType === "background";

  return (
    <Card className={`overflow-hidden transition-all hover:shadow-md ${kidFriendly ? "kid-card" : ""} ${!reward.isActive ? "opacity-60" : ""}`}>
      {/* Prévia Visual do Cosmético se for Moldura ou Fundo */}
      {isFrame && reward.cosmeticKey && (
        <div className="flex items-center justify-center bg-slate-100/80 py-6 border-b border-slate-100">
          <CosmeticFrame frameKey={reward.cosmeticKey} size="xl">
            <ProfileAvatar name="Demo Aluno" size="xl" />
          </CosmeticFrame>
        </div>
      )}

      {isBackground && reward.cosmeticKey && (
        <CosmeticBackgroundCard backgroundKey={reward.cosmeticKey} className="p-6 text-center border-b rounded-none">
          <Sparkles className="mx-auto h-6 w-6 text-amber-300 mb-1" />
          <span className="font-bold text-sm">Plano de Fundo</span>
        </CosmeticBackgroundCard>
      )}

      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className={kidFriendly ? "text-xl" : "text-base"}>{reward.name}</CardTitle>
          {cosmeticDef?.badgeLabel && (
            <Badge variant="secondary" className="shrink-0 text-xs">
              {cosmeticDef.badgeLabel}
            </Badge>
          )}
        </div>
        <CardDescription className={kidFriendly ? "text-base" : undefined}>
          {reward.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="warning" className={kidFriendly ? "px-3 py-1 text-base" : undefined}>
            {reward.coinCost} moedas
          </Badge>
          {reward.itemType && reward.itemType !== "physical" ? (
            <Badge variant="secondary" className="gap-1">
              {isFrame ? <Frame className="h-3 w-3" /> : <Palette className="h-3 w-3" />}
              {isFrame ? "Moldura" : "Plano de Fundo"}
            </Badge>
          ) : (
            reward.stock !== null && (
              <Badge variant={outOfStock ? "danger" : "secondary"}>
                {outOfStock ? "Esgotado" : `${reward.stock} disponíveis`}
              </Badge>
            )
          )}
        </div>
        {reward.isActive && canRedeem && (
          <RedeemRewardButton
            rewardId={reward.id}
            studentId={student.id}
            coinCost={reward.coinCost}
            canAfford={canAfford}
            outOfStock={outOfStock}
            rewardName={reward.name}
          />
        )}
      </CardContent>
    </Card>
  );
}

export function StudentShopByCategory({
  rewards,
  categories,
  student,
  role,
  preview = false,
  canRedeem = true,
}: {
  rewards: RewardItem[];
  categories: CategoryItem[];
  student?: { id: string; coins: number } | null;
  role: UserRole;
  preview?: boolean;
  canRedeem?: boolean;
}) {
  const [filterType, setFilterType] = useState<"all" | "frames" | "backgrounds" | "physical">("all");
  const kidFriendly = isKidFriendlyRole(role);

  const visibleRewards = preview
    ? rewards.filter((r) => r.isActive)
    : rewards.filter((r) => r.isActive && (r.category?.isActive !== false));

  const filteredRewards = visibleRewards.filter((r) => {
    if (filterType === "frames") return r.itemType === "frame";
    if (filterType === "backgrounds") return r.itemType === "background";
    if (filterType === "physical") return !r.itemType || r.itemType === "physical";
    return true;
  });

  const framesCount = visibleRewards.filter((r) => r.itemType === "frame").length;
  const bgCount = visibleRewards.filter((r) => r.itemType === "background").length;
  const physicalCount = visibleRewards.filter((r) => !r.itemType || r.itemType === "physical").length;

  if (visibleRewards.length === 0) {
    return (
      <Card className="kid-card">
        <CardContent className="py-10 text-center text-lg text-slate-600">
          Nenhum prêmio disponível no momento.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Abas de Filtros por Tipo de Item */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setFilterType("all")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
            filterType === "all"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Todos os Itens ({visibleRewards.length})
        </button>
        {framesCount > 0 && (
          <button
            type="button"
            onClick={() => setFilterType("frames")}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              filterType === "frames"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <Frame className="h-4 w-4" />
            Molduras de Avatar ({framesCount})
          </button>
        )}
        {bgCount > 0 && (
          <button
            type="button"
            onClick={() => setFilterType("backgrounds")}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              filterType === "backgrounds"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <Palette className="h-4 w-4" />
            Planos de Fundo ({bgCount})
          </button>
        )}
        {physicalCount > 0 && (
          <button
            type="button"
            onClick={() => setFilterType("physical")}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              filterType === "physical"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <Gift className="h-4 w-4" />
            Prêmios Físicos / Escola ({physicalCount})
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredRewards.map((reward) =>
          student && !preview ? (
            <RewardCard
              key={reward.id}
              reward={reward}
              student={student}
              kidFriendly={kidFriendly}
              canRedeem={canRedeem}
            />
          ) : (
            <Card key={reward.id} className={kidFriendly ? "kid-card" : ""}>
              <CardHeader>
                <CardTitle className={kidFriendly ? "text-xl" : "text-base"}>{reward.name}</CardTitle>
                <CardDescription>{reward.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Badge variant="warning">{reward.coinCost} moedas</Badge>
              </CardContent>
            </Card>
          )
        )}
      </div>
    </div>
  );
}
