"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ActionResult = { error?: string; success?: boolean } | void;

export function DeleteConfirmButton({
  label,
  confirmMessage,
  hiddenFields,
  action,
  variant = "ghost",
  size = "sm",
  className,
  iconOnly = false,
  disabled,
  redirectTo,
}: {
  label: string;
  confirmMessage: string;
  hiddenFields: Record<string, string>;
  action: (formData: FormData) => Promise<ActionResult>;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
  iconOnly?: boolean;
  disabled?: boolean;
  /** Após exclusão bem-sucedida, navega para esta rota em vez de só atualizar. */
  redirectTo?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleClick() {
    if (!confirm(confirmMessage)) return;
    setError(null);

    const formData = new FormData();
    for (const [key, value] of Object.entries(hiddenFields)) {
      formData.set(key, value);
    }

    startTransition(async () => {
      const result = await action(formData);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      if (redirectTo) {
        router.push(redirectTo);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="inline-flex flex-col items-start">
      <Button
        type="button"
        variant={variant}
        size={size}
        className={cn(
          "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30",
          className
        )}
        onClick={handleClick}
        disabled={disabled || pending}
      >
        {iconOnly ? (
          <>
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">{label}</span>
          </>
        ) : (
          <>
            <Trash2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
            {pending ? "Excluindo..." : label}
          </>
        )}
      </Button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
