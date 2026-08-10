import { notFound } from "next/navigation";
import { getTeacherInviteByToken } from "@/actions/invites";
import { AcceptTeacherInviteForm } from "@/components/auth/accept-teacher-invite-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default async function ConviteProfessorPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await getTeacherInviteByToken(token);

  if (!invite) notFound();

  if (invite.status !== "valid") {
    const messages: Record<string, string> = {
      used: "Este convite já foi utilizado.",
      expired: "Este convite expirou. Peça um novo link ao diretor.",
      school_unverified: "A instituição ainda não está verificada para novos cadastros.",
    };

    return (
      <main className="auth-page flex min-h-dvh items-center justify-center px-4 py-8">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Convite indisponível</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-[var(--muted-foreground)]">
              {messages[invite.status] ?? "Convite inválido."}
            </p>
            <Link href="/login/professor" className="text-sm text-indigo-600 hover:underline">
              Ir para login de professor
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="auth-page flex min-h-dvh items-center justify-center px-4 py-8">
      <AcceptTeacherInviteForm
        token={token}
        schoolName={invite.school.name}
        presetEmail={invite.email}
      />
    </main>
  );
}
