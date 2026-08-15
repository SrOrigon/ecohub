"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { registerStudentAction, listClassesForSignupAction } from "@/actions/auth";
import { runServerAction } from "@/lib/run-server-action";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label, Select } from "@/components/ui/form-fields";
import { ArrowLeft } from "lucide-react";

export function RegisterStudentForm({ initialSchoolSlug = "" }: { initialSchoolSlug?: string }) {
  const [schoolSlug, setSchoolSlug] = useState(initialSchoolSlug);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [schoolName, setSchoolName] = useState<string | null>(null);
  const [schoolError, setSchoolError] = useState<string | null>(null);
  const [loadingClasses, startLoad] = useTransition();

  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) =>
      runServerAction(async () => (await registerStudentAction(formData)) ?? null),
    null
  );

  const lookupSeq = useRef(0);

  useEffect(() => {
    if (schoolSlug.length < 3) return;

    // O debounce cancela o timer, mas não a consulta já em voo: sem o contador,
    // a resposta de um código antigo poderia sobrescrever as turmas atuais.
    const seq = ++lookupSeq.current;
    const t = setTimeout(() => {
      startLoad(async () => {
        const fd = new FormData();
        fd.set("schoolSlug", schoolSlug);
        const result = await listClassesForSignupAction(fd);
        if (seq !== lookupSeq.current) return;
        setClasses(result.classes ?? []);
        setSchoolName(result.schoolName ?? null);
        setSchoolError(result.error ?? null);
      });
    }, 400);
    return () => clearTimeout(t);
  }, [schoolSlug]);

  return (
    <Card className="w-full max-w-lg rounded-2xl border-2">
      <CardHeader>
        <Link href="/registro" className="mb-2 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-indigo-600">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar
        </Link>
        <CardTitle>Cadastro de aluno</CardTitle>
        <CardDescription>
          Peça o código da escola e escolha sua turma para receber as tarefas do professor.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="schoolSlug">Código da escola</Label>
            <Input
              id="schoolSlug"
              name="schoolSlug"
              required
              placeholder="codigo-da-escola"
              value={schoolSlug}
              onChange={(e) => {
                const v = e.target.value.toLowerCase();
                setSchoolSlug(v);
                if (v.length < 3) {
                  setClasses([]);
                  setSchoolName(null);
                  setSchoolError(null);
                }
              }}
            />
            {schoolName && (
              <p className="mt-1 text-sm text-emerald-700">Escola: {schoolName}</p>
            )}
            {schoolError && (
              <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">{schoolError}</p>
            )}
            {loadingClasses && <p className="mt-1 text-xs text-slate-500">Buscando turmas...</p>}
            {schoolName && classes.length === 0 && !loadingClasses && !schoolError && (
              <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
                Esta escola ainda não tem turmas cadastradas. Peça ao diretor para criar uma turma antes do cadastro.
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="classId">Turma</Label>
            <Select id="classId" name="classId" required defaultValue="">
              <option value="">Selecione sua turma...</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="birthDate">Data de nascimento</Label>
            <Input id="birthDate" name="birthDate" type="date" required />
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              Menores de 18 anos precisam que a escola ou responsável libere o acesso.
            </p>
          </div>
          <div>
            <Label htmlFor="fullName">Seu nome</Label>
            <Input id="fullName" name="fullName" required />
          </div>
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input id="password" name="password" type="password" minLength={8} required />
          </div>
          <div>
            <Label htmlFor="enrollmentCode">Matrícula (opcional)</Label>
            <Input id="enrollmentCode" name="enrollmentCode" placeholder="Gerada automaticamente se vazio" />
          </div>
          {state?.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={pending || classes.length === 0 || !!schoolError}
          >
            {pending ? "Criando..." : "Criar conta de aluno"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm">
          <Link href="/login/aluno" className="text-indigo-600 hover:underline">
            Já tenho conta (e-mail)
          </Link>
          {" · "}
          <Link href="/entrar" className="text-indigo-600 hover:underline">
            Entrar com PIN
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
