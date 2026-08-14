"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import type { RegisterSchoolSuccess } from "@/actions/auth";
import {
  SCHOOL_VERIFICATION_LABELS,
  verificationStatusMessage,
  type SchoolVerificationStatus,
} from "@/lib/school-verification";
import { tenantEntrarPath } from "@/lib/tenant";
import { Building2, CheckCircle2, LayoutDashboard, LogIn } from "lucide-react";

function statusBadgeVariant(status: SchoolVerificationStatus) {
  if (status === "verified") return "success" as const;
  if (status === "manual_review") return "warning" as const;
  if (status === "rejected") return "danger" as const;
  return "secondary" as const;
}

export function RegisterSchoolSuccess({ result }: { result: RegisterSchoolSuccess }) {
  const router = useRouter();
  const loginPath = tenantEntrarPath(result.slug);

  return (
    <div className="relative w-full max-w-lg">
      <div className="absolute -top-12 right-0 sm:-top-14">
        <ThemeToggle compact />
      </div>
      <Card className="w-full rounded-2xl border-2 border-emerald-200 shadow-[var(--shadow-md)] dark:border-emerald-900">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
              <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-300" aria-hidden="true" />
            </div>
            <div>
              <CardTitle>Instituição criada com sucesso</CardTitle>
              <CardDescription>Sua conta de direção já está ativa no Ecohub.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--hover)] p-4 text-sm">
            <div className="flex items-start gap-3">
              <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-300" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-[var(--foreground)]">{result.schoolName}</p>
                <p className="mt-1 text-[var(--muted-foreground)]">{result.email}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant={statusBadgeVariant(result.verificationStatus)}>
                    {SCHOOL_VERIFICATION_LABELS[result.verificationStatus]}
                  </Badge>
                </div>
                <p className="mt-3 text-[var(--muted-foreground)]">
                  {verificationStatusMessage(result.verificationStatus)}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2 rounded-xl border border-indigo-200 bg-indigo-50/80 p-4 text-sm dark:border-indigo-900 dark:bg-indigo-950/40">
            <p className="font-medium text-[var(--foreground)]">Próximos passos</p>
            <ul className="list-inside list-disc space-y-1 text-[var(--muted-foreground)]">
              <li>Configure turmas, disciplinas e convites de professores no painel.</li>
              <li>Guarde o endereço de login da sua instituição para compartilhar com a equipe.</li>
            </ul>
            <p className="pt-1 font-mono text-xs break-all text-indigo-800 dark:text-indigo-200">{loginPath}</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" className="flex-1 gap-2" size="lg" onClick={() => router.push("/dashboard")}>
              <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
              Acessar painel
            </Button>
            <Link
              href={loginPath}
              className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "flex-1 gap-2")}
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              Ver página de login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
