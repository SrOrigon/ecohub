import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getSchool } from "@/lib/queries";
import { getInstitutionalReport } from "@/lib/institutional-report";
import { buildReportCsv, type ReportExportKind } from "@/lib/report-export";

export const dynamic = "force-dynamic";

const ALLOWED: ReportExportKind[] = [
  "summary",
  "subjects",
  "students",
  "student-subjects",
  "classes",
  "full",
];

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  if (!["admin", "director", "secretary", "teacher"].includes(user.role)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const kind = (searchParams.get("kind") ?? "full") as ReportExportKind;
  if (!ALLOWED.includes(kind)) {
    return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
  }

  const school = await getSchool(user);
  const teacherId = user.role === "teacher" ? user.id : undefined;
  const report = await getInstitutionalReport(user.schoolId, {
    teacherId,
    schoolName: school?.name,
  });

  if (!report) {
    return NextResponse.json({ error: "Relatório indisponível" }, { status: 404 });
  }

  const { filename, content, mime } = buildReportCsv(report, kind);

  return new NextResponse(content, {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
