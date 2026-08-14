"use client";

import { useActionState, useState } from "react";
import { provisionStudentForParentAction } from "@/actions/parents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Select } from "@/components/ui/form-fields";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus } from "lucide-react";

interface ClassOption {
  id: string;
  name: string;
}

export function ProvisionStudentForm({ classes }: { classes: ClassOption[] }) {
  const [credentials, setCredentials] = useState<{
    fullName: string;
    enrollmentCode: string;
    pin: string;
  } | null>(null);

  const [state, formAction, pending] = useActionState(
    async (
      _prev: { error?: string; success?: boolean; pin?: string; enrollmentCode?: string; fullName?: string } | null,
      formData: FormData
    ) => {
      const result = await provisionStudentForParentAction(formData);
      if (result.success && result.pin && result.enrollmentCode) {
        setCredentials({
          fullName: result.fullName ?? "",
          enrollmentCode: result.enrollmentCode,
          pin: result.pin,
        });
      }
      return result;
    },
    null
  );

  return (
    <Card className="border-violet-200 dark:border-violet-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserPlus className="h-5 w-5 text-violet-600" aria-hidden="true" />
          Liberar acesso para filho(a) menor
        </CardTitle>
      </CardHeader>
      <CardContent>
        {credentials ? (
          <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
            <p className="font-medium text-emerald-900 dark:text-emerald-200">
              Acesso criado para {credentials.fullName}
            </p>
            <p className="text-sm">
              Matrícula: <strong className="font-mono">{credentials.enrollmentCode}</strong>
            </p>
            <p className="text-sm">
              PIN: <strong className="font-mono text-lg">{credentials.pin}</strong>
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">
              Anote o PIN  -  ele não será exibido novamente. O aluno entra em{" "}
              <strong>/entrar</strong> com matrícula e PIN.
            </p>
            <Button type="button" variant="outline" size="sm" onClick={() => setCredentials(null)}>
              Cadastrar outro filho
            </Button>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            <div>
              <Label htmlFor="childName">Nome completo do(a) aluno(a)</Label>
              <Input id="childName" name="fullName" required />
            </div>
            <div>
              <Label htmlFor="birthDate">Data de nascimento</Label>
              <Input id="birthDate" name="birthDate" type="date" required />
            </div>
            {classes.length > 0 && (
              <div>
                <Label htmlFor="classId">Turma (opcional)</Label>
                <Select id="classId" name="classId" defaultValue="">
                  <option value="">Sem turma ainda</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            <div>
              <Label htmlFor="relation">Seu vínculo</Label>
              <Select id="relation" name="relation" defaultValue="responsavel">
                <option value="mae">Mãe</option>
                <option value="pai">Pai</option>
                <option value="responsavel">Responsável legal</option>
                <option value="avo">Avô/Avó</option>
              </Select>
            </div>
            {state?.error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-200">
                {state.error}
              </p>
            )}
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Criando acesso..." : "Gerar matrícula e PIN"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
