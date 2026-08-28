import { NextResponse } from "next/server";
import { authorizeMaintenanceRequest } from "@/lib/maintenance-auth";
import {
  loadInstitutionalSnapshot,
  restoreInstitutionalSnapshotIfDegraded,
  saveInstitutionalSnapshot,
} from "@/lib/institutional-snapshot";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** GET — status do snapshot institucional. */
export async function GET(request: Request) {
  if (!authorizeMaintenanceRequest(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const [userCount, schoolCount, studentCount, snapshot] = await Promise.all([
    prisma.user.count(),
    prisma.school.count(),
    prisma.student.count(),
    loadInstitutionalSnapshot(),
  ]);

  return NextResponse.json({
    userCount,
    schoolCount,
    studentCount,
    snapshot: snapshot
      ? {
          savedAt: snapshot.savedAt,
          userCount: snapshot.userCount,
          schools: snapshot.schools.length,
          teachers: snapshot.users.filter((u) => u.role === "teacher").length,
          students: snapshot.students.length,
        }
      : null,
  });
}

/** POST — salva snapshot agora ou restaura se degradado. Body: { action?: "save" | "restore" } */
export async function POST(request: Request) {
  if (!authorizeMaintenanceRequest(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  let body: { action?: string } = {};
  try {
    body = await request.json();
  } catch {
    /* default save */
  }

  if (body.action === "restore" || body.action === "force") {
    const result = await restoreInstitutionalSnapshotIfDegraded();
    return NextResponse.json(result);
  }

  await saveInstitutionalSnapshot("admin-api");
  const snapshot = await loadInstitutionalSnapshot();
  return NextResponse.json({
    ok: true,
    snapshot: snapshot
      ? { savedAt: snapshot.savedAt, userCount: snapshot.userCount }
      : null,
  });
}
