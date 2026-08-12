"use client";

import { useState, ReactNode } from "react";
import { ShoppingBag, Shirt, Settings } from "lucide-react";

export function ShopTabsContainer({
  isStudent,
  canManageShop,
  shopTabContent,
  inventoryTabContent,
  managerTabContent,
  redemptionsTabContent,
}: {
  isStudent: boolean;
  canManageShop: boolean;
  shopTabContent: ReactNode;
  inventoryTabContent?: ReactNode;
  managerTabContent?: ReactNode;
  redemptionsTabContent: ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<"shop" | "inventory" | "manage">("shop");

  return (
    <div className="space-y-6">
      {/* Navegação por Abas */}
      <div className="flex flex-wrap border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab("shop")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 font-semibold text-sm transition ${
            activeTab === "shop"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <ShoppingBag className="h-4 w-4" />
          Vitrine de Prêmios
        </button>

        {isStudent && inventoryTabContent && (
          <button
            type="button"
            onClick={() => setActiveTab("inventory")}
            className={`flex items-center gap-2 border-b-2 px-5 py-3 font-semibold text-sm transition ${
              activeTab === "inventory"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Shirt className="h-4 w-4" />
            Meu Inventário (Molduras & Fundos)
          </button>
        )}

        {canManageShop && managerTabContent && (
          <button
            type="button"
            onClick={() => setActiveTab("manage")}
            className={`flex items-center gap-2 border-b-2 px-5 py-3 font-semibold text-sm transition ${
              activeTab === "manage"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Settings className="h-4 w-4" />
            Gerenciador da Loja da Escola
          </button>
        )}
      </div>

      {/* Conteúdo da Aba Selecionada */}
      {activeTab === "shop" && (
        <div className="space-y-8">
          {shopTabContent}
          {redemptionsTabContent}
        </div>
      )}

      {activeTab === "inventory" && isStudent && inventoryTabContent && (
        <div>{inventoryTabContent}</div>
      )}

      {activeTab === "manage" && canManageShop && managerTabContent && (
        <div>{managerTabContent}</div>
      )}
    </div>
  );
}
