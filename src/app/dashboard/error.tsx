"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[DashboardError]:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-amber-200 bg-amber-50/70 px-6 py-12 text-center dark:border-amber-900/50 dark:bg-amber-950/40">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/60">
        <AlertTriangle className="h-6 w-6 text-amber-700 dark:text-amber-300" aria-hidden="true" />
      </div>
      <h2 className="text-xl font-bold text-amber-900 dark:text-amber-100">Algo deu errado ao carregar este painel</h2>
      <p className="mt-2 max-w-md text-sm text-amber-800 dark:text-amber-300">
        Ocorreu uma falha temporária no carregamento de dados. Clique em &quot;Tentar novamente&quot; para recarregar a visualização.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button onClick={() => reset()} className="gap-2">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Tentar novamente
        </Button>
        <Link href="/dashboard">
          <Button variant="outline">Ir ao painel principal</Button>
        </Link>
      </div>
    </div>
  );
}
