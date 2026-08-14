import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Mail } from "lucide-react";

export default function RegisterProfessorPage() {
  return (
    <main className="auth-page flex min-h-dvh items-center justify-center px-4 py-8">
      <Card className="w-full max-w-lg rounded-2xl border-2">
        <CardHeader>
          <Link
            href="/registro"
            className="mb-2 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-indigo-600"
          >
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
            como <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">/convite/professor/...</code>{" "}
            para criar sua conta.
          </p>
          <p>
            <Link href="/login/professor" className="font-semibold text-indigo-600 hover:underline">
              Já tenho conta  -  fazer login
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
