"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { createTeacherAction } from "@/actions/crud";
import { runServerAction } from "@/lib/run-server-action";
import { buildMultipartFormData } from "@/lib/build-multipart-form-data";
import { AvatarUploadField } from "@/components/forms/avatar-upload-field";
import { LocationFields } from "@/components/forms/location-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/form-fields";
import { Modal } from "@/components/ui/modal";

export function CreateTeacherForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; loginPath: string } | null>(null);
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean; email?: string; loginPath?: string } | null, formData: FormData) => {
      const result = await runServerAction(async () => createTeacherAction(formData));
      if (result && "success" in result && result.success) {
        router.refresh();
        setCreated({
          email: result.email ?? "",
          loginPath: result.loginPath ?? "/login/professor",
        });
        setFullName("");
        setEmail("");
        setPassword("");
        setClientError(null);
      }
      return result;
    },
    null
  );

  function closeModal() {
    setOpen(false);
    setCreated(null);
    setFullName("");
    setEmail("");
    setPassword("");
    setClientError(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const emailValue = email.trim().toLowerCase();
    const passwordValue = password;

    if (!fullName.trim() || !emailValue || !passwordValue) {
      setClientError("Nome, e-mail e senha são obrigatórios.");
      return;
    }
    if (passwordValue.length < 8) {
      setClientError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (!/[a-zA-Z]/.test(passwordValue) || !/[0-9]/.test(passwordValue)) {
      setClientError("A senha deve conter letras e números.");
      return;
    }

    setClientError(null);
    const formData = buildMultipartFormData(form, [
      "fullName",
      "email",
      "password",
      "city",
      "state",
      "avatarUrl",
      "removeAvatar",
    ]);
    formData.set("fullName", fullName.trim());
    formData.set("email", emailValue);
    formData.set("password", passwordValue);
    formAction(formData);
  }

  const displayError = clientError ?? state?.error;

  return (
    <>
      <Button onClick={() => setOpen(true)} className="w-full sm:w-auto">
        + Novo professor
      </Button>
      <Modal open={open} onClose={closeModal} title="Cadastrar professor">
        {created ? (
          <div className="space-y-3 text-sm">
            <p className="font-medium text-emerald-800 dark:text-emerald-200">
              Professor cadastrado e pronto para entrar.
            </p>
            <p>
              E-mail: <strong>{created.email}</strong>
            </p>
            <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700 dark:bg-slate-900 dark:text-slate-200">
              O professor entra em <strong>{created.loginPath}</strong> com este e-mail e a senha definida agora.
              Também funciona se ele usar outro portal — o sistema abre o painel de professor.
            </p>
            <Button type="button" onClick={closeModal} className="w-full">
              Fechar
            </Button>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="fullName">Nome completo</Label>
            <Input
              id="fullName"
              name="fullName"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="password">Senha inicial</Label>
            <Input
              id="password"
              name="password"
              type="password"
              minLength={8}
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mín. 8 caracteres, letras e números"
            />
          </div>

          <AvatarUploadField previewName={fullName || "Professor"} />

          <LocationFields />

          {displayError && <p className="text-sm text-red-600">{displayError}</p>}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Salvando..." : "Cadastrar"}
          </Button>
        </form>
        )}
      </Modal>
    </>
  );
}
