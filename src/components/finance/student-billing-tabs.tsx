"use client";

import { useMemo, useState } from "react";
import { StudentInstallmentsBox } from "@/components/finance/student-installments-box";
import { StudentPlanRow } from "@/components/finance/institution-tuition-plans";
import { Input } from "@/components/ui/input";
import { Label, Select } from "@/components/ui/form-fields";
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
  const [query, setQuery] = useState("");
  const [classId, setClassId] = useState("");

  const classes = useMemo(() => {
    const map = new Map<string, string>();
    for (const plan of plans) {
      if (plan.classId && plan.className) map.set(plan.classId, plan.className);
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  }, [plans]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return plans.filter((plan) => {
      if (classId && plan.classId !== classId) return false;
      if (!term) return true;
      return (
        plan.studentName.toLowerCase().includes(term) ||
        (plan.className ?? "").toLowerCase().includes(term)
      );
    });
  }, [plans, query, classId]);

  const selected = visible.find((plan) => plan.studentId === studentId) ?? visible[0] ?? null;
  const selectedCharges = selected ? charges.filter((charge) => charge.studentId === selected.studentId) : [];
  const school = summarizeCharges(charges);

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Caixa de mensalidades</h2>
        <p className="mt-1 text-sm text-slate-600">
          A lista de alunos fica ao lado. As parcelas do aluno escolhido aparecem na hora, sem descer a página.
          {school.total > 0
            ? ` ${school.paidCount} pagas no total e ${school.unpaidCount} ainda em aberto.`
            : ""}
        </p>
      </div>

      {plans.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Nenhum aluno cadastrado. A instituição inclui os alunos e, em seguida, define as parcelas de cada um.
        </p>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="space-y-2 border-b border-slate-100 p-3">
              <div>
                <Label htmlFor="studentTabSearch">Buscar aluno</Label>
                <Input
                  id="studentTabSearch"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Nome ou turma"
                />
              </div>
              {classes.length > 1 && (
                <div>
                  <Label htmlFor="studentClassFilter">Turma</Label>
                  <Select id="studentClassFilter" value={classId} onChange={(event) => setClassId(event.target.value)}>
                    <option value="">Todas</option>
                    {classes.map(([id, name]) => (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
            </div>
            <ul className="max-h-[32rem] overflow-y-auto">
              {visible.length === 0 ? (
                <li className="px-3 py-4 text-sm text-slate-500">Nenhum aluno encontrado.</li>
              ) : (
                visible.map((plan) => {
                  const summary = summarizeCharges(charges.filter((charge) => charge.studentId === plan.studentId));
                  const active = selected?.studentId === plan.studentId;
                  return (
                    <li key={plan.studentId} className="border-b border-slate-100 last:border-b-0">
                      <button
                        type="button"
                        onClick={() => setStudentId(plan.studentId)}
                        className={cn(
                          "flex w-full flex-col items-start px-3 py-2 text-left",
                          active ? "bg-indigo-50" : "hover:bg-slate-50"
                        )}
                      >
                        <span className={cn("text-sm font-medium", active ? "text-indigo-800" : "text-slate-900")}>
                          {plan.studentName}
                        </span>
                        <span className="text-xs text-slate-500">
                          {summary.total === 0
                            ? "Sem parcelas"
                            : `Pagou ${summary.paidCount} · faltam ${summary.unpaidCount}`}
                        </span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>

          {selected ? (
            <div className="space-y-3">
              <StudentPlanRow key={selected.studentId} plan={selected} />
              <StudentInstallmentsBox
                key={selected.studentId}
                embedded
                studentId={selected.studentId}
                studentName={selected.studentName}
                className={selected.className}
                discountPercent={selected.discountPercent}
                charges={selectedCharges}
                canSettle={canCharge}
              />
            </div>
          ) : (
            <p className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600">
              Nenhum aluno neste filtro.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
