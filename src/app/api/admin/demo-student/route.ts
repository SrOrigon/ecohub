import { NextResponse } from "next/server";
import { authorizeMaintenanceRequest } from "@/lib/maintenance-auth";
import {
  DEMO_HOME_TASK_TITLE,
  DEMO_STUDENT_EMAIL,
  DEMO_STUDENT_ENROLLMENT,
  DEMO_STUDENT_PASSWORD,
  DEMO_STUDENT_PIN,
  ensureDemoStudent,
  removeDemoStudent,
} from "@/lib/demo-student";

export const dynamic = "force-dynamic";

/** GET — credenciais demo. PUT/POST — cria. DELETE — remove. */
export async function GET(request: Request) {
  if (!authorizeMaintenanceRequest(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  return NextResponse.json({
    demo: {
      email: DEMO_STUDENT_EMAIL,
      password: DEMO_STUDENT_PASSWORD,
      enrollmentCode: DEMO_STUDENT_ENROLLMENT,
      pin: DEMO_STUDENT_PIN,
      loginUrl: "/login/aluno",
      dashboardUrl: "/dashboard/aluno",
      hint: DEMO_HOME_TASK_TITLE,
    },
    usage: {
      create: "PUT /api/admin/demo-student",
      remove: "DELETE /api/admin/demo-student",
    },
  });
}

export async function PUT(request: Request) {
  return handleDemo("create", request);
}

export async function POST(request: Request) {
  return handleDemo("create", request);
}

export async function DELETE(request: Request) {
  return handleDemo("remove", request);
}

async function handleDemo(mode: "create" | "remove", request: Request) {
  if (!authorizeMaintenanceRequest(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const result = mode === "remove" ? await removeDemoStudent() : await ensureDemoStudent();

    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? "Falha." }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[admin/demo-student]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno." },
      { status: 500 }
    );
  }
}
