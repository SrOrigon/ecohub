"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SaoVictoryOverlay } from "@/components/celebration/sao-victory-overlay";
import {
  SAO_CELEBRATION_EVENT,
  clearSaoCelebration,
  hasSaoCelebration,
} from "@/lib/sao-celebration-storage";

/** Overlay SAO que persiste mesmo quando o RSC recarrega após server action. */
export function SaoCelebrationLayer({ celebrationKey }: { celebrationKey: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!hasSaoCelebration(celebrationKey)) return;
    const frame = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(frame);
  }, [celebrationKey]);

  useEffect(() => {
    function onCelebrate(event: Event) {
      const key = (event as CustomEvent<string>).detail;
      if (key === celebrationKey) setOpen(true);
    }
    window.addEventListener(SAO_CELEBRATION_EVENT, onCelebrate);
    return () => window.removeEventListener(SAO_CELEBRATION_EVENT, onCelebrate);
  }, [celebrationKey]);

  if (!open) return null;

  return (
    <SaoVictoryOverlay
      open={open}
      onProceed={() => {
        clearSaoCelebration(celebrationKey);
        setOpen(false);
        router.refresh();
      }}
    />
  );
}
