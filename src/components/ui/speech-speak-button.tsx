"use client";

import { useEffect, useState } from "react";
import { Volume2, Square } from "lucide-react";
import { speakText, stopSpeaking } from "@/lib/speech-synthesis";
import { cn } from "@/lib/utils";

export function SpeechSpeakButton({
  text,
  className,
  label = "Ouvir enunciado",
  compact = false,
}: {
  text: string;
  className?: string;
  label?: string;
  compact?: boolean;
}) {
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  function handleToggle() {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
    } else {
      setSpeaking(true);
      speakText(text, () => setSpeaking(false));
    }
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border text-xs font-semibold transition-all",
        speaking
          ? "border-rose-300 bg-rose-50 text-rose-700 ring-2 ring-rose-300/40 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300"
          : "border-slate-200 bg-slate-50/80 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300",
        compact ? "p-1.5" : "px-2.5 py-1",
        className
      )}
      title={speaking ? "Parar leitura por voz" : "Ouvir em áudio"}
      aria-label={speaking ? "Parar leitura por voz" : label}
    >
      {speaking ? (
        <>
          <Square className="h-3.5 w-3.5 fill-current animate-pulse text-rose-600" />
          {!compact && <span>Parar áudio</span>}
        </>
      ) : (
        <>
          <Volume2 className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
          {!compact && <span>{label}</span>}
        </>
      )}
    </button>
  );
}
