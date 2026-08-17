"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CosmeticPetPlaceholder } from "@/components/cosmetics/cosmetic-pet";
import {
  ECOHUB_SHOP_FRAMES,
  ECOHUB_SHOP_PETS,
  type EcohubShopItem,
  type EcohubShopKind,
} from "@/lib/ecohub-shop-catalog";
import { Frame, PawPrint, Sparkles } from "lucide-react";

function ComingSoonCard({ item }: { item: EcohubShopItem }) {
  const isPet = item.kind === "pet";

  return (
    <Card className="overflow-hidden opacity-95">
      {isPet ? (
        <CosmeticPetPlaceholder accent={item.accent} label={item.name} />
      ) : (
        <div
          className={`flex h-28 items-center justify-center bg-gradient-to-br ${item.accent}`}
          aria-hidden="true"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-dashed border-white/80 bg-white/40">
            <Frame className="h-7 w-7 text-slate-500" />
          </div>
        </div>
      )}
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{item.name}</CardTitle>
          <Badge variant="warning" className="shrink-0 text-xs">
            Em breve
          </Badge>
        </div>
        <CardDescription>{item.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-xs font-medium text-slate-500">
          {item.defaultCoinCost != null
            ? `Previsão: ${item.defaultCoinCost} moedas`
            : "Preço e resgate serão definidos na publicação"}
        </p>
      </CardContent>
    </Card>
  );
}

export function EcohubShopPanel() {
  const [filter, setFilter] = useState<"all" | EcohubShopKind>("all");

  const items =
    filter === "all"
      ? [...ECOHUB_SHOP_FRAMES, ...ECOHUB_SHOP_PETS]
      : filter === "frame"
        ? ECOHUB_SHOP_FRAMES
        : ECOHUB_SHOP_PETS;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-indigo-200 bg-indigo-50/80 px-4 py-3 text-sm text-indigo-950 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-100">
        <p className="flex items-center gap-2 font-semibold">
          <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
          Loja Ecohub — em desenvolvimento
        </p>
        <p className="mt-1 text-xs leading-relaxed text-indigo-800 dark:text-indigo-200">
          Catálogo oficial de molduras e pets animados. Os espaços abaixo já estão reservados no
          sistema; as artes, preços e o resgate com moedas entram quando cada item for publicado.
          A loja da escola (prêmios físicos) continua na aba Vitrine de Prêmios.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
            filter === "all"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Todos ({ECOHUB_SHOP_FRAMES.length + ECOHUB_SHOP_PETS.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter("frame")}
          className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition ${
            filter === "frame"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          <Frame className="h-4 w-4" aria-hidden="true" />
          Molduras ({ECOHUB_SHOP_FRAMES.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter("pet")}
          className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition ${
            filter === "pet"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          <PawPrint className="h-4 w-4" aria-hidden="true" />
          Pets animados ({ECOHUB_SHOP_PETS.length})
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <ComingSoonCard key={item.key} item={item} />
        ))}
      </div>
    </div>
  );
}
