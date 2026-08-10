"use client";

import { useActionState } from "react";
import { approveSchoolAction, rejectSchoolAction } from "@/actions/platform";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Check, X } from "lucide-react";
import { SCHOOL_VERIFICATION_LABELS, type SchoolVerificationStatus } from "@/lib/school-verification";

type PendingSchool = {
  id: string;
  name: string;
  slug: string;
  cnpj: string | null;
  legalName: string | null;
  city: string | null;
  state: string | null;
  verificationStatus: string;
  createdAt: Date;
  users: { fullName: string; email: string }[];
};

function ApproveButton({ schoolId }: { schoolId: string }) {
  const [state, action, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) =>
      (await approveSchoolAction(formData)) ?? null,
    null
  );

  return (
    <form action={action}>
      <input type="hidden" name="schoolId" value={schoolId} />
      <Button type="submit" size="sm" disabled={pending} className="gap-1">
        <Check className="h-3.5 w-3.5" aria-hidden="true" />
        {pending ? "..." : "Aprovar"}
      </Button>
      {state?.error && <p className="mt-1 text-xs text-red-600">{state.error}</p>}
    </form>
  );
}

function RejectButton({ schoolId }: { schoolId: string }) {
  const [state, action, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) =>
      (await rejectSchoolAction(formData)) ?? null,
    null
  );

  return (
    <form action={action}>
      <input type="hidden" name="schoolId" value={schoolId} />
      <Button type="submit" size="sm" variant="outline" disabled={pending} className="gap-1 text-red-600">
        <X className="h-3.5 w-3.5" aria-hidden="true" />
        {pending ? "..." : "Rejeitar"}
      </Button>
      {state?.error && <p className="mt-1 text-xs text-red-600">{state.error}</p>}
    </form>
  );
}

export function PlatformSchoolsPanel({ schools }: { schools: PendingSchool[] }) {
  if (schools.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-slate-500">
          Nenhuma escola aguardando análise no momento.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {schools.map((school) => {
        const status = school.verificationStatus as SchoolVerificationStatus;
        const director = school.users[0];
        return (
          <Card key={school.id}>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-5 w-5 text-indigo-600" aria-hidden="true" />
                  {school.name}
                </CardTitle>
                <Badge variant={status === "manual_review" ? "warning" : "secondary"}>
                  {SCHOOL_VERIFICATION_LABELS[status] ?? status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>
                <strong>Slug:</strong> {school.slug}
                {school.cnpj && (
                  <>
                    {" · "}
                    <strong>CNPJ:</strong> {school.cnpj}
                  </>
                )}
              </p>
              {school.legalName && <p><strong>Razão social:</strong> {school.legalName}</p>}
              {(school.city || school.state) && (
                <p>
                  <strong>Local:</strong> {[school.city, school.state].filter(Boolean).join(" / ")}
                </p>
              )}
              {director && (
                <p>
                  <strong>Diretor(a):</strong> {director.fullName} ({director.email})
                </p>
              )}
              <p className="text-xs text-slate-500">
                Cadastro em {school.createdAt.toLocaleDateString("pt-BR")}
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                <ApproveButton schoolId={school.id} />
                <RejectButton schoolId={school.id} />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
