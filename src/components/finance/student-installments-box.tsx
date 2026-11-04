"use client";

import { useEffect, useMemo, useState } from "react";
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
  open,
  onClose,
  studentId,
  studentName,
  className,
  discountPercent,
  charges,
  canSettle,
}: {
  open: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
  className: string | null;
  discountPercent: number;
  charges: BillingCharge[];
  canSettle: boolean;
}) {
  const router = useRouter();
  const rows = useMemo(
    () => [...charges].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()),
    [charges]
  );
  const summary = useMemo(() => summarizeCharges(rows), [rows]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = rows.find((row) => row.id === selectedId) ?? null;
  const [state, formAction, pending] = useActionState(
    async (
      _prev: { error?: string; success?: boolean; message?: string } | null,
      formData: FormData
    ) => recordTuitionPaymentAction(formData),
    null
  );

  useEffect(() => {
    if (!open) setSelectedId(null);
  }, [open]);

  useEffect(() => {
    if (state?.success) {
      setSelectedId(null);
      router.refresh();
    }
  }, [state, router]);

  const canQuit = Boolean(selected && selected.standing !== "paid" && canSettle && !pending);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={`Mensalidades de ${studentName}`}
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600" role="status">
            {state?.error
              ? state.error
              : state?.message
                ? state.message
                : selected
                  ? selected.standing === "paid"
                    ? "Essa parcela já está quitada."
                    : "A parcela marcada será registrada como paga."
                  : "Marque uma parcela em aberto para quitar."}
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
                <input type="hidden" name="dueDate" value={selected ? toDateInput(selected.dueDate) : ""} />
                <Button type="submit" size="sm" disabled={!canQuit}>
                  {pending ? "Quitando..." : "$ Quitar"}
                </Button>
              </form>
            )}
          </div>
        </div>
      }
    >
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
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-[46rem] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-10 px-3 py-2" />
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
                          checked={selectedId === row.id}
                          onChange={() => setSelectedId(selectedId === row.id ? null : row.id)}
                          aria-label={`Selecionar parcela ${index + 1}`}
                        />
                      </td>
                      <td className="px-3 py-2 tabular-nums">{index + 1}</td>
                      <td className="px-3 py-2 tabular-nums">{index + 1}</td>
                      <td className="px-3 py-2">{row.title || "Mensalidade"}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{formatDate(row.dueDate)}</td>
                      <td className="px-3 py-2 whitespace-nowrap tabular-nums">{formatBRL(row.amountCents)}</td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-2">
                          <StandingDot standing={row.standing} />
                          <span className="sr-only">{row.standingLabel}</span>
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">{paid && row.paidAt ? formatDate(row.paidAt) : "—"}</td>
                      <td className="px-3 py-2 whitespace-nowrap tabular-nums">{paid ? formatBRL(row.amountCents) : "—"}</td>
                      <td className="px-3 py-2">{discountPercent > 0 ? `${discountPercent}%` : "—"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
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
