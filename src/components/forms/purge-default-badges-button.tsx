"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { purgeDefaultBadgesAction } from "@/actions/crud";
import { Button } from "@/components/ui/button";

export function PurgeDefaultBadgesButton() {
  const [isPending, startTransition] = useTransition();

  function handlePurge() {
    if (!confirm("Deseja realmente expurgar as atitudes/badges padrão de exemplo? As atitudes criadas manualmente serão mantidas.")) {
      return;
    }
    startTransition(async () => {
      const res = await purgeDefaultBadgesAction();
      if (res && "error" in res && res.error) {
        alert(res.error);
      } else if (res && "message" in res && res.message) {
        alert(res.message);
      }
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handlePurge}
      disabled={isPending}
      className="text-slate-600 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
    >
      <Trash2 className="mr-1.5 h-4 w-4" />
      {isPending ? "Expurgando..." : "Limpar atitudes padrão"}
    </Button>
  );
}
