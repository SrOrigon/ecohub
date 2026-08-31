"use client";

import { useSyncExternalStore } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { isSoundEnabled, setSoundEnabled } from "@/lib/sound-effects";

function subscribeSound(onStoreChange: () => void) {
  window.addEventListener("ecohub:sound_change", onStoreChange);
  return () => window.removeEventListener("ecohub:sound_change", onStoreChange);
}

export function SoundToggle() {
  const enabled = useSyncExternalStore(subscribeSound, isSoundEnabled, () => true);

  function toggle() {
    const next = !enabled;
    setSoundEnabled(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="icon-btn shrink-0 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
      aria-label={enabled ? "Desativar efeitos sonoros" : "Ativar efeitos sonoros"}
      title={enabled ? "Efeitos sonoros ativados" : "Efeitos sonoros desativados"}
    >
      {enabled ? (
        <Volume2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
      ) : (
        <VolumeX className="h-4 w-4 opacity-50" />
      )}
    </button>
  );
}
