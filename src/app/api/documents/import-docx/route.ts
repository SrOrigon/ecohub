import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { importDocxToHtml } from "@/lib/docx-io";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user?.schoolId || !["admin", "director", "secretary"].includes(user.role)) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo não enviado." }, { status: 400 });
  }

  if (!file.name.toLowerCase().endsWith(".docx")) {
    return NextResponse.json({ error: "Envie um arquivo .docx." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await importDocxToHtml(buffer);
  return NextResponse.json(result);
}
