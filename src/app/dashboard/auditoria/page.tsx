import { getSessionUser } from "@/lib/auth";
import { getAuditLogsAction } from "@/actions/audit";
import { AuditLogViewer } from "@/components/admin/audit-log-viewer";
import { PageHeader } from "@/components/layout/page-header";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";

export default async function AuditoriaPage() {
  const user = await getSessionUser();
  if (!user || (user.role !== "director" && user.role !== "admin")) {
    redirect("/dashboard");
  }

  const logs = await getAuditLogsAction();

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-indigo-600" />
            Central de Auditoria & Governança Escolar
          </span>
        }
        description="Rastreamento em tempo real de alterações de notas, frequência, emissão de documentos e segurança institucional."
      />

      <AuditLogViewer initialLogs={logs} />
    </div>
  );
}
