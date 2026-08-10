import { Badge } from "@/components/ui/badge";
import {
  SCHOOL_VERIFICATION_LABELS,
  verificationStatusMessage,
  type SchoolVerificationStatus,
} from "@/lib/school-verification";
import { formatCnpj } from "@/lib/cnpj";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";

function badgeVariant(status: SchoolVerificationStatus) {
  if (status === "verified") return "success" as const;
  if (status === "manual_review") return "warning" as const;
  if (status === "rejected") return "danger" as const;
  return "secondary" as const;
}

export function SchoolVerificationBanner({
  status,
  legalName,
  cnpj,
}: {
  status: string;
  legalName?: string | null;
  cnpj?: string | null;
}) {
  const s = status as SchoolVerificationStatus;
  if (s === "verified") return null;

  const Icon = s === "manual_review" ? Clock : AlertCircle;

  return (
    <div
      className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/30"
      role="status"
    >
      <div className="flex flex-wrap items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-[var(--foreground)]">Verificação da instituição</p>
            <Badge variant={badgeVariant(s)}>{SCHOOL_VERIFICATION_LABELS[s] ?? status}</Badge>
          </div>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">{verificationStatusMessage(s)}</p>
          {legalName && (
            <p className="mt-2 text-sm text-[var(--foreground)]">
              {legalName}
              {cnpj ? ` · ${formatCnpj(cnpj)}` : ""}
            </p>
          )}
          {s === "manual_review" && (
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              Você já pode configurar turmas e usar o painel. Cadastros públicos de professores e alunos
              serão liberados após aprovação.
            </p>
          )}
          {s === "pending" && (
            <p className="mt-2 flex items-center gap-1 text-sm text-[var(--muted-foreground)]">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Conclua a validação do CNPJ em Configurações se ainda não fez.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
