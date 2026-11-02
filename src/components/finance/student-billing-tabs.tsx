"use client";

import { useMemo, useState } from "react";
import { BillingChargesBoard } from "@/components/finance/billing-charges-board";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/form-fields";
import type { BillingCharge } from "@/lib/billing-status";
import type { InstitutionTuitionPlan } from "@/lib/institution-tuition";
import { cn } from "@/lib/utils";

export function StudentBillingTabs({
  plans,
  charges,
  canCharge,
}: {
  plans: InstitutionTuitionPlan[];
  charges: BillingCharge[];
  canCharge: boolean;
}) {
  const [studentId, setStudentId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return plans;
    return plans.filter(
      (plan) =>
        plan.studentName.toLowerCase().includes(term) ||
        (plan.className ?? "").toLowerCase().includes(term)
    );
  }, [plans, query]);

  const selected = plans.find((plan) => plan.studentId === studentId) ?? null;
  const studentCharges = selected ? charges.filter((charge) => charge.studentId === selected.studentId) : charges;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Abas dos alunos</h2>
        <p className="mt-1 text-sm text-slate-600">
          Abra a aba de um aluno para ver o status financeiro dele, quantas parcelas já pagou e quantas ainda faltam.
        </p>
      </div>

      <div className="max-w-sm">
        <Label htmlFor="studentTabSearch">Buscar aluno</Label>
        <Input
          id="studentTabSearch"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Nome ou turma"
        />
      </div>

      {plans.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Nenhum aluno cadastrado. A instituição inclui os alunos e, em seguida, define as parcelas de cada um.
        </p>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <TabButton active={!selected} onClick={() => setStudentId(null)}>
            Todos
          </TabButton>
          {visible.map((plan) => (
            <TabButton
              key={plan.studentId}
              active={selected?.studentId === plan.studentId}
              onClick={() => setStudentId(plan.studentId)}
            >
              {plan.studentName}
            </TabButton>
          ))}
          {visible.length === 0 && (
            <p className="self-center text-sm text-slate-500">Nenhum aluno encontrado.</p>
          )}
        </div>
      )}

      {selected && (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <p className="font-semibold text-slate-900">{selected.studentName}</p>
          <p className="text-sm text-slate-500">{selected.className ?? "Sem turma"}</p>
        </div>
      )}

      <BillingChargesBoard
        key={selected?.studentId ?? "all"}
        charges={studentCharges}
        canCharge={canCharge}
        studentId={selected?.studentId}
        initialFilter={selected ? "all" : "pending"}
      />
    </section>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-4 py-2 text-sm font-medium",
        active ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
      )}
    >
      {children}
    </button>
  );
}
