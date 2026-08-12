"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-6 py-12 text-center">
      <h2 className="text-lg font-semibold text-red-900">Algo deu errado</h2>
      <p className="mt-2 max-w-md text-sm text-red-700">
        Não foi possível carregar esta página. Tente novamente ou volte ao painel.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>Tentar novamente</Button>
        <Link href="/dashboard">
          <Button variant="outline">Ir ao painel</Button>
        </Link>
      </div>
    </div>
  );
}
