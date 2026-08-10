"use client";

import { useActionState, useState } from "react";
import { createTeacherInviteAction } from "@/actions/invites";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/form-fields";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, Link2, Mail } from "lucide-react";

type InviteRow = {
  id: string;
  token: string;
  email: string | null;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
  invitedBy: { fullName: string };
  usedBy: { fullName: string; email: string } | null;
};

export function TeacherInvitePanel({ invites }: { invites: InviteRow[] }) {
  const [lastInvite, setLastInvite] = useState<{ url: string; token: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean; url?: string; token?: string } | null, formData: FormData) => {
      const result = await createTeacherInviteAction(formData);
      if (result.success && result.url && result.token) {
        setLastInvite({ url: result.url, token: result.token });
      }
      return result;
    },
    null
  );

  async function copyLink(url: string) {
    const full = `${window.location.origin}${url}`;
    await navigator.clipboard.writeText(full);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Link2 className="h-5 w-5 text-indigo-600" aria-hidden="true" />
          Convites de professor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-[var(--muted-foreground)]">
          Professores só podem se cadastrar por link de convite. Gere um link e envie por WhatsApp ou e-mail.
        </p>

        <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label htmlFor="inviteEmail">E-mail do convidado (opcional)</Label>
            <Input
              id="inviteEmail"
              name="email"
              type="email"
              placeholder="professor@escola.com.br"
            />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Gerando..." : "Gerar convite"}
          </Button>
        </form>

        {state?.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-200">
            {state.error}
          </p>
        )}

        {(lastInvite || state?.url) && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
            <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">Convite criado!</p>
            <p className="mt-1 break-all font-mono text-xs">{lastInvite?.url ?? state?.url}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => copyLink(lastInvite?.url ?? state?.url ?? "")}
            >
              <Copy className="mr-1 h-4 w-4" aria-hidden="true" />
              {copied ? "Copiado!" : "Copiar link completo"}
            </Button>
          </div>
        )}

        {invites.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Convites recentes</p>
            <ul className="space-y-2">
              {invites.map((inv) => {
                const status = inv.usedAt
                  ? "used"
                  : inv.expiresAt < new Date()
                    ? "expired"
                    : "active";
                return (
                  <li
                    key={inv.id}
                    className="flex flex-col gap-2 rounded-lg border border-[var(--border-subtle)] p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        {inv.email ? (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                            {inv.email}
                          </span>
                        ) : (
                          <span className="text-[var(--muted-foreground)]">Link aberto</span>
                        )}
                        <Badge
                          variant={
                            status === "used" ? "success" : status === "expired" ? "secondary" : "default"
                          }
                        >
                          {status === "used"
                            ? "Usado"
                            : status === "expired"
                              ? "Expirado"
                              : "Ativo"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                        Por {inv.invitedBy.fullName} · expira{" "}
                        {inv.expiresAt.toLocaleDateString("pt-BR")}
                        {inv.usedBy && ` · ${inv.usedBy.fullName}`}
                      </p>
                    </div>
                    {status === "active" && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => copyLink(`/convite/professor/${inv.token}`)}
                      >
                        Copiar link
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
