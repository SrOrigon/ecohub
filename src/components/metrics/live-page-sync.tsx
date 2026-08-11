"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLiveMetricsOptional } from "@/components/metrics/live-metrics-provider";

const REFRESH_PATHS = [
  "/dashboard",
  "/dashboard/aluno",
  "/dashboard/professor",
  "/dashboard/gamificacao",
  "/dashboard/engajamento",
  "/dashboard/rankings",
  "/dashboard/leitura-geral",
  "/dashboard/exercicios",
  "/dashboard/historico",
  "/dashboard/aluno/historico",
  "/dashboard/precisao-disciplinas",
  "/dashboard/secretaria",
];

/** Re-renderiza a página quando métricas mudam (debounced). */
export function LivePageSync() {
  const ctx = useLiveMetricsOptional();
  const router = useRouter();
  const pathname = usePathname();
  const lastVersion = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!ctx?.snapshot) return;
    const shouldSync = REFRESH_PATHS.some((p) => {
      if (p === "/dashboard") return pathname === "/dashboard";
      return pathname === p || pathname.startsWith(`${p}/`);
    });
    if (!shouldSync) return;

    const version = ctx.snapshot.version;
    if (lastVersion.current === null) {
      lastVersion.current = version;
      return;
    }
    if (lastVersion.current === version) return;

    lastVersion.current = version;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      router.refresh();
    }, 1500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [ctx?.snapshot, pathname, router]);

  return null;
}
