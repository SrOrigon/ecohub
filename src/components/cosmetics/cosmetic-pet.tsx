"use client";

import { cn } from "@/lib/utils";

/** Placeholder visual do pet até a animação oficial ser publicada. */
export function CosmeticPetPlaceholder({
  label,
  className,
  accent = "from-indigo-200 to-violet-200",
}: {
  label?: string;
  className?: string;
  accent?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex h-28 w-full items-end justify-center overflow-hidden rounded-2xl bg-gradient-to-br",
        accent,
        className
      )}
      aria-hidden="true"
    >
      <div className="ecohub-pet-idle mb-3 flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-white/80 bg-white/50">
        <span className="text-2xl" aria-hidden="true">
          ✦
        </span>
      </div>
      {label ? (
        <span className="sr-only">{label}</span>
      ) : null}
    </div>
  );
}
