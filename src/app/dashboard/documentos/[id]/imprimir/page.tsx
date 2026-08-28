import { getSessionUser } from "@/lib/auth";
import { applyMergeTags, buildDocumentMergeContext } from "@/lib/document-merge";
import { PrintDocumentButton } from "@/components/documents/print-document-button";
import { notFound, redirect } from "next/navigation";

export default async function DocumentPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user?.schoolId) redirect("/login");
  if (!["admin", "director", "secretary"].includes(user.role)) redirect("/dashboard");

  const { id } = await params;
  const merge = await buildDocumentMergeContext(id, user.schoolId);
  if (!merge) notFound();

  const html = applyMergeTags(
    merge.document.contentHtml ?? `<p>${merge.document.body}</p>`,
    merge.context
  );

  return (
    <div className="document-print-shell min-h-screen bg-white">
      <div className="no-print border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <div>
            <p className="font-semibold">{merge.document.title}</p>
            <p className="text-sm text-slate-600">{merge.context.NomeAluno}</p>
          </div>
          <PrintDocumentButton />
        </div>
      </div>
      <article
        className="document-print mx-auto max-w-[210mm] bg-white p-[20mm] text-[12pt] leading-relaxed text-slate-900 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-400 [&_th]:border [&_th]:border-slate-400"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
