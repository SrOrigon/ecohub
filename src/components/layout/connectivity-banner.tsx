"use client";

import { useEffect, useState } from "react";
import { WifiOff, CheckCircle2, RefreshCw } from "lucide-react";
import { getPendingMutations } from "@/lib/offline-storage";

export function ConnectivityBanner() {
  const [isOnline, setIsOnline] = useState(() => (typeof window !== "undefined" ? navigator.onLine : true));
  const [showSyncedToast, setShowSyncedToast] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  async function updatePendingCount() {
    if (typeof window === "undefined") return;
    const items = await getPendingMutations();
    setPendingCount(items.length);
  }

  useEffect(() => {
    if (typeof window === "undefined") return;

    const initialTimer = setTimeout(() => {
      void updatePendingCount();
    }, 0);

    function handleOnline() {
      setIsOnline(true);
    }

    function handleOffline() {
      setIsOnline(false);
      setShowSyncedToast(false);
    }

    function handleMutationsChanged() {
      updatePendingCount();
    }

    function handleSyncCompleted() {
      setShowSyncedToast(true);
      updatePendingCount();
      const timer = setTimeout(() => setShowSyncedToast(false), 4000);
      return () => clearTimeout(timer);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("ecohub_offline_mutations_changed", handleMutationsChanged);
    window.addEventListener("ecohub_offline_sync_completed", handleSyncCompleted);

    return () => {
      clearTimeout(initialTimer);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("ecohub_offline_mutations_changed", handleMutationsChanged);
      window.removeEventListener("ecohub_offline_sync_completed", handleSyncCompleted);
    };
  }, []);

  if (!isOnline) {
    return (
      <div className="bg-amber-600 text-white text-xs font-semibold px-4 py-2 flex items-center justify-center gap-2 shadow-sm animate-fade-in">
        <WifiOff className="h-4 w-4 shrink-0" />
        <span>
          {pendingCount > 0
            ? `${pendingCount} alteração(ões) salva(s) offline aguardando conexão.`
            : "Você está offline. Alterações serão salvas localmente e sincronizadas assim que a conexão for restabelecida."}
        </span>
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <div className="bg-blue-600 text-white text-xs font-semibold px-4 py-2 flex items-center justify-center gap-2 shadow-sm animate-fade-in">
        <RefreshCw className="h-4 w-4 shrink-0 animate-spin" />
        <span>Sincronizando {pendingCount} alteração(ões) salva(s) offline com o servidor...</span>
      </div>
    );
  }

  if (showSyncedToast) {
    return (
      <div className="bg-emerald-600 text-white text-xs font-semibold px-4 py-2 flex items-center justify-center gap-2 shadow-sm animate-fade-in">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <span>Todas as alterações foram sincronizadas com o servidor.</span>
      </div>
    );
  }

  return null;
}
