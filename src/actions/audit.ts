"use server";

import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type AuditLogEntry = {
  id: string;
  category: "Notas" | "Frequência" | "Documentos" | "Gamificação" | "Acesso";
  action: string;
  operatorName: string;
  targetName?: string;
  details: string;
  timestamp: string;
  ipAddress?: string;
};

/** Carrega os logs de auditoria institucional */
export async function getAuditLogsAction(): Promise<AuditLogEntry[]> {
  const user = await requireSession(["director", "admin"]);
  if (!user.schoolId) return [];

  const [grades, attendances, documents, studentActivities] = await Promise.all([
    prisma.grade.findMany({
      where: { student: { user: { schoolId: user.schoolId } } },
      include: {
        student: { include: { user: { select: { fullName: true } } } },
        teacher: { select: { fullName: true } },
      },
      take: 25,
      orderBy: { createdAt: "desc" },
    }),
    prisma.attendance.findMany({
      where: { student: { user: { schoolId: user.schoolId } } },
      include: {
        student: { include: { user: { select: { fullName: true } } } },
      },
      take: 25,
      orderBy: { date: "desc" },
    }),
    prisma.issuedDocument.findMany({
      where: { schoolId: user.schoolId },
      include: {
        student: { include: { user: { select: { fullName: true } } } },
        issuedBy: { select: { fullName: true } },
      },
      take: 25,
      orderBy: { issuedAt: "desc" },
    }),
    prisma.studentActivity.findMany({
      where: { student: { user: { schoolId: user.schoolId } } },
      include: {
        student: { include: { user: { select: { fullName: true } } } },
      },
      take: 25,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const logs: AuditLogEntry[] = [];

  for (const g of grades) {
    logs.push({
      id: `grade-${g.id}`,
      category: "Notas",
      action: "Lançamento de Nota",
      operatorName: g.teacher?.fullName ?? "Docente",
      targetName: g.student.user.fullName,
      details: `${g.subject} (${g.period}) -> Nota ${g.value.toFixed(1)}/${g.maxValue}`,
      timestamp: g.createdAt.toISOString(),
    });
  }

  for (const a of attendances) {
    logs.push({
      id: `att-${a.id}`,
      category: "Frequência",
      action: a.status === "present" ? "Presença Confirmada" : a.status === "absent" ? "Falta Registrada" : "Falta Justificada",
      operatorName: a.justifiedById ? "Coordenação (Justificativa)" : "Chamada em Sala",
      targetName: a.student.user.fullName,
      details: `Data: ${new Date(a.date).toLocaleDateString("pt-BR")}${a.justificationNote ? ` · Motivo: ${a.justificationNote}` : ""}`,
      timestamp: a.createdAt.toISOString(),
    });
  }

  for (const doc of documents) {
    logs.push({
      id: `doc-${doc.id}`,
      category: "Documentos",
      action: "Emissão de Documento Escolar",
      operatorName: doc.issuedBy.fullName,
      targetName: doc.student.user.fullName,
      details: `${doc.title} (${doc.type}) · Status: ${doc.status}`,
      timestamp: doc.issuedAt.toISOString(),
    });
  }

  for (const act of studentActivities) {
    logs.push({
      id: `act-${act.id}`,
      category: "Gamificação",
      action: act.title,
      operatorName: "Sistema / Interação",
      targetName: act.student.user.fullName,
      details: act.detail ?? act.title,
      timestamp: act.createdAt.toISOString(),
    });
  }

  // Ordena por data decrescente
  logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return logs;
}
