import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthShell, AUTH_BACK_LINK_CLASS, AUTH_CARD_CLASS } from "@/components/auth/auth-shell";
import { ArrowLeft, Mail } from "lucide-react";

export default function RegisterProfessorPage() {
  return (
    <AuthShell>
      <Card className={AUTH_CARD_CLASS}>
        <CardHeader>
          <Link href="/registro" className={AUTH_BACK_LINK_CLASS}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Voltar
          </Link>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-indigo-600" aria-hidden="true" />
            Cadastro de professor
          </CardTitle>
          <CardDescription>
            O cadastro de professores é feito exclusivamente por convite do diretor da escola.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-[var(--muted-foreground)]">
          <p>
            Peça ao diretor ou à secretaria um <strong>link de convite</strong>. Você receberá um endereço
            para criar sua conta.
          </p>
          <p>
            <Link href="/login/professor" className="font-semibold text-[color:var(--school-primary)] hover:underline">
              Já tenho conta — fazer login
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
