"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import type { ReportDefinition } from "@/lib/report-catalog";

export function ReportCatalogNav({
  reports,
  active,
}: {
  reports: ReportDefinition[];
  active?: string;
}) {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return reports;
    return reports.filter(
      (item) => item.title.toLowerCase().includes(term) || item.group.toLowerCase().includes(term)
    );
  }, [query, reports]);
  const groups = [...new Set(visible.map((item) => item.group))];

  return (
    <div className="space-y-3">
      <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Localizar relatório" />
      {groups.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum relatório com esse nome.</p>
      ) : (
        groups.map((group) => (
          <div key={group} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <p className="bg-slate-800 px-3 py-2 text-sm font-semibold text-white">{group}</p>
            <ul>
              {visible
                .filter((item) => item.group === group)
                .map((item) => (
                  <li key={item.id} className="border-t border-slate-100">
                    <Link
                      href={`/dashboard/relatorios?tipo=${item.id}`}
                      className={`block px-3 py-2 text-sm ${
                        active === item.id ? "bg-indigo-50 font-semibold text-indigo-800" : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {item.title}
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
        ))
      )}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <p className="bg-slate-800 px-3 py-2 text-sm font-semibold text-white">Atalho</p>
        <Link href="/dashboard/documentos" className="block border-t border-slate-100 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
          Abrir editor de documentos
        </Link>
      </div>
    </div>
  );
}
