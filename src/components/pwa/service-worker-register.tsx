"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Sparkles } from "lucide-react";

export function ServiceWorkerRegister() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        if (reg.waiting) {
          setWaitingWorker(reg.waiting);
          setShowUpdateBanner(true);
        }

        reg.onupdatefound = () => {
          const installingWorker = reg.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (
                installingWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                setWaitingWorker(installingWorker);
                setShowUpdateBanner(true);
              }
            };
          }
        };
      })
      .catch(() => {
        // silent - PWA enhancement only
      });
  }, []);

  function handleReload() {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    }
    window.location.reload();
  }

  if (!showUpdateBanner) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-2xl bg-indigo-900 px-4 py-3 text-white shadow-xl border border-indigo-700 animate-fade-in-up">
      <Sparkles className="h-5 w-5 text-amber-400 shrink-0" />
      <div className="text-xs">
        <p className="font-bold">Nova versão disponível!</p>
        <p className="text-indigo-200">Atualize para carregar os recursos mais recentes.</p>
      </div>
      <Button
        type="button"
        size="sm"
        onClick={handleReload}
        className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs gap-1.5 shrink-0"
      >
        <RefreshCcw className="h-3.5 w-3.5" />
        Recarregar
      </Button>
    </div>
  );
}
