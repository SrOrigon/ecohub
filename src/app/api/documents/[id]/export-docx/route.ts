import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { applyMergeTags, buildDocumentMergeContext } from "@/lib/document-merge";
import { exportHtmlToDocx } from "@/lib/docx-io";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user?.schoolId || !["admin", "director", "secretary"].includes(user.role)) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const { id } = await context.params;
  const merge = await buildDocumentMergeContext(id, user.schoolId);
  if (!merge) {
    return NextResponse.json({ error: "Documento não encontrado." }, { status: 404 });
  }

  const html = applyMergeTags(merge.document.contentHtml ?? `<p>${merge.document.body}</p>`, merge.context);
  const safeTitle = merge.document.title.replace(/[^\w\s-]/g, "").trim() || "documento";
  const { buffer, fileName } = await exportHtmlToDocx(html, safeTitle);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
