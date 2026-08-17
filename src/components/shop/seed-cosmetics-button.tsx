"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { seedPresetCosmeticsForSchoolAction } from "@/actions/rewards";
import { runServerAction } from "@/lib/run-server-action";
import { Sparkles, Loader2 } from "lucide-react";

export function SeedCosmeticsButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const handleSeed = () => {
    startTransition(async () => {
      const res = await runServerAction(async () => seedPresetCosmeticsForSchoolAction());
      if (res && "error" in res && res.error) {
        setMessage(res.error);
      } else if (res && "message" in res && res.message) {
        setMessage(res.message);
      }
      router.refresh();
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        type="button"
        variant="outline"
        onClick={handleSeed}
        disabled={isPending}
        className="gap-2 border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
        ) : (
          <Sparkles className="h-4 w-4 text-indigo-600" />
        )}
        Importar Molduras e Fundos Pré-definidos
      </Button>
      {message && <span className="text-xs font-medium text-emerald-700">{message}</span>}
    </div>
  );
}
