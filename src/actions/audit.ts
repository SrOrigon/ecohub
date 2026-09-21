"use server";

import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type AuditLogEntry = {
  id: string;
  category: string;
  action: string;
  operatorName: string;
  actorRole: string;
  targetName?: string;
  details: string;
  timestamp: string;
  ipAddress?: string;
};

/** Carrega os logs de auditoria institucional */
export async function getAuditLogsAction(): Promise<AuditLogEntry[]> {
  const user = await requireSession(["director", "admin"]);
  if (!user.schoolId) return [];

  const auditLogs = await prisma.auditLog.findMany({
    where: { schoolId: user.schoolId },
    take: 150,
    orderBy: { createdAt: "desc" },
  });

  const actorIds = [...new Set(auditLogs.map((log) => log.actorId))];
  const actors = await prisma.user.findMany({
    where: { id: { in: actorIds } },
    select: { id: true, fullName: true, role: true },
  });
  const actorMap = new Map(actors.map((a) => [a.id, a]));

  const logs: AuditLogEntry[] = auditLogs.map((log) => {
    const actor = actorMap.get(log.actorId);
    let detailsStr = "";
    try {
      const diffObj = JSON.parse(log.diffAfter || "{}");
      detailsStr = Object.entries(diffObj)
        .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
        .slice(0, 5)
        .join(" · ");
    } catch {
      detailsStr = log.diffAfter || "";
    }

    return {
      id: log.id,
      category: log.entityType,
      action: log.action,
      operatorName: actor?.fullName ?? log.actorId,
      actorRole: log.actorRole,
      targetName: log.entityId ?? undefined,
      details: detailsStr || `${log.action} (${log.entityType})`,
      timestamp: log.createdAt.toISOString(),
      ipAddress: log.ipAddress ?? undefined,
    };
  });

  return logs;
}
