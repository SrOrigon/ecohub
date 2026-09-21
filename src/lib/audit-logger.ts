import { prisma } from "@/lib/db";
import { headers } from "next/headers";

const SENSITIVE_KEYS = new Set([
  "password",
  "passwordhash",
  "accesspin-hash",
  "accesspinhash",
  "pin",
  "token",
  "secret",
  "creditcard",
  "cardnumber",
  "cvv",
  "bankaccount",
  "accountnumber",
]);

/**
 * Recorrer e mascarar campos sensíveis em objetos para logs LGPD.
 */
export function maskSensitiveFields<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => maskSensitiveFields(item)) as unknown as T;
  }

  if (typeof obj === "object") {
    const masked: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase().replace(/_/g, "");
      if (SENSITIVE_KEYS.has(lowerKey)) {
        masked[key] = "[MASCARADO]";
      } else if (typeof value === "object" && value !== null) {
        masked[key] = maskSensitiveFields(value);
      } else {
        masked[key] = value;
      }
    }
    return masked as unknown as T;
  }

  return obj;
}

export type LogAuditEventParams = {
  schoolId?: string | null;
  actorId: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  diffBefore?: Record<string, unknown> | unknown | null;
  diffAfter?: Record<string, unknown> | unknown | null;
};

export async function logAuditEvent(params: LogAuditEventParams) {
  try {
    let reqIp = params.ipAddress;
    let reqUA = params.userAgent;

    if (!reqIp || !reqUA) {
      try {
        const headerStore = await headers();
        if (!reqIp) {
          reqIp =
            headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            headerStore.get("x-real-ip") ||
            "127.0.0.1";
        }
        if (!reqUA) {
          reqUA = headerStore.get("user-agent") || undefined;
        }
      } catch {
        /* contexto sem headers */
      }
    }

    const maskedBefore = params.diffBefore
      ? JSON.stringify(maskSensitiveFields(params.diffBefore))
      : "{}";
    const maskedAfter = params.diffAfter
      ? JSON.stringify(maskSensitiveFields(params.diffAfter))
      : "{}";

    return await prisma.auditLog.create({
      data: {
        schoolId: params.schoolId ?? null,
        actorId: params.actorId,
        actorRole: params.actorRole,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        ipAddress: reqIp ?? null,
        userAgent: reqUA ?? null,
        diffBefore: maskedBefore,
        diffAfter: maskedAfter,
      },
    });
  } catch (error) {
    console.error("[audit-logger] Falha ao registrar log de auditoria:", error);
    return null;
  }
}
