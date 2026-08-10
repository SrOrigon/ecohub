"use client";

import { useTransition } from "react";
import { exportGradesCsvAction } from "@/actions/product-suite";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export function ExportGradesButton() {
  const [pending, startTransition] = useTransition();

  function handleExport() {
    startTransition(async () => {
      const result = await exportGradesCsvAction();
      if (!result.csv) return;
      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `notas-eduhub-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <Button type="button" variant="outline" size="sm" disabled={pending} onClick={handleExport} className="gap-2">
      <Download className="h-4 w-4" aria-hidden="true" />
      {pending ? "Exportando…" : "Exportar notas CSV"}
    </Button>
  );
}
