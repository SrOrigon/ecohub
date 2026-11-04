"use client";

import { useActionState } from "react";
import { applyClassTuitionPlanAction, upsertStudentFinanceAction } from "@/actions/student-finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Select } from "@/components/ui/form-fields";
import type { InstitutionTuitionClass, InstitutionTuitionPlan } from "@/lib/institution-tuition";

function reaisInput(cents: number) {
  if (cents <= 0) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}

export function InstitutionTuitionPlans({
  classes,
  plans,
}: {
  classes: InstitutionTuitionClass[];
  plans: InstitutionTuitionPlan[];
}) {
  const [classState, classAction, classPending] = useActionState(
    async (_prev: { error?: string; success?: boolean; message?: string } | null, formData: FormData) =>
      applyClassTuitionPlanAction(formData),
    null
  );
  const missing = plans.filter((plan) => plan.monthlyAmountCents <= 0).length;

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Valores da instituição</h2>
        <p className="mt-1 text-sm text-slate-600">
          Mensalidade, dia de vencimento, parcelas e desconto são definidos aqui pela escola.
          Sem um valor salvo, o aluno não entra em cobrança nem recebe aviso no WhatsApp.
        </p>
        <p className="mt-2 text-sm font-medium text-slate-800">
          {missing === 0
            ? "Todos os alunos já têm mensalidade definida pela instituição."
            : `${missing} aluno(s) ainda sem valor definido.`}
        </p>
      </div>

      <form action={classAction} className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4 md:grid-cols-6">
        <div className="md:col-span-2">
          <Label htmlFor="classId">Aplicar na turma</Label>
          <Select id="classId" name="classId" defaultValue="">
            <option value="">Escolha a turma</option>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.studentCount})
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="classMonthlyAmount">Valor (R$)</Label>
          <Input id="classMonthlyAmount" name="monthlyAmount" placeholder="Valor" inputMode="decimal" required />
        </div>
        <div>
          <Label htmlFor="classDueDay">Vencimento</Label>
          <Input id="classDueDay" name="dueDay" type="number" min={1} max={28} placeholder="Dia" required />
        </div>
        <div>
          <Label htmlFor="classInstallments">Parcelas</Label>
          <Input id="classInstallments" name="expectedInstallments" type="number" min={1} max={24} placeholder="Qtd." required />
        </div>
        <div>
          <Label htmlFor="classDiscount">Desconto %</Label>
          <Input id="classDiscount" name="discountPercent" placeholder="0" inputMode="decimal" />
        </div>
        <div className="md:col-span-6 flex flex-wrap items-center gap-3">
          <Button type="submit" size="sm" disabled={classPending}>
            {classPending ? "Aplicando..." : "Salvar valor da turma"}
          </Button>
          {classState?.error && <p className="text-sm text-red-600">{classState.error}</p>}
          {classState?.message && <p className="text-sm text-emerald-700">{classState.message}</p>}
        </div>
      </form>

      <p className="text-sm text-slate-600">
        O valor de um aluno específico fica na caixa dele, ao lado da lista.
      </p>
    </section>
  );
}

export function StudentPlanRow({ plan }: { plan: InstitutionTuitionPlan }) {
  const [state, action, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) =>
      upsertStudentFinanceAction(formData),
    null
  );

  return (
    <form action={action} className="grid gap-2 rounded-xl border border-slate-100 p-3 md:grid-cols-12 md:items-end">
      <input type="hidden" name="studentId" value={plan.studentId} />
      <div className="md:col-span-3">
        <p className="text-sm font-medium text-slate-900">{plan.studentName}</p>
        <p className="text-xs text-slate-500">
          {plan.className ?? "Sem turma"}
          {plan.monthlyAmountCents <= 0 ? " · sem valor" : ""}
        </p>
      </div>
      <div className="md:col-span-2">
        <Label htmlFor={`amount-${plan.studentId}`}>Valor (R$)</Label>
        <Input
          id={`amount-${plan.studentId}`}
          name="monthlyAmount"
          defaultValue={reaisInput(plan.monthlyAmountCents)}
          placeholder="Definir"
          inputMode="decimal"
        />
      </div>
      <div className="md:col-span-2">
        <Label htmlFor={`due-${plan.studentId}`}>Dia</Label>
        <Input
          id={`due-${plan.studentId}`}
          name="dueDay"
          type="number"
          min={1}
          max={28}
          defaultValue={plan.monthlyAmountCents > 0 ? plan.dueDay : ""}
          placeholder="Dia"
        />
      </div>
      <div className="md:col-span-2">
        <Label htmlFor={`parc-${plan.studentId}`}>Parcelas</Label>
        <Input
          id={`parc-${plan.studentId}`}
          name="expectedInstallments"
          type="number"
          min={1}
          max={24}
          defaultValue={plan.monthlyAmountCents > 0 ? plan.expectedInstallments : ""}
          placeholder="Qtd."
        />
      </div>
      <div className="md:col-span-1">
        <Label htmlFor={`desc-${plan.studentId}`}>Desc. %</Label>
        <Input
          id={`desc-${plan.studentId}`}
          name="discountPercent"
          defaultValue={plan.monthlyAmountCents > 0 ? String(plan.discountPercent) : ""}
          placeholder="0"
          inputMode="decimal"
        />
      </div>
      <div className="md:col-span-2">
        <Button type="submit" size="sm" variant="secondary" disabled={pending} className="w-full">
          {pending ? "Salvando..." : "Salvar"}
        </Button>
        {state?.error && <p className="mt-1 text-xs text-red-600">{state.error}</p>}
        {state?.success && <p className="mt-1 text-xs text-emerald-700">Salvo pela instituição.</p>}
      </div>
    </form>
  );
}
