"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileUp } from "lucide-react";
import { BulkImportModal } from "./bulk-import-modal";

export function BulkImportTrigger() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 sm:w-auto"
      >
        <FileUp className="h-4 w-4" />
        Importar Alunos (.CSV)
      </Button>

      <BulkImportModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
