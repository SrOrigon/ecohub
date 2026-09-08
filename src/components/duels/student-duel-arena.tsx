"use client";

import { useState, useTransition } from "react";
import { Swords, Trophy, Flame, Coins, Sparkles, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  createDuelChallengeAction,
  respondDuelChallengeAction,
  submitDuelAnswersAction,
  type DuelQuestion,
} from "@/actions/duels";
import { playLevelUpSound, playCoinSound } from "@/lib/sound-effects";
import { cn } from "@/lib/utils";

export type ClassmateOption = {
  id: string;
  name: string;
  level: number;
  coins: number;
  xpTotal: number;
};

export type ActiveDuelMatch = {
  id: string;
  challengerId: string;
  challengerName: string;
  challengedId: string;
  challengedName: string;
  betCoins: number;
  betXp: number;
  status: string;
  winnerId?: string | null;
  questionsJson: string;
};

export function StudentDuelArena({
  myStudentId,
  classmates = [],
  activeSession,
  pendingChallenges = [],
  myCoins = 0,
  myXp = 0,
}: {
  myStudentId: string;
  classmates: ClassmateOption[];
  activeSession?: { id: string; maxBetCoins: number; maxBetXp: number } | null;
  pendingChallenges?: ActiveDuelMatch[];
  myCoins?: number;
  myXp?: number;
}) {
  const [selectedPeerId, setSelectedPeerId] = useState(classmates[0]?.id ?? "");
  const [betCoins, setBetCoins] = useState(10);
  const [betXp, setBetXp] = useState(10);
  const [activeMatch, setActiveMatch] = useState<ActiveDuelMatch | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [resultState, setResultState] = useState<{ completed: boolean; score?: number; error?: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const isArenaOpen = !!activeSession;

  function handleCreateChallenge() {
    startTransition(async () => {
      setResultState(null);
      const fd = new FormData();
      fd.set("challengedStudentId", selectedPeerId);
      fd.set("betCoins", String(betCoins));
      fd.set("betXp", String(betXp));

      const res = await createDuelChallengeAction(fd);
      if (res.error) {
        setResultState({ completed: false, error: res.error });
      } else {
        setResultState({ completed: false, error: "Desafio enviado ao colega! Aguarde a resposta." });
      }
    });
  }

  function handleRespondChallenge(matchId: string, accept: boolean) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("matchId", matchId);
      fd.set("accept", String(accept));

      const res = await respondDuelChallengeAction(fd);
      if (res.success && accept) {
        const found = pendingChallenges.find((c) => c.id === matchId);
        if (found) {
          setActiveMatch(found);
          setAnswers({});
        }
      }
    });
  }

  function handleSelectAnswer(questionId: string, optionId: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  }

  function handleSubmitAnswers() {
    if (!activeMatch) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("matchId", activeMatch.id);
      fd.set("answers", JSON.stringify(answers));

      const res = await submitDuelAnswersAction(fd);
      if (res.success) {
        if (res.winnerId === myStudentId) {
          playLevelUpSound();
          playCoinSound();
        }
        setResultState({ completed: true, score: res.myScore });
      }
    });
  }

  const activeQuestions: DuelQuestion[] = activeMatch
    ? JSON.parse(activeMatch.questionsJson || "[]")
    : [];

  return (
    <Card className="overflow-hidden border-indigo-200 bg-gradient-to-br from-white via-indigo-50/20 to-purple-50/10 shadow-sm dark:border-indigo-950 dark:from-slate-900 dark:via-slate-900/60 dark:to-slate-950">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-amber-500 to-red-500 text-white shadow">
              <Swords className="h-4 w-4" />
            </span>
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                Arena de Duelos 1v1
              </CardTitle>
              <p className="text-xs text-slate-500">
                Desafie seus colegas em mini quizzes e ganhe moedas e XP!
              </p>
            </div>
          </div>
          <Badge variant={isArenaOpen ? "success" : "secondary"}>
            {isArenaOpen ? "Liberado pelo Professor" : "Aguardando Professor"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Desafios Pendentes Recebidos */}
        {pendingChallenges.length > 0 && (
          <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-900 dark:bg-amber-950/30">
            <p className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Desafio(s) de Duelo Recebidos:
            </p>
            {pendingChallenges.map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white p-2.5 shadow-sm dark:bg-slate-800"
              >
                <div className="text-xs">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {c.challengerName} quer duelar com você!
                  </p>
                  <p className="text-slate-500">
                    Aposta: <strong className="text-amber-600">{c.betCoins} moedas</strong> e{" "}
                    <strong className="text-indigo-600">{c.betXp} XP</strong>
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isPending}
                    onClick={() => handleRespondChallenge(c.id, false)}
                    className="h-7 text-xs"
                  >
                    Recusar
                  </Button>
                  <Button
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleRespondChallenge(c.id, true)}
                    className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    Aceitar Duelo!
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Em Duelo Ativo */}
        {activeMatch && !resultState?.completed && (
          <div className="space-y-4 rounded-xl border border-indigo-200 bg-white p-4 shadow-sm dark:border-indigo-900 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b pb-2 dark:border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                ⚔️ Duelo em Andamento (3 Perguntas)
              </span>
              <span className="text-xs font-semibold text-slate-500">
                Pote: {activeMatch.betCoins * 2} moedas · {activeMatch.betXp * 2} XP
              </span>
            </div>

            <div className="space-y-4">
              {activeQuestions.map((q, idx) => (
                <div key={q.id} className="space-y-2">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {idx + 1}. {q.statement}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {q.options.map((opt) => {
                      const isSelected = answers[q.id] === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleSelectAnswer(q.id, opt.id)}
                          className={cn(
                            "rounded-lg border p-2.5 text-left text-xs transition-all",
                            isSelected
                              ? "border-indigo-600 bg-indigo-50 font-bold text-indigo-900 ring-2 ring-indigo-500/30 dark:bg-indigo-950 dark:text-indigo-200"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
                          )}
                        >
                          {opt.text}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <Button
              type="button"
              disabled={isPending || Object.keys(answers).length < activeQuestions.length}
              onClick={handleSubmitAnswers}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow"
            >
              {isPending ? "Processando respostas..." : "Confirmar Respostas do Duelo"}
            </Button>
          </div>
        )}

        {/* Resultado do Duelo */}
        {resultState?.completed && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-center dark:border-emerald-900 dark:bg-emerald-950/40">
            <Trophy className="mx-auto h-8 w-8 text-amber-500 animate-bounce" />
            <h3 className="mt-2 text-sm font-bold text-emerald-900 dark:text-emerald-200">
              Duelo Concluído!
            </h3>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              Você acertou {resultState.score} de 3 questões. Os prêmios do pote foram transferidos!
            </p>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setActiveMatch(null);
                setResultState(null);
              }}
              className="mt-3 bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Voltar para a Arena
            </Button>
          </div>
        )}

        {/* Criar Novo Desafio */}
        {!activeMatch && (
          <div className="space-y-3">
            {!isArenaOpen ? (
              <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  A Arena de Duelos está pausada. Peça ao seu professor para liberar a sessão durante a aula para apostar!
                </span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Escolher Colega
                    </label>
                    <select
                      value={selectedPeerId}
                      onChange={(e) => setSelectedPeerId(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      {classmates.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} (Nv. {c.level})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Moedas Apostadas (Máx: {activeSession.maxBetCoins})
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={Math.min(myCoins, activeSession.maxBetCoins)}
                      value={betCoins}
                      onChange={(e) => {
                        const next = Number.parseInt(e.target.value, 10);
                        const cap = Math.min(myCoins, activeSession.maxBetCoins);
                        setBetCoins(Number.isFinite(next) ? Math.min(cap, Math.max(0, next)) : 0);
                      }}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      XP Apostado (Máx: {activeSession.maxBetXp})
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={Math.min(myXp, activeSession.maxBetXp)}
                      value={betXp}
                      onChange={(e) => setBetXp(Number(e.target.value))}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                {resultState?.error && (
                  <p className="text-xs font-semibold text-amber-600">
                    {resultState.error}
                  </p>
                )}

                <Button
                  type="button"
                  disabled={isPending || !selectedPeerId}
                  onClick={handleCreateChallenge}
                  className="w-full min-h-[44px] gap-2 bg-gradient-to-r from-red-600 via-amber-600 to-indigo-600 font-bold text-white shadow hover:opacity-95"
                >
                  <Swords className="h-4 w-4" />
                  {isPending ? "Enviando desafio..." : "Desafiar Colega para Duelo 1v1!"}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
