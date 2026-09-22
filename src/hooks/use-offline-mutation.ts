"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getPendingMutations,
  queueOfflineMutation,
  removeOfflineMutation,
  markMutationFailed,
  type PendingMutation,
} from "@/lib/offline-storage";
import { bulkAttendanceAction, createGradeAction } from "@/actions/crud";

export interface MutationResult<T = unknown> {
  success?: boolean;
  error?: string;
  message?: string;
  queued?: boolean;
  data?: T;
}

function formDataToPayload(formData: FormData): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  formData.forEach((value, key) => {
    if (typeof value === "string") {
      payload[key] = value;
    }
  });
  return payload;
}

function payloadToFormData(payload: Record<string, unknown>): FormData {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  });
  return formData;
}

async function executeActionByName(
  actionName: string,
  payload: Record<string, unknown>
): Promise<MutationResult> {
  const formData = payloadToFormData(payload);
  switch (actionName) {
    case "bulkAttendanceAction":
      return await bulkAttendanceAction(formData);
    case "createGradeAction":
      return await createGradeAction(formData);
    default:
      throw new Error(`Ação desconhecida para sincronização: ${actionName}`);
  }
}

export function useOfflineMutation() {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof window !== "undefined" ? navigator.onLine : true
  );
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const refreshPendingCount = useCallback(async () => {
    if (typeof window === "undefined") return;
    const items = await getPendingMutations();
    setPendingCount(items.length);
  }, []);

  const syncPendingMutations = useCallback(async () => {
    if (typeof window === "undefined" || !navigator.onLine || isSyncing) return;

    setIsSyncing(true);
    try {
      const items: PendingMutation[] = await getPendingMutations();
      if (items.length === 0) {
        setIsSyncing(false);
        return;
      }

      for (const item of items) {
        if (item.status === "failed" && item.attempts >= 5) continue;

        try {
          const res = await executeActionByName(item.actionName, item.payload);
          if (res.success) {
            await removeOfflineMutation(item.id);
          } else {
            await markMutationFailed(item.id, res.error ?? "Erro ao reprocessar");
          }
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : "Erro de conexão durante sincronização";
          await markMutationFailed(item.id, errorMsg);
          // Interromper loop FIFO se for falha de rede
          if (!navigator.onLine) break;
        }
      }

      await refreshPendingCount();
      window.dispatchEvent(new CustomEvent("ecohub_offline_sync_completed"));
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, refreshPendingCount]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    refreshPendingCount();

    function handleOnline() {
      setIsOnline(true);
      syncPendingMutations();
    }

    function handleOffline() {
      setIsOnline(false);
    }

    function handleMutationsChanged() {
      refreshPendingCount();
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("ecohub_offline_mutations_changed", handleMutationsChanged);

    if (navigator.onLine) {
      syncPendingMutations();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("ecohub_offline_mutations_changed", handleMutationsChanged);
    };
  }, [refreshPendingCount, syncPendingMutations]);

  const mutate = useCallback(
    async (
      actionName: string,
      formData: FormData,
      actionFn: (fd: FormData) => Promise<MutationResult>,
      schoolId?: string | null
    ): Promise<MutationResult> => {
      const payload = formDataToPayload(formData);

      if (!navigator.onLine) {
        await queueOfflineMutation(actionName, payload, schoolId);
        await refreshPendingCount();
        return {
          success: true,
          queued: true,
          message: "Ação salva offline. Será sincronizada assim que você estiver online.",
        };
      }

      try {
        const result = await actionFn(formData);
        return result;
      } catch (err: unknown) {
        const isNetworkError =
          err instanceof TypeError ||
          (err instanceof Error &&
            (err.message.includes("fetch") ||
              err.message.includes("Network") ||
              err.message.includes("Failed to fetch")));

        if (isNetworkError) {
          await queueOfflineMutation(actionName, payload, schoolId);
          await refreshPendingCount();
          return {
            success: true,
            queued: true,
            message: "Falha de rede. Ação salva offline e aguardando sincronização.",
          };
        }

        throw err;
      }
    },
    [refreshPendingCount]
  );

  return {
    isOnline,
    pendingCount,
    isSyncing,
    mutate,
    syncPendingMutations,
  };
}
