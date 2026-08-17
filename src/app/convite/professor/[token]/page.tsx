import { notFound } from "next/navigation";
import { fetchTeacherInviteByToken } from "@/lib/reads/teacher-invite-reads";
import { AcceptTeacherInviteForm } from "@/components/auth/accept-teacher-invite-form";
import { AuthShell, AUTH_CARD_CLASS } from "@/components/auth/auth-shell";
import { portalLoginPath } from "@/lib/login-paths";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default async function ConviteProfessorPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await fetchTeacherInviteByToken(token);

  if (!invite) notFound();

  if (invite.status !== "valid") {
    const messages: Record<string, string> = {
      used: "Este convite já foi utilizado.",
      expired: "Este convite expirou. Peça um novo link ao diretor.",
      school_unverified: "A instituição ainda não está verificada para novos cadastros.",
    };

    return (
      <AuthShell>
        <Card className={AUTH_CARD_CLASS}>
          <CardHeader>
            <CardTitle>Convite indisponível</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-[var(--muted-foreground)]">
              {messages[invite.status] ?? "Convite inválido."}
            </p>
            <Link
              href={portalLoginPath("professor", invite.school.slug)}
              className="text-sm font-semibold text-[color:var(--school-primary)] hover:underline"
            >
              Ir para login de professor
            </Link>
          </CardContent>
        </Card>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <AcceptTeacherInviteForm
        token={token}
        schoolName={invite.school.name}
        schoolSlug={invite.school.slug}
        presetEmail={invite.email}
      />
    </AuthShell>
  );
}
