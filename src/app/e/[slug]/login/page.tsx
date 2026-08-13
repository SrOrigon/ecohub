import { notFound } from "next/navigation";
import { findSchoolBySlug } from "@/lib/school-lookup";
import { tenantEntrarPath } from "@/lib/tenant";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, GraduationCap, Heart, KeyRound, UserRound } from "lucide-react";

export default async function TenantLoginHubPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const school = await findSchoolBySlug(slug);
  if (!school) notFound();

  const base = `/e/${slug}/login`;

  const portals = [
    { href: `${base}/escola`, label: "Instituição", icon: Building2, desc: "Direção e gestão" },
    { href: `${base}/professor`, label: "Professor", icon: GraduationCap, desc: "Turmas e tarefas" },
    { href: `${base}/aluno`, label: "Aluno (e-mail)", icon: UserRound, desc: "Conta com senha" },
    { href: tenantEntrarPath(slug), label: "Aluno (PIN)", icon: KeyRound, desc: "Matrícula + PIN" },
    { href: `${base}/responsavel`, label: "Responsável", icon: Heart, desc: "Acompanhar filhos" },
  ];

  return (
    <main className="auth-page flex min-h-dvh items-center justify-center px-4 py-8">
      <Card className="w-full max-w-lg rounded-2xl border-2">
        <CardHeader>
          <CardTitle className="text-xl">{school.name}</CardTitle>
          <CardDescription>Escolha como deseja entrar no Ecohub</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {portals.map(({ href, label, icon: Icon, desc }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-xl border border-[var(--border-subtle)] p-4 transition hover:border-indigo-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-950">
                <Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-300" aria-hidden="true" />
              </div>
              <div>
                <p className="font-medium">{label}</p>
                <p className="text-sm text-[var(--muted-foreground)]">{desc}</p>
              </div>
            </Link>
          ))}
          <p className="pt-2 text-center text-xs text-[var(--muted-foreground)]">
            Código da escola: <strong className="font-mono">{school.slug}</strong>
            {" · "}
            <Link href="/login" className="hover:text-indigo-600 hover:underline">
              Login global
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
