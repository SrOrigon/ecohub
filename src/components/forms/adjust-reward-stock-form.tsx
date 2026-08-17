"use client";

import { useActionState, useState } from "react";
import { adjustRewardStockAction } from "@/actions/rewards";
import { runServerAction } from "@/lib/run-server-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/form-fields";

export function AdjustRewardStockForm({
  rewardId,
  stock,
}: {
  rewardId: string;
  stock: number | null;
}) {
  const [unlimited, setUnlimited] = useState(stock === null);
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) =>
      runServerAction(async () => adjustRewardStockAction(formData)),
    null
  );

  return (
    <form action={formAction} className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <input type="hidden" name="rewardId" value={rewardId} />
      {unlimited ? <input type="hidden" name="unlimitedStock" value="1" /> : null}
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Estoque</p>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={unlimited}
          onChange={(e) => setUnlimited(e.target.checked)}
        />
        Ilimitado
      </label>
      {!unlimited && (
        <div>
          <Label htmlFor={`stock-${rewardId}`} className="sr-only">
            Quantidade
          </Label>
          <Input
            id={`stock-${rewardId}`}
            name="stock"
            type="number"
            min="0"
            required
            defaultValue={stock ?? 0}
          />
        </div>
      )}
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
      <Button type="submit" size="sm" disabled={pending} className="w-full">
        {pending ? "Salvando..." : "Atualizar quantidade"}
      </Button>
    </form>
  );
}
