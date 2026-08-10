"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintBoletimButton() {
  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="default" size="sm" onClick={() => window.print()} className="gap-2">
        <Printer className="h-4 w-4" aria-hidden="true" />
        Imprimir / Salvar PDF
      </Button>
      <p className="max-w-[14rem] text-right text-xs text-slate-500">
        Na janela de impressão, escolha &quot;Salvar como PDF&quot; se quiser baixar.
      </p>
    </div>
  );
}
