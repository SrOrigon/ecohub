"use client";

import { useEffect, useState } from "react";
import { WifiOff, CheckCircle2 } from "lucide-react";

export function ConnectivityBanner() {
  const [isOnline, setIsOnline] = useState(() => typeof window !== "undefined" ? navigator.onLine : true);
  const [showReconnectedToast, setShowReconnectedToast] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleOnline() {
      setIsOnline(true);
      setShowReconnectedToast(true);
      const timer = setTimeout(() => setShowReconnectedToast(false), 4000);
      return () => clearTimeout(timer);
    }

    function handleOffline() {
      setIsOnline(false);
      setShowReconnectedToast(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOnline) {
    return (
      <div className="bg-amber-600 text-white text-xs font-semibold px-4 py-2 flex items-center justify-center gap-2 shadow-sm animate-fade-in">
        <WifiOff className="h-4 w-4 shrink-0" />
        <span>
          Você está offline. Alterações serão sincronizadas automaticamente assim que a conexão for restabelecida.
        </span>
      </div>
    );
  }

  if (showReconnectedToast) {
    return (
      <div className="bg-emerald-600 text-white text-xs font-semibold px-4 py-2 flex items-center justify-center gap-2 shadow-sm animate-fade-in">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <span>Conexão restabelecida. Dados sincronizados.</span>
      </div>
    );
  }

  return null;
}
