/**
 * Catálogo da Loja Ecohub (plataforma).
 * Itens digitais oficiais — molduras e pets animados.
 * Slots vêm como "em desenvolvimento" até a arte ser publicada.
 */

export type EcohubShopKind = "frame" | "pet";
export type EcohubShopStatus = "coming_soon" | "ready";

export type EcohubShopItem = {
  key: string;
  kind: EcohubShopKind;
  name: string;
  description: string;
  status: EcohubShopStatus;
  /** Custo previsto; null enquanto o preço não estiver definido. */
  defaultCoinCost: number | null;
  accent: string;
};

export const ECOHUB_SHOP_FRAMES: EcohubShopItem[] = [
  {
    key: "ecohub-frame-01",
    kind: "frame",
    name: "Moldura Ecohub 01",
    description: "Espaço reservado. A arte desta moldura será publicada em breve.",
    status: "coming_soon",
    defaultCoinCost: null,
    accent: "from-indigo-200 to-violet-200",
  },
  {
    key: "ecohub-frame-02",
    kind: "frame",
    name: "Moldura Ecohub 02",
    description: "Espaço reservado. A arte desta moldura será publicada em breve.",
    status: "coming_soon",
    defaultCoinCost: null,
    accent: "from-sky-200 to-indigo-200",
  },
  {
    key: "ecohub-frame-03",
    kind: "frame",
    name: "Moldura Ecohub 03",
    description: "Espaço reservado. A arte desta moldura será publicada em breve.",
    status: "coming_soon",
    defaultCoinCost: null,
    accent: "from-amber-200 to-orange-200",
  },
  {
    key: "ecohub-frame-04",
    kind: "frame",
    name: "Moldura Ecohub 04",
    description: "Espaço reservado. A arte desta moldura será publicada em breve.",
    status: "coming_soon",
    defaultCoinCost: null,
    accent: "from-emerald-200 to-teal-200",
  },
];

export const ECOHUB_SHOP_PETS: EcohubShopItem[] = [
  {
    key: "ecohub-pet-01",
    kind: "pet",
    name: "Companheiro Ecohub 01",
    description: "Pet animado em desenvolvimento. Em breve você poderá resgatar e equipar.",
    status: "coming_soon",
    defaultCoinCost: null,
    accent: "from-rose-200 to-amber-200",
  },
  {
    key: "ecohub-pet-02",
    kind: "pet",
    name: "Companheiro Ecohub 02",
    description: "Pet animado em desenvolvimento. Em breve você poderá resgatar e equipar.",
    status: "coming_soon",
    defaultCoinCost: null,
    accent: "from-cyan-200 to-sky-200",
  },
  {
    key: "ecohub-pet-03",
    kind: "pet",
    name: "Companheiro Ecohub 03",
    description: "Pet animado em desenvolvimento. Em breve você poderá resgatar e equipar.",
    status: "coming_soon",
    defaultCoinCost: null,
    accent: "from-violet-200 to-fuchsia-200",
  },
  {
    key: "ecohub-pet-04",
    kind: "pet",
    name: "Companheiro Ecohub 04",
    description: "Pet animado em desenvolvimento. Em breve você poderá resgatar e equipar.",
    status: "coming_soon",
    defaultCoinCost: null,
    accent: "from-lime-200 to-emerald-200",
  },
];

export const ECOHUB_SHOP_ITEMS: EcohubShopItem[] = [
  ...ECOHUB_SHOP_FRAMES,
  ...ECOHUB_SHOP_PETS,
];

export function getEcohubShopItem(key: string | null | undefined): EcohubShopItem | undefined {
  if (!key) return undefined;
  return ECOHUB_SHOP_ITEMS.find((item) => item.key === key);
}

export const ECOHUB_SHOP_ITEM_TYPES = ["frame", "pet"] as const;
