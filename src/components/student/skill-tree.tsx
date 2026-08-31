"use client";

import { useState, useTransition } from "react";
import {
  Shield,
  Coins,
  Clock,
  Swords,
  Sparkles,
  BookOpen,
  Lock,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TALENTS_CATALOG, type TalentDefinition } from "@/lib/talents-catalog";
import { unlockTalentAction } from "@/actions/talents";
import { playLevelUpSound } from "@/lib/sound-effects";
import { cn } from "@/lib/utils";

const ICONS_MAP = {
  Shield,
  Coins,
  Clock,
  Swords,
  Sparkles,
  BookOpen,
};

export function SkillTree({
  studentLevel = 1,
  unlockedKeys = [],
}: {
  studentLevel?: number;
  unlockedKeys?: string[];
}) {
  const [unlocked, setUnlocked] = useState<string[]>(unlockedKeys);
  const [selectedTalent, setSelectedTalent] = useState<TalentDefinition | null>(null);
  const [isPending, startTransition] = useTransition();

  // Total de pontos de talento = nível do aluno
  const totalTalentPoints = studentLevel;
  const spentPoints = TALENTS_CATALOG.filter((t) => unlocked.includes(t.key)).reduce(
    (s, t) => s + t.costPoints,
    0
  );
  const availablePoints = Math.max(0, totalTalentPoints - spentPoints);

  function handleUnlock(talent: TalentDefinition) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("talentKey", talent.key);
      const res = await unlockTalentAction(fd);
      if (res.success) {
        playLevelUpSound();
        setUnlocked((prev) => [...prev, talent.key]);
      }
    });
  }

  return (
    <Card className="overflow-hidden border-indigo-200 bg-gradient-to-br from-white via-indigo-50/20 to-purple-50/10 shadow-sm dark:border-indigo-950 dark:from-slate-900 dark:via-slate-900/60 dark:to-slate-950">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-amber-500 to-indigo-600 text-white shadow">
              <Zap className="h-4 w-4" />
            </span>
            <div>
              <CardTitle className="text-base font-bold">
                Árvore de Talentos & Passivas do Estudante
              </CardTitle>
              <p className="text-xs text-slate-500">
                Desbloqueie poderes e habilidades passivas exclusivas conforme sobe de nível
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-extrabold text-amber-900 dark:bg-amber-950 dark:text-amber-200">
              ⚡ {availablePoints} Ponto(s) Disponíveis
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TALENTS_CATALOG.map((t) => {
            const Icon = ICONS_MAP[t.iconName] ?? Sparkles;
            const isUnlocked = unlocked.includes(t.key);
            const canAfford = availablePoints >= t.costPoints;
            const meetsLevel = studentLevel >= t.minLevel;
            const meetsPrereq = !t.prerequisiteKey || unlocked.includes(t.prerequisiteKey);
            const canUnlock = !isUnlocked && canAfford && meetsLevel && meetsPrereq;

            return (
              <div
                key={t.key}
                onClick={() => setSelectedTalent(t)}
                className={cn(
                  "relative flex flex-col justify-between rounded-xl border p-3.5 shadow-sm transition-all cursor-pointer",
                  isUnlocked
                    ? "border-amber-300 bg-gradient-to-br from-amber-50/80 to-white shadow-amber-100/50 dark:border-amber-900 dark:from-amber-950/30 dark:to-slate-900"
                    : canUnlock
                      ? "border-indigo-300 bg-white hover:border-indigo-500 hover:shadow-md dark:border-indigo-900 dark:bg-slate-900"
                      : "border-slate-200 bg-slate-50/60 opacity-70 dark:border-slate-800 dark:bg-slate-900/40"
                )}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg shadow-sm",
                        isUnlocked
                          ? "bg-amber-500 text-white"
                          : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>

                    <Badge
                      variant={isUnlocked ? "success" : meetsLevel ? "secondary" : "default"}
                      className="text-[10px]"
                    >
                      {isUnlocked ? "Ativo" : `Nv. Mín: ${t.minLevel}`}
                    </Badge>
                  </div>

                  <h3 className="mt-2.5 text-xs font-bold text-slate-900 dark:text-white">
                    {t.name}
                  </h3>
                  <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2">
                    {t.description}
                  </p>
                  <p className="mt-2 text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                    ✨ {t.bonusText}
                  </p>
                </div>

                <div className="mt-3.5 border-t border-slate-100 pt-2.5 dark:border-slate-800">
                  {isUnlocked ? (
                    <span className="flex items-center justify-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Habilidade Desbloqueada
                    </span>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      disabled={!canUnlock || isPending}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnlock(t);
                      }}
                      className={cn(
                        "w-full h-7 text-xs font-bold gap-1",
                        canUnlock
                          ? "bg-gradient-to-r from-amber-500 to-indigo-600 text-white hover:from-amber-600 hover:to-indigo-700 shadow"
                          : "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                      )}
                    >
                      {meetsLevel ? (
                        <>Desbloquear ({t.costPoints} pt)</>
                      ) : (
                        <>
                          <Lock className="h-3 w-3" /> Requer Nv. {t.minLevel}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
