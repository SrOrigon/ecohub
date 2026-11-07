"use client";

import { Button } from "@/components/ui/button";

export function ReportTableActions({
  title,
  columns,
  rows,
}: {
  title: string;
  columns: string[];
  rows: string[][];
}) {
  function download() {
    const lines = [columns, ...rows].map((line) =>
      line.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(";")
    );
    const blob = new Blob([`\uFEFF${lines.join("\n")}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.toLowerCase().replaceAll(" ", "-")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="no-print flex flex-wrap gap-2">
      <Button type="button" size="sm" variant="outline" onClick={download}>
        Excel
      </Button>
      <Button type="button" size="sm" onClick={() => window.print()}>
        Imprimir
      </Button>
    </div>
  );
}
