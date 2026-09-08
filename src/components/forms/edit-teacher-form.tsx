"use client";

import { startTransition, useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Pencil } from "lucide-react";
import { updateTeacherAction } from "@/actions/crud";
import { runServerAction } from "@/lib/run-server-action";
import { buildMultipartFormData } from "@/lib/build-multipart-form-data";
import { normalizePassword } from "@/lib/security/password-policy";
import { AvatarUploadField } from "@/components/forms/avatar-upload-field";
import { LocationFields, StreetAddressFields } from "@/components/forms/location-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/form-fields";
import { Modal } from "@/components/ui/modal";

export type EditableTeacher = {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  street: string | null;
  streetNumber: string | null;
  addressComplement: string | null;
  city: string | null;
  state: string | null;
};

export function EditTeacherForm({ teacher }: { teacher: EditableTeacher }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ email: string; password?: string } | null>(null);

  const [state, formAction, pending] = useActionState(
    async (
      _prev: { error?: string; success?: boolean; email?: string; passwordUpdated?: boolean } | null,
      formData: FormData
    ) => {
      const result = await runServerAction(async () => updateTeacherAction(formData));
      if (result && "success" in result && result.success) {
        router.refresh();
        const nextPassword = normalizePassword(String(formData.get("password") ?? ""));
        setSaved({
          email: result.email ?? teacher.email,
          password: nextPassword || undefined,
        });
        setPassword("");
        setShowPassword(false);
        setClientError(null);
      }
      return result;
    },
    null
  );

  function closeModal() {
    setOpen(false);
    setSaved(null);
    setPassword("");
    setShowPassword(false);
    setClientError(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fullName = String(new FormData(form).get("fullName") ?? "").trim();
    const email = String(new FormData(form).get("email") ?? "").trim().toLowerCase();
    const passwordValue = password;

    if (!fullName || !email) {
      setClientError("Nome e e-mail são obrigatórios.");
      return;
    }
    if (passwordValue) {
      if (passwordValue.length < 8) {
        setClientError("A senha deve ter pelo menos 8 caracteres.");
        return;
      }
      if (!/[a-zA-Z]/.test(passwordValue) || !/[0-9]/.test(passwordValue)) {
        setClientError("A senha deve conter letras e números.");
        return;
      }
    }

    setClientError(null);
    const formData = buildMultipartFormData(form, [
      "teacherId",
      "fullName",
      "email",
      "password",
      "street",
      "streetNumber",
      "addressComplement",
      "city",
      "state",
      "avatarUrl",
      "removeAvatar",
    ]);
    if (passwordValue) formData.set("password", passwordValue);
    startTransition(() => formAction(formData));
  }

  const displayError = clientError ?? state?.error;

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="gap-1.5"
        onClick={() => setOpen(true)}
        aria-label={`Editar ${teacher.fullName}`}
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
        Editar
      </Button>
      <Modal open={open} onClose={closeModal} title={`Editar professor — ${teacher.fullName}`} size="lg">
        {saved ? (
          <div className="space-y-3 text-sm">
            <p className="font-medium text-emerald-800 dark:text-emerald-200">
              Professor atualizado com sucesso.
            </p>
            <p>
              E-mail de acesso: <strong>{saved.email}</strong>
            </p>
            {saved.password ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                Nova senha definida: <strong className="font-mono">{saved.password}</strong>
                <span className="mt-1 block text-xs opacity-90">
                  Anote agora — por segurança, a senha anterior não pode ser exibida depois de salva.
                </span>
              </p>
            ) : (
              <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                A senha de acesso permanece a mesma. Para trocá-la, edite novamente e preencha o campo &quot;Nova senha&quot;.
              </p>
            )}
            <Button type="button" onClick={closeModal} className="w-full">
              Fechar
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="hidden" name="teacherId" value={teacher.id} />

            <div>
              <Label htmlFor={`teacher-name-${teacher.id}`}>Nome completo</Label>
              <Input
                id={`teacher-name-${teacher.id}`}
                name="fullName"
                required
                defaultValue={teacher.fullName}
              />
            </div>
            <div>
              <Label htmlFor={`teacher-email-${teacher.id}`}>E-mail</Label>
              <Input
                id={`teacher-email-${teacher.id}`}
                name="email"
                type="email"
                required
                autoComplete="email"
                defaultValue={teacher.email}
              />
            </div>

            <div>
              <Label htmlFor={`teacher-password-${teacher.id}`}>Nova senha (opcional)</Label>
              <div className="relative">
                <Input
                  id={`teacher-password-${teacher.id}`}
                  name="password"
                  type={showPassword ? "text" : "password"}
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Deixe em branco para manter a senha atual"
                  className="pr-11"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-2 top-1/2 flex min-h-9 min-w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-black/5 dark:hover:bg-white/10"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                A senha atual é criptografada e não pode ser exibida. Defina uma nova senha aqui se precisar
                alterá-la.
              </p>
            </div>

            <AvatarUploadField
              previewName={teacher.fullName}
              currentAvatarUrl={teacher.avatarUrl}
            />

            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-800">Endereço</h3>
              <StreetAddressFields
                idPrefix={`edit-teacher-${teacher.id}`}
                defaultStreet={teacher.street ?? ""}
                defaultStreetNumber={teacher.streetNumber ?? ""}
                defaultComplement={teacher.addressComplement ?? ""}
              />
              <LocationFields
                idPrefix={`edit-teacher-${teacher.id}`}
                defaultCity={teacher.city ?? ""}
                defaultState={teacher.state ?? ""}
              />
            </section>

            {displayError && <p className="text-sm text-red-600">{displayError}</p>}
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Salvando..." : "Salvar alterações"}
            </Button>
          </form>
        )}
      </Modal>
    </>
  );
}
