"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FolderPlus, Loader2 } from "lucide-react";
import { seedDefaultShopCategoriesAction } from "@/actions/reward-categories";
import { runServerAction } from "@/lib/run-server-action";
import { Button } from "@/components/ui/button";

export function SeedShopCategoriesButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await runServerAction(async () => seedDefaultShopCategoriesAction());
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      if (result && "message" in result && result.message) {
        setMessage(result.message);
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button type="button" variant="outline" size="sm" onClick={handleClick} disabled={pending} className="gap-2">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderPlus className="h-4 w-4" />}
        Criar categorias iniciais
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {message && <p className="text-xs text-emerald-700">{message}</p>}
    </div>
  );
}
