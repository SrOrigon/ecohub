import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/** Evita renderizar Recharts no SSR (width/height 0 quebra ResponsiveContainer). */
export function useIsMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}
