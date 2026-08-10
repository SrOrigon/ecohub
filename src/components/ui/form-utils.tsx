"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface SubmitButtonProps {
  label?: string;
  pendingLabel?: string;
}

export function SubmitButton({ label = "Salvar", pendingLabel = "Salvando..." }: SubmitButtonProps) {
  const [pending, setPending] = useState(false);

  return (
    <Button
      type="submit"
      disabled={pending}
      onClick={() => setPending(true)}
    >
      {pending ? pendingLabel : label}
    </Button>
  );
}

export function FormMessage({ message }: { message?: { error?: string; success?: boolean } | null }) {
  if (!message?.error) return null;
  return (
    <p
      role="alert"
      aria-live="polite"
      className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200"
    >
      {message.error}
    </p>
  );
}
