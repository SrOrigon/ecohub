"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Play, Pause, RotateCcw, CloudRain, CheckCircle2, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { completeFocusSessionAction } from "@/actions/focus-session";
import { playLevelUpSound } from "@/lib/sound-effects";
import { cn } from "@/lib/utils";

const FOCUS_TIME_SECONDS = 25 * 60;

export function FocusTimer() {
  const [timeLeft, setTimeLeft] = useState(FOCUS_TIME_SECONDS);
  const [isRunning, setIsRunning] = useState(false);
  const [ambientAudio, setAmbientAudio] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [, startTransition] = useTransition();

  const audioContextRef = useRef<AudioContext | null>(null);
  const completingRef = useRef(false);

  const completeSession = useCallback(() => {
    if (completingRef.current) return;
    completingRef.current = true;
    setIsRunning(false);
    startTransition(async () => {
      playLevelUpSound();
      setCompleted(true);
      await completeFocusSessionAction();
    });
  }, [startTransition]);

  useEffect(() => {
    if (!isRunning) return;
    const id = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(id);
          completeSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [isRunning, completeSession]);

  useEffect(() => {
    if (ambientAudio && isRunning) {
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        audioContextRef.current = ctx;

        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let b0 = 0;
        let b1 = 0;
        let b2 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.969 * b2 + white * 0.153852;
          output[i] = (b0 + b1 + b2) * 0.06;
        }

        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 800;

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.12, ctx.currentTime);

        whiteNoise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);

        whiteNoise.start(0);
      } catch {
        // AudioContext blocked
      }
    } else if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
  }, [ambientAudio, isRunning]);

  function handleReset() {
    completingRef.current = false;
    setIsRunning(false);
    setTimeLeft(FOCUS_TIME_SECONDS);
    setCompleted(false);
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  const progressPercent = Math.round(((FOCUS_TIME_SECONDS - timeLeft) / FOCUS_TIME_SECONDS) * 100);

  return (
    <Card className="overflow-hidden border-indigo-100 bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/40 shadow-sm dark:border-indigo-950 dark:from-slate-900 dark:via-slate-900/60 dark:to-purple-950/20">
      <CardHeader className="pb-2 flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
            <Clock className="h-4 w-4" />
          </span>
          <div>
            <CardTitle className="text-sm font-bold">Modo Foco & Pomodoro</CardTitle>
            <p className="text-[11px] text-slate-500">25 minutos de estudo concentrado (+50 XP)</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setAmbientAudio((prev) => !prev)}
          className={cn(
            "flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors",
            ambientAudio
              ? "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400"
          )}
          title={ambientAudio ? "Desativar som de chuva ambiente" : "Ativar som de chuva relaxante para foco"}
        >
          <CloudRain className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>{ambientAudio ? "Chuva Lo-Fi Ativa" : "Som Ambiente"}</span>
        </button>
      </CardHeader>

      <CardContent className="p-4 text-center">
        {completed ? (
          <div className="space-y-2 py-2">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500 animate-bounce" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Parabéns! Sessão de Foco Concluída! 🎉
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Você ganhou <strong className="text-amber-600 dark:text-amber-400">+50 XP</strong> pela sua dedicação hoje!
            </p>
            <Button size="sm" onClick={handleReset} className="mt-2">
              Começar outra sessão
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative mx-auto flex h-28 w-28 items-center justify-center rounded-full border-4 border-indigo-100 bg-white shadow-inner dark:border-indigo-950 dark:bg-slate-900">
              <span className="font-mono text-2xl font-extrabold tracking-wider text-slate-900 dark:text-white">
                {formattedTime}
              </span>
            </div>

            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800 shimmer-bar">
              <div
                className="h-full rounded-full bg-indigo-600 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => setIsRunning((prev) => !prev)}
                className={cn(
                  "gap-1.5 text-xs font-bold text-white shadow",
                  isRunning ? "bg-amber-600 hover:bg-amber-700" : "bg-indigo-600 hover:bg-indigo-700"
                )}
              >
                {isRunning ? (
                  <>
                    <Pause className="h-3.5 w-3.5" /> Pausar Foco
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5" /> Iniciar Foco (25m)
                  </>
                )}
              </Button>

              <Button type="button" variant="outline" size="sm" onClick={handleReset} className="h-8 text-xs">
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
