"use client";

import { useMemo, useState } from "react";
import { BillingChargesBoard } from "@/components/finance/billing-charges-board";
import { StudentInstallmentsBox } from "@/components/finance/student-installments-box";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/form-fields";
import { summarizeCharges, type BillingCharge } from "@/lib/billing-status";
import type { InstitutionTuitionPlan } from "@/lib/institution-tuition";
import { cn } from "@/lib/utils";

export function StudentBillingTabs({
  plans,
  charges,
  canCharge,
  initialStudentId = null,
}: {
  plans: InstitutionTuitionPlan[];
  charges: BillingCharge[];
  canCharge: boolean;
  initialStudentId?: string | null;
}) {
  const [studentId, setStudentId] = useState<string | null>(initialStudentId);
  const [boxStudentId, setBoxStudentId] = useState<string | null>(initialStudentId);
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
  const boxStudent = plans.find((plan) => plan.studentId === boxStudentId) ?? null;
  const studentCharges = selected ? charges.filter((charge) => charge.studentId === selected.studentId) : charges;
  const boxCharges = boxStudent ? charges.filter((charge) => charge.studentId === boxStudent.studentId) : [];

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Caixa de mensalidades</h2>
        <p className="mt-1 text-sm text-slate-600">
          Cada aluno tem a própria caixa, com as parcelas, a situação e quantas já foram pagas.
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

      {plans.length > 0 && (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {visible.map((plan) => {
            const summary = summarizeCharges(charges.filter((charge) => charge.studentId === plan.studentId));
            return (
              <li key={plan.studentId} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-slate-900">{plan.studentName}</p>
                  <p className="text-sm text-slate-500">
                    {plan.className ?? "Sem turma"}
                    {summary.total === 0
                      ? " · Sem parcelas"
                      : ` · Pagou ${summary.paidCount}. Faltam ${summary.unpaidCount}.`}
                  </p>
                </div>
                <Button type="button" size="sm" onClick={() => setBoxStudentId(plan.studentId)}>
                  Mensalidades
                </Button>
              </li>
            );
          })}
          {visible.length === 0 && <li className="px-4 py-3 text-sm text-slate-500">Nenhum aluno encontrado.</li>}
        </ul>
      )}

      {selected && (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <p className="font-semibold text-slate-900">{selected.studentName}</p>
          <p className="text-sm text-slate-500">{selected.className ?? "Sem turma"}</p>
        </div>
      )}

      {boxStudent && (
        <StudentInstallmentsBox
          open
          onClose={() => setBoxStudentId(null)}
          studentId={boxStudent.studentId}
          studentName={boxStudent.studentName}
          className={boxStudent.className}
          discountPercent={boxStudent.discountPercent}
          charges={boxCharges}
          canSettle={canCharge}
        />
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
