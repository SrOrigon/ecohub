import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit-logger";
import { exportStudentData } from "@/lib/student-data-export";

const ALLOWED = new Set(["admin", "director", "secretary"]);

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user?.schoolId || !ALLOWED.has(user.role)) {
    return NextResponse.json({ error: "Sem permissão para exportar dados do aluno." }, { status: 403 });
  }

  const { id } = await params;
  const data = await exportStudentData(user.schoolId, id);
  if (!data) return NextResponse.json({ error: "Aluno não encontrado." }, { status: 404 });

  await logAuditEvent({
    schoolId: user.schoolId,
    actorId: user.id,
    actorRole: user.role,
    action: "STUDENT_DATA_EXPORT",
    entityType: "Student",
    entityId: id,
  });

  const fileName = `dados-${data.aluno.matricula}.json`;
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
