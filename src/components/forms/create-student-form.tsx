"use client";

import { useActionState, useState } from "react";
import { createStudentAction } from "@/actions/crud";
import { runServerAction } from "@/lib/run-server-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Select } from "@/components/ui/form-fields";
import { FormMessage } from "@/components/ui/form-utils";
import { Modal } from "@/components/ui/modal";
import { StudentProfileFields } from "@/components/forms/student-profile-fields";

interface ClassOption {
  id: string;
  name: string;
}

export function CreateStudentForm({ classes }: { classes: ClassOption[] }) {
  const [open, setOpen] = useState(false);
  const [created, setCreated] = useState<{
    pin?: string;
    enrollmentCode: string;
    email?: string;
    loginPath?: string;
    accountType?: string;
  } | null>(null);
  const [accountMode, setAccountMode] = useState<"standard" | "pin_only">("standard");

  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean; pin?: string; enrollmentCode?: string; email?: string; loginPath?: string; accountType?: string } | null, formData: FormData) => {
      const result = await runServerAction(async () => createStudentAction(formData));
      if (result && "success" in result && result.success) {
        setCreated({
          pin: result.pin,
          enrollmentCode: result.enrollmentCode ?? "",
          email: result.email,
          loginPath: result.loginPath,
          accountType: result.accountType,
        });
      }
      return result;
    },
    null
  );

  function closeModal() {
    setOpen(false);
    setCreated(null);
    setAccountMode("standard");
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>+ Novo aluno</Button>
      <Modal open={open} onClose={closeModal} title="Cadastrar aluno" size="lg">
        {created ? (
          <div className="space-y-3 text-sm">
            <p className="font-medium text-emerald-800 dark:text-emerald-200">Aluno cadastrado e pronto para entrar.</p>
            <p>
              Matrícula: <strong className="font-mono">{created.enrollmentCode}</strong>
            </p>
            {created.email && created.accountType !== "pin_only" && (
              <p>
                E-mail: <strong>{created.email}</strong>
              </p>
            )}
            {created.pin && (
              <p>
                PIN: <strong className="font-mono text-lg">{created.pin}</strong>
              </p>
            )}
            <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700 dark:bg-slate-900 dark:text-slate-200">
              {created.pin
                ? "O aluno entra em /entrar com a matrícula e o PIN. Anote o PIN agora."
                : `O aluno entra em ${created.loginPath ?? "/login/aluno"} com este e-mail e a senha definida agora.`}
            </p>
            <Button type="button" onClick={closeModal} className="w-full">
              Fechar
            </Button>
          </div>
        ) : (
          <form action={formAction} className="space-y-4" encType="multipart/form-data">
            <StudentProfileFields idPrefix="new-student" birthDateRequired collapsibleExtras />
            <div>
              <Label htmlFor="accountMode">Tipo de conta</Label>
              <Select
                id="accountMode"
                name="accountMode"
                value={accountMode}
                onChange={(e) => setAccountMode(e.target.value as "standard" | "pin_only")}
              >
                <option value="standard">E-mail e senha</option>
                <option value="pin_only">Apenas matrícula + PIN</option>
              </Select>
            </div>
            {accountMode === "standard" ? (
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" name="email" type="email" required />
              </div>
            ) : (
              <input type="hidden" name="email" value="" />
            )}
            <div>
              <Label htmlFor="enrollmentCode">Matrícula</Label>
              <Input id="enrollmentCode" name="enrollmentCode" required />
            </div>
            <div>
              <Label htmlFor="classId">Turma</Label>
              <Select id="classId" name="classId">
                <option value="">Sem turma</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </div>
            {accountMode === "standard" ? (
              <div>
                <Label htmlFor="password">Senha inicial</Label>
                <Input id="password" name="password" type="password" minLength={8} required placeholder="Mín. 8 caracteres, letras e números" />
              </div>
            ) : (
              <>
                <div>
                  <Label htmlFor="pin">PIN personalizado (opcional)</Label>
                  <Input id="pin" name="pin" inputMode="numeric" pattern="\d{6}" maxLength={6} placeholder="6 dígitos  -  gerado se vazio" />
                </div>
                <input type="hidden" name="password" value="unused" />
              </>
            )}
            {state?.error && <FormMessage message={state} />}
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Salvando..." : "Cadastrar"}
            </Button>
          </form>
        )}
      </Modal>
    </>
  );
}
