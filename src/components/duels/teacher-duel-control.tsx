"use client";

import { useState, useTransition } from "react";
import { Swords, ShieldAlert, CheckCircle2, Lock, Unlock, Users, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { startTeacherDuelSessionAction, closeTeacherDuelSessionAction, updateTeacherDuelSessionLimitsAction } from "@/actions/duels";

export type TeacherDuelClass = {
  id: string;
  name: string;
  studentCount: number;
};

export type ActiveDuelSessionInfo = {
  id: string;
  classId: string;
  isActive: boolean;
  maxBetCoins: number;
  maxBetXp: number;
};

export function TeacherDuelControl({
  classes = [],
  activeSession,
}: {
  classes: TeacherDuelClass[];
  activeSession?: ActiveDuelSessionInfo | null;
}) {
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id ?? "");
  const [maxBetCoins, setMaxBetCoins] = useState(activeSession?.maxBetCoins ?? 30);
  const [maxBetXp, setMaxBetXp] = useState(activeSession?.maxBetXp ?? 30);
  const [limitMessage, setLimitMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isArenaActive = !!activeSession?.isActive;

  function handleToggleSession() {
    startTransition(async () => {
      if (isArenaActive && activeSession) {
        const fd = new FormData();
        fd.set("sessionId", activeSession.id);
        await closeTeacherDuelSessionAction(fd);
      } else {
        const fd = new FormData();
        fd.set("classId", selectedClassId);
        fd.set("maxBetCoins", String(maxBetCoins));
        fd.set("maxBetXp", String(maxBetXp));
        await startTeacherDuelSessionAction(fd);
      }
    });
  }

  function handleUpdateLimits() {
    if (!activeSession) return;
    startTransition(async () => {
      setLimitMessage(null);
      const fd = new FormData();
      fd.set("sessionId", activeSession.id);
      fd.set("maxBetCoins", String(maxBetCoins));
      fd.set("maxBetXp", String(maxBetXp));
      const res = await updateTeacherDuelSessionLimitsAction(fd);
      setLimitMessage(res.error ?? "Limites de aposta atualizados.");
    });
  }

  return (
    <Card className="overflow-hidden border-indigo-200 bg-gradient-to-br from-white via-indigo-50/20 to-white dark:border-indigo-950 dark:from-slate-900 dark:via-slate-900/60 dark:to-slate-950">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
              <Swords className="h-4 w-4" />
            </span>
            <div>
              <CardTitle className="text-base font-bold">
                Arena de Duelos 1v1 da Turma (Pedagógico)
              </CardTitle>
              <p className="text-xs text-slate-500">
                Autorize e monitore duelos de perguntas e respostas com apostas controladas de moedas/XP
              </p>
            </div>
          </div>
          <Badge variant={isArenaActive ? "success" : "secondary"}>
            {isArenaActive ? "Arena Aberta em Aula" : "Arena Bloqueada"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Turma da Sessão
            </label>
            <select
              value={selectedClassId}
              disabled={isArenaActive || isPending}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.studentCount} alunos)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Aposta Máxima de Moedas
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={maxBetCoins}
              disabled={isPending}
              onChange={(e) => setMaxBetCoins(Math.min(100, Math.max(0, Number.parseInt(e.target.value, 10) || 0)))}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Aposta Máxima de XP
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={maxBetXp}
              disabled={isPending}
              onChange={(e) => setMaxBetXp(Math.min(100, Math.max(0, Number.parseInt(e.target.value, 10) || 0)))}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>

        {isArenaActive && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={handleUpdateLimits}
            >
              Salvar limites de moedas/XP
            </Button>
            {limitMessage && (
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300">{limitMessage}</p>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 text-xs dark:border-indigo-950 dark:bg-indigo-950/30">
          <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200">
            <ShieldAlert className="h-4 w-4 text-indigo-600 shrink-0" />
            <span>
              {isArenaActive
                ? "Os alunos desta turma podem desafiar colegas durante esta aula respeitando os limites."
                : "Quando desativada, nenhum aluno consegue criar desafios ou apostar moedas/XP fora de sala."}
            </span>
          </div>

          <Button
            type="button"
            size="sm"
            disabled={isPending}
            onClick={handleToggleSession}
            className={
              isArenaActive
                ? "bg-rose-600 hover:bg-rose-700 text-white"
                : "bg-indigo-600 hover:bg-indigo-700 text-white"
            }
          >
            {isArenaActive ? (
              <>
                <Lock className="mr-1.5 h-3.5 w-3.5" />
                {isPending ? "Encerrando..." : "Encerrar Arena de Duelos"}
              </>
            ) : (
              <>
                <Unlock className="mr-1.5 h-3.5 w-3.5" />
                {isPending ? "Liberando..." : "Liberar Duelos em Aula"}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
