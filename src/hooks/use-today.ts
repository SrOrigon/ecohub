"use client";

import { useSyncExternalStore } from "react";
import { todayKey } from "@/lib/date-only";

function subscribe() {
  return () => {};
}

// useSyncExternalStore exige que getSnapshot devolva a mesma referência enquanto
// nada mudar, senão o React entra em loop de renderização.
let cachedToday = "";

function getSnapshot() {
  const current = todayKey();
  if (current !== cachedToday) cachedToday = current;
  return cachedToday;
}

function getServerSnapshot() {
  return "";
}

/**
 * Data de hoje ("YYYY-MM-DD") no fuso do navegador.
 *
 * No servidor devolve string vazia e, após a hidratação, o valor local. Isso evita
 * divergência de hidratação e a data errada quando o servidor roda em UTC e o
 * usuário está em UTC-3.
 */
export function useToday(): string {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
