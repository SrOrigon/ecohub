"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deletePersonalNoteAction } from "@/actions/personal-notes";
import { Trash2 } from "lucide-react";

export function DeleteNoteButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    if (!confirm("Excluir esta anotação?")) return;
    const fd = new FormData();
    fd.set("id", id);
    startTransition(async () => {
      await deletePersonalNoteAction(fd);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={pending}
      className="icon-btn !min-h-9 !min-w-9 text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/30"
      aria-label="Excluir anotação"
    >
      <Trash2 className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
