"use client";

import { useState, useTransition } from "react";
import { Heart, Sparkles, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PARENT_STICKERS, sendParentEncouragementAction } from "@/actions/parent-encouragement";
import { playLevelUpSound } from "@/lib/sound-effects";
import { cn } from "@/lib/utils";

export function ParentEncouragementPanel({
  studentId,
  studentName,
}: {
  studentId: string;
  studentName: string;
}) {
  const [selectedSticker, setSelectedSticker] = useState(PARENT_STICKERS[0].id);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const firstName = studentName.split(" ")[0];

  function handleSend() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("studentId", studentId);
      fd.set("stickerId", selectedSticker);

      const result = await sendParentEncouragementAction(fd);
      if (result.success) {
        playLevelUpSound();
        setFeedback(`Mensagem de incentivo enviada para ${firstName}! ✨`);
        setTimeout(() => setFeedback(null), 4000);
      }
    });
  }

  return (
    <div className="rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50/70 via-white to-amber-50/50 p-4 shadow-sm backdrop-blur-sm dark:border-rose-950 dark:from-rose-950/30 dark:via-slate-900 dark:to-amber-950/20">
      <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
        <Heart className="h-5 w-5 fill-rose-500 text-rose-500 animate-pulse" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-rose-950 dark:text-rose-200">
          Incentivar e Celebrar {firstName}
        </h3>
      </div>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
        Envie uma figurinha de carinho e orgulho com 1 toque. Ela aparecerá com destaque no painel do seu filho!
      </p>

      {/* Stickers Row */}
      <div className="mt-3 flex flex-wrap gap-2">
        {PARENT_STICKERS.map((s) => {
          const isSelected = selectedSticker === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelectedSticker(s.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all hover:scale-105 active:scale-95",
                isSelected
                  ? "border-rose-300 bg-white text-rose-800 shadow-md ring-2 ring-rose-400/40 dark:border-rose-700 dark:bg-slate-800 dark:text-rose-200"
                  : "border-slate-200/80 bg-white/70 text-slate-700 hover:bg-white dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300"
              )}
            >
              <span className="text-lg select-none">{s.emoji}</span>
              <span>{s.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-rose-100/80 pt-3 dark:border-rose-950">
        {feedback ? (
          <p className="text-xs font-bold text-emerald-600 flex items-center gap-1 animate-bounce">
            <Sparkles className="h-3.5 w-3.5" />
            {feedback}
          </p>
        ) : (
          <p className="text-xs text-slate-500">
            Apoio familiar aumenta em 35% o engajamento escolar.
          </p>
        )}

        <Button
          type="button"
          size="sm"
          disabled={isPending}
          onClick={handleSend}
          className="gap-1.5 bg-gradient-to-r from-rose-500 to-amber-500 text-white hover:from-rose-600 hover:to-amber-600 shadow-sm"
        >
          <Send className="h-3.5 w-3.5" />
          {isPending ? "Enviando carinho..." : `Enviar para ${firstName}`}
        </Button>
      </div>
    </div>
  );
}
