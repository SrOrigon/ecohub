import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { DocumentEditorForm } from "@/components/documents/document-editor-form";
import { getClasses } from "@/lib/queries";
import { DEFAULT_CONTRACT_HTML } from "@/lib/document-types";
import { notFound, redirect } from "next/navigation";

export default async function DocumentEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user?.schoolId) redirect("/login");
  if (!["admin", "director", "secretary"].includes(user.role)) redirect("/dashboard");

  const { id } = await params;
  const [document, classes] = await Promise.all([
    prisma.issuedDocument.findFirst({
      where: { id, schoolId: user.schoolId },
      include: {
        student: { include: { user: { select: { fullName: true } } } },
        classGroup: { select: { id: true, name: true } },
      },
    }),
    getClasses(user.schoolId),
  ]);
  if (!document) notFound();

  const backHref = document.type === "contract" ? "/dashboard/contratos" : "/dashboard/documentos";
  const backLabel = document.type === "contract" ? "Voltar aos contratos" : "Voltar aos documentos";

  return (
    <div className="space-y-6">
      <PageHeader
        backHref={backHref}
        backLabel={backLabel}
        title={document.title}
        description={`Editor de documento · ${document.student.user.fullName}`}
      />
      <DocumentEditorForm
        documentId={document.id}
        documentType={document.type}
        title={document.title}
        contractNumber={document.contractNumber}
        classId={document.classId}
        contractStartDate={document.contractStartDate}
        contractEndDate={document.contractEndDate}
        status={document.status}
        initialHtml={document.contentHtml ?? (document.body ? `<p>${document.body}</p>` : DEFAULT_CONTRACT_HTML)}
        studentName={document.student.user.fullName}
        classes={classes.map((item) => ({ id: item.id, name: item.name }))}
      />
    </div>
  );
}
