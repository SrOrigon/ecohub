"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteStudentAction } from "@/actions/crud";
import { Button } from "@/components/ui/button";

export function DeleteStudentButton({ studentId, studentName }: { studentId: string; studentName: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      const typed = window.prompt(
        `Esta exclusão apaga os dados de ${studentName} e não pode ser desfeita. Baixe os dados antes, se a família pediu uma cópia. Digite o nome completo para confirmar.`
      );
      if (typed?.trim() !== studentName.trim()) {
        return { error: "O nome não confere. Nada foi excluído." };
      }
      formData.set("confirmName", typed.trim());
      const result = await deleteStudentAction(formData);
      if (result.success) router.push("/dashboard/alunos");
      return result;
    },
    null
  );

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="studentId" value={studentId} />
      <a
        href={`/api/alunos/${studentId}/dados`}
        className="inline-flex h-8 items-center rounded-md border border-slate-200 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
      >
        Baixar dados
      </a>
      <Button
        type="submit"
        variant="outline"
        size="sm"
        disabled={pending}
        className="gap-1.5 border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        {pending ? "Excluindo..." : "Excluir"}
      </Button>
      {state?.error && state.error !== "Cancelado." && (
        <p className="mt-1 text-xs text-red-600">{state.error}</p>
      )}
    </form>
  );
}
