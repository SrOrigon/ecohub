"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button, buttonVariants } from "@/components/ui/button";
import { StandingDot } from "@/components/finance/billing-charges-board";
import { recordTuitionPaymentAction } from "@/actions/student-finance";
import { formatBRL } from "@/lib/student-finance";
import { summarizeCharges, type BillingCharge } from "@/lib/billing-status";
import { cn, formatDate } from "@/lib/utils";

export function StudentInstallmentsBox({
  open = true,
  onClose,
  studentId,
  studentName,
  className,
  discountPercent,
  charges,
  canSettle,
  embedded = false,
}: {
  open?: boolean;
  onClose?: () => void;
  studentId: string;
  studentName: string;
  className: string | null;
  discountPercent: number;
  charges: BillingCharge[];
  canSettle: boolean;
  embedded?: boolean;
}) {
  const router = useRouter();
  const rows = useMemo(
    () => [...charges].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()),
    [charges]
  );
  const summary = useMemo(() => summarizeCharges(rows), [rows]);
  const openRows = rows.filter((row) => row.standing !== "paid");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectedOpen = openRows.filter((row) => selectedIds.includes(row.id));
  const allOpenSelected = openRows.length > 0 && selectedOpen.length === openRows.length;
  const selectAllRef = useRef<HTMLInputElement>(null);
  const [state, formAction, pending] = useActionState(
    async (
      _prev: { error?: string; success?: boolean; message?: string } | null,
      formData: FormData
    ) => recordTuitionPaymentAction(formData),
    null
  );

  useEffect(() => {
    setSelectedIds([]);
  }, [studentId, open]);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = selectedOpen.length > 0 && !allOpenSelected;
    }
  }, [selectedOpen.length, allOpenSelected]);

  useEffect(() => {
    if (state?.success) {
      setSelectedIds([]);
      router.refresh();
    }
  }, [state, router]);

  function toggleRow(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  function toggleAll() {
    setSelectedIds(allOpenSelected ? [] : openRows.map((row) => row.id));
  }

  const statusText = state?.error
    ? state.error
    : state?.message
      ? state.message
      : selectedOpen.length === 0
        ? "Marque as parcelas em aberto, ou use selecionar tudo."
        : selectedOpen.length === 1
          ? "1 parcela marcada será registrada como paga."
          : `${selectedOpen.length} parcelas marcadas serão registradas como pagas.`;

  const footer = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-600" role="status">
        {statusText}
      </p>
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/dashboard/alunos/${studentId}?aba=financeiro`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Editar
        </Link>
        {canSettle && (
          <form action={formAction}>
            <input type="hidden" name="studentId" value={studentId} />
            {selectedOpen.map((row) => (
              <input key={row.id} type="hidden" name="dueDate" value={toDateInput(row.dueDate)} />
            ))}
            <Button type="submit" size="sm" disabled={selectedOpen.length === 0 || pending}>
              {pending ? "Quitando..." : selectedOpen.length > 1 ? `$ Quitar ${selectedOpen.length}` : "$ Quitar"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );

  const body = (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-md bg-violet-700 px-3 py-1 text-sm font-semibold text-white">Mensalidades</span>
        <p className="text-sm text-slate-600">
          {className ?? "Sem turma"}
          {discountPercent > 0 ? ` · Bolsa ${discountPercent}%` : ""}
        </p>
      </div>
      <p className="text-sm font-medium text-slate-800">
        {rows.length === 0
          ? "A instituição ainda não definiu as parcelas deste aluno."
          : `Pagou ${summary.paidCount} parcela(s). Faltam ${summary.unpaidCount}.`}
      </p>
      <div className={cn("overflow-auto rounded-xl border border-slate-200", embedded && "max-h-[28rem]")}>
        <table className="min-w-[46rem] w-full text-left text-sm">
          <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="w-10 px-3 py-2">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={allOpenSelected}
                  disabled={openRows.length === 0}
                  onChange={toggleAll}
                  aria-label="Selecionar todas as parcelas em aberto"
                />
              </th>
              <th className="px-3 py-2">Nº</th>
              <th className="px-3 py-2">Parc.</th>
              <th className="px-3 py-2">Categoria</th>
              <th className="px-3 py-2">Data ven.</th>
              <th className="px-3 py-2">Valor</th>
              <th className="px-3 py-2">Sit.</th>
              <th className="px-3 py-2">Data pgto.</th>
              <th className="px-3 py-2">Valor pago</th>
              <th className="px-3 py-2">Bolsa de desconto</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 py-6 text-center text-slate-500">
                  Nenhuma mensalidade lançada.
                </td>
              </tr>
            ) : (
              rows.map((row, index) => {
                const paid = row.standing === "paid";
                return (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={!paid && selectedIds.includes(row.id)}
                        disabled={paid}
                        onChange={() => toggleRow(row.id)}
                        aria-label={`Selecionar parcela ${index + 1}`}
                      />
                    </td>
                    <td className="px-3 py-2 tabular-nums">{index + 1}</td>
                    <td className="px-3 py-2 tabular-nums">{index + 1}</td>
                    <td className="px-3 py-2">{row.title || "Mensalidade"}</td>
                    <td className="whitespace-nowrap px-3 py-2">{formatDate(row.dueDate)}</td>
                    <td className="whitespace-nowrap px-3 py-2 tabular-nums">{formatBRL(row.amountCents)}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-2">
                        <StandingDot standing={row.standing} />
                        <span className="sr-only">{row.standingLabel}</span>
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">{paid && row.paidAt ? formatDate(row.paidAt) : "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2 tabular-nums">{paid ? formatBRL(row.amountCents) : "—"}</td>
                    <td className="px-3 py-2">{discountPercent > 0 ? `${discountPercent}%` : "—"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (embedded) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3">
          <h3 className="font-semibold text-slate-900">Mensalidades de {studentName}</h3>
        </div>
        <div className="p-4">{body}</div>
        <div className="border-t border-slate-100 px-4 py-3">{footer}</div>
      </section>
    );
  }

  return (
    <Modal open={open} onClose={onClose ?? (() => undefined)} size="xl" title={`Mensalidades de ${studentName}`} footer={footer}>
      {body}
    </Modal>
  );
}

function toDateInput(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
