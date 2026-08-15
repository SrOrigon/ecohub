"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[AppError]:", error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/60">
        <AlertTriangle className="h-7 w-7 text-amber-700 dark:text-amber-300" aria-hidden="true" />
      </div>
      <h1 className="text-2xl font-bold text-[var(--foreground)]">
        Falha temporária no servidor
      </h1>
      <p className="mt-3 max-w-md text-sm text-[var(--muted-foreground)]">
        Nenhum dado foi perdido. Tente novamente em alguns instantes — se o problema continuar,
        avise a equipe da instituição.
      </p>
      {process.env.NODE_ENV === "development" && (
        <p className="mt-3 max-w-lg break-all text-left text-xs text-amber-900/80 dark:text-amber-200/80">
          {error.message}
          {error.digest ? ` (digest: ${error.digest})` : null}
        </p>
      )}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button onClick={() => reset()} className="gap-2">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Tentar novamente
        </Button>
        <Link href="/login">
          <Button variant="outline">Ir para o login</Button>
        </Link>
      </div>
    </main>
  );
}
