"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/form-fields";
import { Input } from "@/components/ui/input";

interface FilterBarProps {
  currentMonth: number;
  currentYear: number;
  currentClassId: string;
  currentSearch: string;
  currentStatus: string;
  classes: { id: string; name: string }[];
}

const MONTHS = [
  { value: 1, label: "Janeiro" },
  { value: 2, label: "Fevereiro" },
  { value: 3, label: "Março" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Maio" },
  { value: 6, label: "Junho" },
  { value: 7, label: "Julho" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" },
  { value: 12, label: "Dezembro" },
];

const YEARS = [2024, 2025, 2026, 2027];

const STATUS_OPTIONS = [
  { value: "", label: "Todos os status" },
  { value: "present", label: "Presente" },
  { value: "absent", label: "Falta" },
  { value: "late", label: "Atraso" },
  { value: "justified", label: "Justificada" },
];

export function AttendanceFilterBar({
  currentMonth,
  currentYear,
  currentClassId,
  currentSearch,
  currentStatus,
  classes,
}: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="filter-month" className="text-xs font-semibold uppercase text-slate-500">
          Mês:
        </label>
        <Select
          id="filter-month"
          value={String(currentMonth)}
          onChange={(e) => updateFilter("month", e.target.value)}
          className="h-9 text-xs"
        >
          {MONTHS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </Select>

        <label htmlFor="filter-year" className="text-xs font-semibold uppercase text-slate-500">
          Ano:
        </label>
        <Select
          id="filter-year"
          value={String(currentYear)}
          onChange={(e) => updateFilter("year", e.target.value)}
          className="h-9 text-xs"
        >
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="filter-class" className="text-xs font-semibold uppercase text-slate-500">
          Turma:
        </label>
        <Select
          id="filter-class"
          value={currentClassId}
          onChange={(e) => updateFilter("classId", e.target.value)}
          className="h-9 text-xs min-w-[9rem]"
        >
          <option value="">Todas as Turmas</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>

        <label htmlFor="filter-status" className="text-xs font-semibold uppercase text-slate-500">
          Status:
        </label>
        <Select
          id="filter-status"
          value={currentStatus}
          onChange={(e) => updateFilter("status", e.target.value)}
          className="h-9 text-xs"
        >
          {STATUS_OPTIONS.map((st) => (
            <option key={st.value} value={st.value}>
              {st.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="ml-auto w-full sm:w-48">
        <Input
          type="search"
          placeholder="Buscar por aluno..."
          value={currentSearch}
          onChange={(e) => updateFilter("q", e.target.value)}
          className="h-9 text-xs"
        />
      </div>
    </div>
  );
}
