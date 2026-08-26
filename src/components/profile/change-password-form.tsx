"use client";

import { useActionState, useMemo, useState } from "react";
import { changePasswordAction } from "@/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/form-fields";
import { cn } from "@/lib/utils";

function getPasswordStrength(password: string) {
  if (!password) return { score: 0, label: "", color: "bg-slate-200" };

  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 1, label: "Fraca", color: "bg-red-500" };
  if (score <= 3) return { score: 2, label: "Razoável", color: "bg-amber-500" };
  return { score: 3, label: "Forte", color: "bg-emerald-500" };
}

function PasswordField({
  id,
  name,
  label,
  autoComplete,
  onValueChange,
}: {
  id: string;
  name: string;
  label: string;
  autoComplete: string;
  onValueChange?: (value: string) => void;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        type="password"
        minLength={name === "newPassword" || name === "confirmPassword" ? 6 : undefined}
        required
        autoComplete={autoComplete}
        onChange={(e) => onValueChange?.(e.target.value)}
      />
    </div>
  );
}

export function ChangePasswordForm() {
  const [newPassword, setNewPassword] = useState("");

  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean; message?: string } | null, formData: FormData) =>
      changePasswordAction(formData),
    null
  );

  const strength = useMemo(() => getPasswordStrength(newPassword), [newPassword]);

  return (
    <form action={formAction} className="space-y-4">
      <ul className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
        <li>• Mínimo de 6 caracteres</li>
        <li>• Deve ser diferente da senha atual</li>
        <li>• Combine letras, números e símbolos para uma senha mais forte</li>
      </ul>

      <PasswordField
        id="currentPassword"
        name="currentPassword"
        label="Senha atual"
        autoComplete="current-password"
      />
      <div className="space-y-2">
        <PasswordField
          id="newPassword"
          name="newPassword"
          label="Nova senha"
          autoComplete="new-password"
          onValueChange={setNewPassword}
        />
        {newPassword.length > 0 && (
          <div className="space-y-1.5" aria-live="polite">
            <div className="flex gap-1">
              {[1, 2, 3].map((level) => (
                <div
                  key={level}
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-colors",
                    level <= strength.score ? strength.color : "bg-slate-200"
                  )}
                />
              ))}
            </div>
            <p className="text-xs text-slate-600">
              Força da senha: <span className="font-medium">{strength.label}</span>
            </p>
          </div>
        )}
      </div>
      <PasswordField
        id="confirmPassword"
        name="confirmPassword"
        label="Confirmar nova senha"
        autoComplete="new-password"
      />

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {state.error}
        </p>
      )}
      {state?.success && state.message && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">
          {state.message}
        </p>
      )}
      <Button type="submit" variant="secondary" disabled={pending} className="w-full sm:w-auto" size="lg">
        {pending ? "Alterando..." : "Alterar senha"}
      </Button>
    </form>
  );
}
