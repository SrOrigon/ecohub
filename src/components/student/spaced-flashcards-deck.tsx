"use client";

import { useState } from "react";
import { Brain, RotateCw, CheckCircle2, AlertCircle, XCircle, Sparkles, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SpeechSpeakButton } from "@/components/ui/speech-speak-button";
import {
  DEFAULT_FLASHCARDS,
  calculateNextReview,
  type FlashcardItem,
} from "@/lib/spaced-repetition";
import { playQuestCompleteSound, playLevelUpSound } from "@/lib/sound-effects";
import { cn } from "@/lib/utils";

export function SpacedFlashcardsDeck() {
  const [cards, setCards] = useState<FlashcardItem[]>(DEFAULT_FLASHCARDS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [completed, setCompleted] = useState(false);

  const currentCard = cards[currentIndex];

  function handleRate(performance: "easy" | "hard" | "forgot") {
    if (!currentCard) return;

    if (performance === "easy") {
      playQuestCompleteSound();
    }

    const { nextBox, nextDays } = calculateNextReview(currentCard.box, performance);

    const updated = [...cards];
    updated[currentIndex] = {
      ...currentCard,
      box: nextBox,
      nextReviewDays: nextDays,
      lastReviewedAt: new Date().toISOString(),
    };
    setCards(updated);

    setIsFlipped(false);
    if (currentIndex + 1 < cards.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      playLevelUpSound();
      setCompleted(true);
    }
  }

  function handleRestart() {
    setCurrentIndex(0);
    setIsFlipped(false);
    setCompleted(false);
  }

  return (
    <Card className="overflow-hidden border-indigo-200 bg-gradient-to-br from-white via-indigo-50/20 to-purple-50/10 shadow-sm dark:border-indigo-950 dark:from-slate-900 dark:via-slate-900/60 dark:to-slate-950">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
              <Brain className="h-4 w-4" />
            </span>
            <div>
              <CardTitle className="text-base font-bold">
                Revisão Inteligente com Flashcards (Spaced Repetition)
              </CardTitle>
              <p className="text-xs text-slate-500">
                Fixação de longo prazo com o algoritmo de repetição espaçada
              </p>
            </div>
          </div>
          <span className="flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <Layers className="h-3.5 w-3.5" />
            {completed ? "Concluído!" : `Card ${currentIndex + 1} de ${cards.length}`}
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        {completed ? (
          <div className="space-y-3 py-6 text-center">
            <Sparkles className="mx-auto h-10 w-10 text-amber-500 animate-bounce" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Sessão de Revisão Diária Concluída! 🎉
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
              Seus flashcards foram reposicionados nas caixas de memória de longo prazo. Volte amanhã para a próxima rodada!
            </p>
            <Button size="sm" onClick={handleRestart} className="mt-2">
              Revisar novamente
            </Button>
          </div>
        ) : (
          currentCard && (
            <div className="space-y-4">
              {/* Flashcard 3D Card */}
              <div
                onClick={() => setIsFlipped((prev) => !prev)}
                className="group relative flex min-h-[160px] cursor-pointer flex-col justify-between rounded-2xl border-2 border-indigo-200 bg-white p-5 shadow-sm transition-all hover:border-indigo-400 hover:shadow-md dark:border-indigo-900 dark:bg-slate-900"
              >
                <div>
                  <div className="flex items-center justify-between border-b pb-2 dark:border-slate-800">
                    <Badge variant="secondary" className="text-[10px]">
                      {currentCard.subject}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <SpeechSpeakButton
                        text={isFlipped ? currentCard.back : currentCard.front}
                        compact
                      />
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                        Caixa {currentCard.box} (Rev. {currentCard.nextReviewDays}d)
                      </span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      {isFlipped ? "💡 Resposta / Explicação:" : "❓ Pergunta:"}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                      {isFlipped ? currentCard.back : currentCard.front}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Toque no cartão para {isFlipped ? "ver a pergunta" : "virar e ver a resposta"}</span>
                  <RotateCw className="h-3.5 w-3.5 transition-transform group-hover:rotate-180" />
                </div>
              </div>

              {/* Action Buttons */}
              {isFlipped ? (
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRate("forgot")}
                    className="border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold dark:border-rose-900 dark:text-rose-300"
                  >
                    <XCircle className="mr-1.5 h-3.5 w-3.5" />
                    Não Lembrei (1d)
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRate("hard")}
                    className="border-amber-200 text-amber-700 hover:bg-amber-50 text-xs font-bold dark:border-amber-900 dark:text-amber-300"
                  >
                    <AlertCircle className="mr-1.5 h-3.5 w-3.5" />
                    Tive Dúvida
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleRate("easy")}
                    className="bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold"
                  >
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                    Lembrei Fácil (+dias)
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsFlipped(true)}
                  className="w-full text-xs font-bold"
                >
                  Revelar Resposta
                </Button>
              )}
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}
