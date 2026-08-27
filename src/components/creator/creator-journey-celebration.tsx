"use client";

import { useEffect, useState } from "react";
import type { CreatorJourneySnapshot } from "@/lib/creator-journey";
import { SaoVictoryOverlay } from "@/components/celebration/sao-victory-overlay";

function storageKey(schoolId: string) {
  return `ecohub_creator_journey_celebrated:${schoolId}`;
}

export function CreatorJourneyCelebration({
  journey,
  schoolId,
}: {
  journey: CreatorJourneySnapshot | null | undefined;
  schoolId: string | null | undefined;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!journey || !schoolId) return;
    if (journey.completed < journey.total) return;

    try {
      if (localStorage.getItem(storageKey(schoolId)) === "1") return;
    } catch {
      return;
    }

    const frame = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(frame);
  }, [journey, schoolId]);

  function handleProceed() {
    if (schoolId) {
      try {
        localStorage.setItem(storageKey(schoolId), "1");
      } catch {
        /* ignore */
      }
    }
    setOpen(false);
  }

  return <SaoVictoryOverlay open={open} onProceed={handleProceed} />;
}
