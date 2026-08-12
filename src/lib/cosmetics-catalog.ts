export type CosmeticItemDefinition = {
  key: string;
  name: string;
  description: string;
  itemType: "frame" | "background";
  defaultCoinCost: number;
  badgeLabel: string;
  previewGradient: string;
  cssClass?: string;
};

export const PRESET_FRAMES: CosmeticItemDefinition[] = [
  {
    key: "frame-gold",
    name: "Moldura Ouro Imperial",
    description: "Borda dourada radiante com acabamento nobre de campeão.",
    itemType: "frame",
    defaultCoinCost: 500,
    badgeLabel: "Lendário",
    previewGradient: "from-amber-400 via-yellow-300 to-amber-600",
  },
  {
    key: "frame-neon",
    name: "Moldura Cyber Neon",
    description: "Brilho elétrico futurista em tons neon violeta e ciano.",
    itemType: "frame",
    defaultCoinCost: 450,
    badgeLabel: "Épico",
    previewGradient: "from-fuchsia-500 via-purple-500 to-cyan-400",
  },
  {
    key: "frame-fire",
    name: "Moldura Fogo Lendário",
    description: "Efeito flamejante de chamas vibrantes em vermelho e laranja.",
    itemType: "frame",
    defaultCoinCost: 600,
    badgeLabel: "Lendário",
    previewGradient: "from-red-500 via-amber-500 to-orange-400",
  },
  {
    key: "frame-emerald",
    name: "Moldura Esmeralda Mística",
    description: "Gema esmeralda da sabedoria com brilho mágico de natureza.",
    itemType: "frame",
    defaultCoinCost: 400,
    badgeLabel: "Raro",
    previewGradient: "from-emerald-400 via-teal-300 to-emerald-600",
  },
  {
    key: "frame-galaxy",
    name: "Moldura Galáxia Estelar",
    description: "Brilho das estrelas e poeira cósmica ao redor do seu avatar.",
    itemType: "frame",
    defaultCoinCost: 550,
    badgeLabel: "Épico",
    previewGradient: "from-indigo-600 via-purple-500 to-pink-500",
  },
  {
    key: "frame-rainbow",
    name: "Moldura Arco-Íris Mágico",
    description: "Gradiente arco-íris vibrante, alegre e cheio de energia.",
    itemType: "frame",
    defaultCoinCost: 350,
    badgeLabel: "Raro",
    previewGradient: "from-rose-400 via-yellow-400 to-sky-400",
  },
  {
    key: "frame-diamond",
    name: "Moldura Diamante Mestre",
    description: "Cristais reluzentes de diamante com brilho prateado supremo.",
    itemType: "frame",
    defaultCoinCost: 750,
    badgeLabel: "Mítico",
    previewGradient: "from-slate-200 via-sky-200 to-indigo-300",
  },
];

export const PRESET_BACKGROUNDS: CosmeticItemDefinition[] = [
  {
    key: "bg-galaxy",
    name: "Nebulosa Cósmica",
    description: "Fundo espacial profundo repleto de constelações e nebulosas azuis.",
    itemType: "background",
    defaultCoinCost: 600,
    badgeLabel: "Épico",
    previewGradient: "from-slate-950 via-purple-950 to-indigo-900 text-white",
  },
  {
    key: "bg-sunset",
    name: "Pôr do Sol Dourado",
    description: "Céu acolhedor ao entardecer em dégradé rosa, laranja e amarelo.",
    itemType: "background",
    defaultCoinCost: 400,
    badgeLabel: "Raro",
    previewGradient: "from-amber-500 via-rose-500 to-purple-600 text-white",
  },
  {
    key: "bg-cyberpunk",
    name: "Matrix Cyberpunk",
    description: "Grid futurista com tons de magenta, azul e luzes neon.",
    itemType: "background",
    defaultCoinCost: 500,
    badgeLabel: "Épico",
    previewGradient: "from-zinc-950 via-slate-900 to-fuchsia-950 text-white",
  },
  {
    key: "bg-royalty",
    name: "Palácio Imperial",
    description: "Fundo de gala luxuoso em azul-marinho profundo e detalhes dourados.",
    itemType: "background",
    defaultCoinCost: 700,
    badgeLabel: "Mítico",
    previewGradient: "from-blue-950 via-indigo-900 to-amber-950 text-amber-100",
  },
  {
    key: "bg-emerald",
    name: "Aurora Esmeralda",
    description: "Gradiente vibrante de luzes da aurora boreal em verde e turquesa.",
    itemType: "background",
    defaultCoinCost: 450,
    badgeLabel: "Raro",
    previewGradient: "from-emerald-950 via-teal-900 to-cyan-900 text-white",
  },
  {
    key: "bg-rainbow",
    name: "Arco-Íris Entusiasmado",
    description: "Tema vivo e dinâmico com gradientes suaves e modernos.",
    itemType: "background",
    defaultCoinCost: 550,
    badgeLabel: "Épico",
    previewGradient: "from-purple-600 via-pink-500 to-amber-400 text-white",
  },
];

export const ALL_PRESET_COSMETICS = [...PRESET_FRAMES, ...PRESET_BACKGROUNDS];

export function getCosmeticDefinition(key?: string | null): CosmeticItemDefinition | null {
  if (!key) return null;
  return ALL_PRESET_COSMETICS.find((c) => c.key === key) ?? null;
}
