"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { SaoCrystalParticles } from "@/components/celebration/sao-crystal-particles";
import { Button } from "@/components/ui/button";

export function SaoVictoryOverlay({
  open,
  onProceed,
  message = "Congratulations!!",
}: {
  open: boolean;
  onProceed: () => void;
  message?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="sao-victory-overlay fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sao-victory-title"
      aria-describedby="sao-victory-desc"
    >
      <SaoCrystalParticles active={open} />

      <div className="sao-victory-ui relative z-[10001] flex flex-col items-center px-6 text-center">
        <h2 id="sao-victory-title" className="sao-victory-title">
          {message}
        </h2>
        <div className="sao-victory-bar" aria-hidden="true">
          <span className="sao-victory-bar-segment" />
          <span className="sao-victory-bar-gap" />
          <span className="sao-victory-bar-segment" />
        </div>
        <p id="sao-victory-desc" className="sr-only">
          Tarefa concluída. Pressione Prosseguir para continuar.
        </p>
        <Button
          type="button"
          size="lg"
          onClick={onProceed}
          className="sao-victory-proceed sao-victory-proceed-btn mt-10 min-w-[12rem] rounded-none px-8 py-3 text-base font-bold uppercase tracking-[0.2em]"
        >
          Prosseguir
        </Button>
      </div>
    </div>,
    document.body
  );
}
