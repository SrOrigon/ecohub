"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";

import { playQuestCompleteSound } from "@/lib/sound-effects";



const PET_CHARACTERS = {
  default: {
    name: "Eco-Coruja",
    emoji: "🦉",
    title: "Guardião do Conhecimento",
    tips: [
      "Cada atividade concluída te deixa mais perto do próximo nível!",
      "Sabia que revisar o boletim te ajuda a focar no que mais importa?",
      "Você está indo muito bem! Continue com a sua ofensiva!",
      "Dica de ouro: responda as provas com calma e atenção aos detalhes!",
    ],
  },
  "ecohub-pet-01": {
    name: "Foguinho",
    emoji: "🦊",
    title: "Mascote da Ofensiva",
    tips: [
      "Vamos manter essa chama acesa! Estudar todo dia faz a diferença!",
      "Completou a tarefa de hoje? Mais XP pra conta!",
      "Nossa ofensiva tá imparável hoje!",
    ],
  },
  "ecohub-pet-02": {
    name: "Aqua-Dragão",
    emoji: "🐉",
    title: "Dragão dos Desafios",
    tips: [
      "Desafios difíceis dão as maiores recompensas!",
      "Sua determinação é lendária!",
      "Rumo ao topo dos rankings da escola!",
    ],
  },
  "ecohub-pet-03": {
    name: "Eco-Bot",
    emoji: "🤖",
    title: "Assistente Lógico",
    tips: [
      "Processando dados: sua taxa de acerto está excelente!",
      "Algoritmo da vitória: foco + constância = sucesso!",
      "Sistemas operando em 100% de dedicação!",
    ],
  },
};

export function PetCompanion({
  equippedPetKey,
  studentName,
  level = 1,
  streak = 1,
}: {
  equippedPetKey?: string | null;
  studentName: string;
  level?: number;
  streak?: number;
}) {
  const pet = PET_CHARACTERS[(equippedPetKey as keyof typeof PET_CHARACTERS) ?? "default"] ?? PET_CHARACTERS.default;
  const [tipIndex, setTipIndex] = useState(0);


  function handlePetClick() {
    playQuestCompleteSound();
    setTipIndex((prev) => (prev + 1) % pet.tips.length);

  }

  const firstName = studentName.split(" ")[0];

  return (
    <div className="relative flex flex-col items-center sm:flex-row sm:items-start gap-4 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/90 via-white to-purple-50/50 p-4 shadow-sm backdrop-blur-sm transition-all hover:border-indigo-200 dark:border-indigo-950 dark:from-indigo-950/40 dark:via-slate-900/60 dark:to-purple-950/30">
      {/* Pet Avatar with gentle float animation */}
      <button
        type="button"
        onClick={handlePetClick}
        className="group relative flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 border-2 border-indigo-200/80 shadow-md transition-transform hover:scale-105 active:scale-95 dark:border-indigo-800"
        title="Clique no seu companheiro para receber uma dica!"
      >
        <span className="text-3xl sm:text-4xl animate-pet-float select-none">
          {pet.emoji}
        </span>
        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[10px] text-amber-950 font-bold shadow">
          ✨
        </span>
      </button>

      {/* Speech Bubble */}
      <div className="min-w-0 flex-1 text-center sm:text-left">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
            {pet.name} · {pet.title}
          </span>
          {streak > 1 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700 dark:bg-orange-950/60 dark:text-orange-300">
              🔥 {streak} dias juntos
            </span>
          )}
        </div>

        <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">
          Olá, <strong className="text-indigo-600 dark:text-indigo-400">{firstName}</strong>! {pet.tips[tipIndex]}
        </p>

        <div className="mt-2 flex items-center justify-center sm:justify-start gap-3 text-xs text-slate-500">
          <button
            type="button"
            onClick={handlePetClick}
            className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Ouvir outra dica
          </button>
          <span>·</span>
          <span>Nv. {level}</span>
        </div>
      </div>
    </div>
  );
}
