"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button, buttonVariants } from "@/components/ui/button";
import { StandingDot } from "@/components/finance/billing-charges-board";
import { recordTuitionPaymentAction, saveStudentInstallmentsAction } from "@/actions/student-finance";
import { dispatchWhatsAppBillingAction } from "@/actions/whatsapp-billing";
import { formatBRL } from "@/lib/student-finance";
import { summarizeCharges, type BillingCharge } from "@/lib/billing-status";
import { cn, formatDate } from "@/lib/utils";

type DraftRow = {
  key: string;
  id: string;
  title: string;
  dueDate: string;
  amount: string;
  paymentMethod: string;
  paid: boolean;
  paidAt: string | null;
  standing: BillingCharge["standing"];
  amountCents: number;
  remove: boolean;
  locked: boolean;
};

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
  editHref,
  onOpenPlan,
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
  editHref?: string;
  onOpenPlan?: () => void;
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
  const [chargeNote, setChargeNote] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [charging, startCharge] = useTransition();
  const [state, formAction, pending] = useActionState(
    async (
      _prev: { error?: string; success?: boolean; message?: string } | null,
      formData: FormData
    ) => recordTuitionPaymentAction(formData),
    null
  );
  const [saveState, saveAction, savePending] = useActionState(
    async (
      _prev: { error?: string; success?: boolean; message?: string } | null,
      formData: FormData
    ) => saveStudentInstallmentsAction(formData),
    null
  );

  const knownMethods = useMemo(() => {
    const values = new Set<string>();
    for (const row of rows) {
      if (row.paymentMethod) values.add(row.paymentMethod);
    }
    return [...values];
  }, [rows]);

  useEffect(() => {
    setSelectedIds([]);
    setEditing(false);
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

  useEffect(() => {
    if (saveState?.success) {
      setEditing(false);
      setSelectedIds([]);
      router.refresh();
    }
  }, [saveState, router]);

  function startEditing() {
    setDrafts(rows.map((row, index) => toDraft(row, index)));
    setSelectedIds([]);
    setEditing(true);
  }

  function updateDraft(key: string, patch: Partial<DraftRow>) {
    setDrafts((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function addDraft() {
    setDrafts((current) => [
      ...current,
      {
        key: `new-${crypto.randomUUID()}`,
        id: "",
        title: "",
        dueDate: "",
        amount: "",
        paymentMethod: "",
        paid: false,
        paidAt: null,
        standing: "upcoming",
        amountCents: 0,
        remove: false,
        locked: false,
      },
    ]);
  }

  function removeSelected() {
    setDrafts((current) =>
      current.flatMap((row) => {
        if (row.paid || row.locked || !selectedIds.includes(row.key)) return [row];
        if (!row.id) return [];
        return [{ ...row, remove: true }];
      })
    );
    setSelectedIds([]);
  }

  function toggleRow(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  const visibleDrafts = drafts.filter((row) => !row.remove);
  const editableDrafts = visibleDrafts.filter((row) => !row.paid && !row.locked);
  const allDraftsSelected = editableDrafts.length > 0 && editableDrafts.every((row) => selectedIds.includes(row.key));

  function toggleAll() {
    if (editing) {
      setSelectedIds(allDraftsSelected ? [] : editableDrafts.map((row) => row.key));
      return;
    }
    setSelectedIds(allOpenSelected ? [] : openRows.map((row) => row.id));
  }

  function generateCharges() {
    setChargeNote(null);
    startCharge(async () => {
      const result = await dispatchWhatsAppBillingAction({ studentId });
      if ("error" in result) {
        setChargeNote(result.error);
        return;
      }
      setChargeNote(result.message);
      router.refresh();
    });
  }

  const statusText = saveState?.error
    ? saveState.error
    : saveState?.message
      ? saveState.message
      : state?.error
        ? state.error
        : state?.message
          ? state.message
          : editing
            ? "Altere a data, o valor e como cada parcela será paga. Depois salve."
            : selectedOpen.length === 0
              ? "Marque as parcelas em aberto, ou use selecionar tudo."
              : selectedOpen.length === 1
                ? "1 parcela marcada será registrada como paga."
                : `${selectedOpen.length} parcelas marcadas serão registradas como pagas.`;

  const footer = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-600" role="status">
        {chargeNote ?? statusText}
      </p>
      <div className="flex flex-wrap gap-2">
        {canSettle && !editing && (
          <Button type="button" size="sm" variant="outline" onClick={startEditing}>
            Editar parcelas
          </Button>
        )}
        {canSettle && editing && (
          <>
            <Button type="button" size="sm" variant="outline" onClick={addDraft}>
              Incluir
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={removeSelected} disabled={selectedIds.length === 0}>
              Excluir parcela
            </Button>
            <Button type="submit" size="sm" disabled={savePending}>
              {savePending ? "Salvando..." : "Salvar"}
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
          </>
        )}
        {!editing &&
          (onOpenPlan ? (
            <Button type="button" size="sm" variant="outline" onClick={onOpenPlan}>
              Dados do plano
            </Button>
          ) : (
            <Link
              href={editHref ?? `/dashboard/alunos/${studentId}?aba=financeiro#dados-do-plano`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Dados do plano
            </Link>
          ))}
        {canSettle && !editing && (
          <Button type="button" size="sm" variant="secondary" disabled={charging} onClick={generateCharges}>
            {charging ? "Gerando..." : "Gerar cobranças"}
          </Button>
        )}
        {canSettle && !editing && (
          <form action={formAction}>
            <input type="hidden" name="studentId" value={studentId} />
            {selectedOpen.map((row) => (
              <span key={row.id}>
                <input type="hidden" name="dueDate" value={toDateInput(row.dueDate)} />
                <input type="hidden" name="installmentId" value={row.source === "installment" ? row.id : ""} />
              </span>
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
        <table className="min-w-[58rem] w-full text-left text-sm">
          <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="w-10 px-3 py-2">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={editing ? allDraftsSelected : allOpenSelected}
                  disabled={editing ? editableDrafts.length === 0 : openRows.length === 0}
                  onChange={toggleAll}
                  aria-label="Selecionar todas as parcelas em aberto"
                />
              </th>
              <th className="px-3 py-2">Nº</th>
              <th className="px-3 py-2">Parc.</th>
              <th className="px-3 py-2">Categoria</th>
              <th className="px-3 py-2">Data ven.</th>
              <th className="px-3 py-2">Valor</th>
              <th className="px-3 py-2">Como será pago</th>
              <th className="px-3 py-2">Sit.</th>
              <th className="px-3 py-2">Data pgto.</th>
              <th className="px-3 py-2">Valor pago</th>
              <th className="px-3 py-2">Bolsa de desconto</th>
            </tr>
          </thead>
          <tbody>
            {(editing ? visibleDrafts.length : rows.length) === 0 ? (
              <tr>
                <td colSpan={11} className="px-3 py-6 text-center text-slate-500">
                  Nenhuma mensalidade lançada.
                </td>
              </tr>
            ) : editing ? (
              visibleDrafts.map((row, index) => (
                <tr key={row.key} className="border-t border-slate-100">
                  <ParcelFields row={row} />
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={!row.paid && !row.locked && selectedIds.includes(row.key)}
                      disabled={row.paid || row.locked}
                      onChange={() => toggleRow(row.key)}
                      aria-label={`Selecionar parcela ${index + 1}`}
                    />
                  </td>
                  <td className="px-3 py-2 tabular-nums">{index + 1}</td>
                  <td className="px-3 py-2 tabular-nums">{index + 1}</td>
                  <td className="px-3 py-2">
                    {row.paid || row.locked ? (
                      row.title || "Mensalidade"
                    ) : (
                      <input
                        value={row.title}
                        onChange={(event) => updateDraft(row.key, { title: event.target.value })}
                        className="h-9 w-full min-w-36 rounded-md border border-slate-200 px-2"
                      />
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {row.paid || row.locked ? (
                      row.dueDate ? formatDate(`${row.dueDate}T12:00:00`) : "—"
                    ) : (
                      <input
                        type="date"
                        required
                        value={row.dueDate}
                        onChange={(event) => updateDraft(row.key, { dueDate: event.target.value })}
                        className="h-9 rounded-md border border-slate-200 px-2"
                      />
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {row.paid || row.locked ? (
                      formatBRL(row.amountCents)
                    ) : (
                      <input
                        inputMode="decimal"
                        required
                        value={row.amount}
                        onChange={(event) => updateDraft(row.key, { amount: event.target.value })}
                        className="h-9 w-28 rounded-md border border-slate-200 px-2"
                      />
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {row.paid || row.locked ? (
                      row.paymentMethod || "—"
                    ) : (
                      <>
                        <input
                          list={`formas-${studentId}`}
                          value={row.paymentMethod}
                          onChange={(event) => updateDraft(row.key, { paymentMethod: event.target.value })}
                          className="h-9 w-40 rounded-md border border-slate-200 px-2"
                        />
                      </>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <StandingDot standing={row.standing} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">{row.paid && row.paidAt ? formatDate(row.paidAt) : "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums">{row.paid ? formatBRL(row.amountCents) : "—"}</td>
                  <td className="px-3 py-2">{discountPercent > 0 ? `${discountPercent}%` : "—"}</td>
                </tr>
              ))
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
                    <td className="px-3 py-2">{row.paymentMethod || "—"}</td>
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

  const fields = editing ? (
    <div className="hidden">
      {drafts
        .filter((row) => !row.locked)
        .map((row) => (
          <ParcelFields key={row.key} row={row} />
        ))}
      <datalist id={`formas-${studentId}`}>
        {knownMethods.map((method) => (
          <option key={method} value={method} />
        ))}
      </datalist>
    </div>
  ) : null;

  const content = editing ? (
    <form action={saveAction}>
      <input type="hidden" name="studentId" value={studentId} />
      {fields}
      {body}
      <div className={embedded ? "border-t border-slate-100 px-4 py-3" : "mt-4"}>{footer}</div>
    </form>
  ) : (
    <>
      {body}
      <div className={embedded ? "border-t border-slate-100 px-4 py-3" : undefined}>{footer}</div>
    </>
  );

  if (embedded) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3">
          <h3 className="font-semibold text-slate-900">Mensalidades de {studentName}</h3>
        </div>
        <div className="p-4">{content}</div>
      </section>
    );
  }

  return (
    <Modal open={open} onClose={onClose ?? (() => undefined)} size="xl" title={`Mensalidades de ${studentName}`}>
      {content}
    </Modal>
  );
}

function ParcelFields({ row }: { row: DraftRow }) {
  return (
    <>
      <input type="hidden" name="rowId" value={row.id} />
      <input type="hidden" name="rowTitle" value={row.title} />
      <input type="hidden" name="rowDue" value={row.dueDate} />
      <input type="hidden" name="rowAmount" value={row.amount} />
      <input type="hidden" name="rowMethod" value={row.paymentMethod} />
      <input type="hidden" name="rowRemove" value={row.remove ? "1" : "0"} />
    </>
  );
}

function toDraft(row: BillingCharge, index: number): DraftRow {
  return {
    key: row.id || `row-${index}`,
    id: row.source === "installment" ? row.id : "",
    title: row.source === "invoice" ? row.title : row.title,
    dueDate: toDateInput(row.dueDate),
    amount: (row.amountCents / 100).toFixed(2).replace(".", ","),
    paymentMethod: row.paymentMethod ?? "",
    paid: row.standing === "paid",
    paidAt: row.paidAt,
    standing: row.standing,
    amountCents: row.amountCents,
    remove: false,
    locked: row.source === "invoice",
  };
}

function toDateInput(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
