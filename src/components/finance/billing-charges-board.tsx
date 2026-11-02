"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { dispatchWhatsAppBillingAction } from "@/actions/whatsapp-billing";
import { formatBRL } from "@/lib/student-finance";
import {
  type BillingCharge,
  type BillingSummary,
  summarizeCharges,
} from "@/lib/billing-status";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Filter = "all" | "pending" | "upcoming" | "paid";

export function BillingStandingBanner({ summary }: { summary: BillingSummary }) {
  const pending = summary.state === "pending";
  const empty = summary.state === "none";
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-2xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        pending
          ? "border-red-200 bg-red-50 text-red-900"
          : empty
            ? "border-slate-200 bg-slate-50 text-slate-700"
            : "border-emerald-200 bg-emerald-50 text-emerald-900"
      )}
    >
      <div className="flex items-center gap-2">
        <StandingDot standing={pending ? "overdue" : empty ? "upcoming" : "paid"} />
        <div>
          <p className="font-semibold">{summary.label}</p>
          <p className="text-xs opacity-80">
            {pending
              ? `${summary.pendingCount} parcela(s) em aberto · ${formatBRL(summary.pendingAmountCents)}`
              : empty
                ? "Cadastre o plano de mensalidade do aluno para acompanhar as parcelas."
                : "Todas as parcelas vencidas estão quitadas."}
          </p>
        </div>
      </div>
    </div>
  );
}

export function StandingDot({
  standing,
}: {
  standing: BillingCharge["standing"];
}) {
  const color =
    standing === "paid"
      ? "bg-emerald-500"
      : standing === "overdue"
        ? "bg-red-500"
        : standing === "due"
          ? "bg-amber-500"
          : "bg-slate-300";
  return <span className={cn("inline-block h-2.5 w-2.5 shrink-0 rounded-full", color)} />;
}

export function BillingChargesBoard({
  charges,
  canCharge,
  studentId,
  initialFilter = "all",
}: {
  charges: BillingCharge[];
  canCharge: boolean;
  studentId?: string;
  initialFilter?: Filter;
}) {
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const summary = useMemo(() => summarizeCharges(charges), [charges]);
  const visible = charges.filter((charge) => matchesFilter(charge, filter));

  return (
    <div className="space-y-4">
      <BillingStandingBanner summary={summary} />
      {studentId && (
        <p className="text-sm text-slate-700">
          {summary.total === 0
            ? "Este aluno ainda não tem parcelas. A instituição define o valor, o vencimento e a quantidade."
            : `Pagou ${summary.paidCount} parcela(s). Faltam ${summary.unpaidCount}.`}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Parcelas pagas" value={String(summary.paidCount)} tone="ok" />
        <Metric label="Parcelas a pagar" value={String(summary.unpaidCount)} tone={summary.unpaidCount > 0 ? "danger" : "ok"} />
        <Metric label="Com pendência" value={String(summary.pendingCount)} tone="danger" />
        <Metric
          label="A vencer"
          value={String(charges.filter((charge) => charge.standing === "upcoming").length)}
          tone="muted"
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>Todas</FilterButton>
          <FilterButton active={filter === "pending"} onClick={() => setFilter("pending")}>Pendências</FilterButton>
          <FilterButton active={filter === "upcoming"} onClick={() => setFilter("upcoming")}>A vencer</FilterButton>
          <FilterButton active={filter === "paid"} onClick={() => setFilter("paid")}>Quitadas</FilterButton>
        </div>
        {canCharge && (
          <ChargeButton
            label="Cobrar pendências no WhatsApp"
            studentId={studentId}
          />
        )}
      </div>
      <BillingInstallmentsTable
        charges={visible}
        canCharge={canCharge}
        showStudent={!studentId}
        studentId={studentId}
      />
    </div>
  );
}

export function BillingInstallmentsTable({
  charges,
  canCharge,
  showStudent = false,
  studentId,
}: {
  charges: BillingCharge[];
  canCharge: boolean;
  showStudent?: boolean;
  studentId?: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-900">
            <tr>
              <th className="px-3 py-2">Nº</th>
              {showStudent && <th className="px-3 py-2">Aluno</th>}
              <th className="px-3 py-2">Categoria</th>
              <th className="px-3 py-2">Vencimento</th>
              <th className="px-3 py-2 text-right">Valor</th>
              <th className="px-3 py-2">Sit.</th>
              <th className="px-3 py-2">Pagamento</th>
              <th className="px-3 py-2">WhatsApp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {charges.length === 0 ? (
              <tr>
                <td colSpan={showStudent ? 8 : 7} className="px-3 py-8 text-center text-sm text-slate-500">
                  Nenhuma parcela neste filtro.
                </td>
              </tr>
            ) : (
              charges.map((charge, index) => (
                <tr key={`${charge.id}-${index}`}>
                  <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-100">{index + 1}</td>
                  {showStudent && (
                    <td className="px-3 py-2">
                      <p className="font-medium text-slate-900 dark:text-slate-100">{charge.studentName}</p>
                      <p className="text-[11px] text-slate-500">{charge.className ?? "Sem turma"}</p>
                    </td>
                  )}
                  <td className="px-3 py-2">{charge.title}</td>
                  <td className="whitespace-nowrap px-3 py-2">{formatDate(charge.dueDate)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right font-medium">{formatBRL(charge.amountCents)}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <span className="inline-flex items-center gap-1.5">
                      <StandingDot standing={charge.standing} />
                      <span className={statusText(charge.standing)}>{charge.standingLabel}</span>
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {charge.paidAt ? formatDate(charge.paidAt) : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {charge.standing === "paid" ? (
                      <Badge variant="success">Em dia</Badge>
                    ) : canCharge ? (
                      <ChargeButton
                        compact
                        chargeId={charge.id}
                        studentId={studentId ?? charge.studentId}
                        label="Cobrar"
                      />
                    ) : charge.lastWhatsappAt ? (
                      <span className="text-xs text-slate-500">Avisado {formatDate(charge.lastWhatsappAt)}</span>
                    ) : (
                      <Badge variant={charge.standing === "overdue" || charge.standing === "due" ? "danger" : "warning"}>
                        {charge.standing === "upcoming" ? "A vencer" : "Pendente"}
                      </Badge>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ChargeButton({
  label,
  chargeId,
  studentId,
  compact = false,
}: {
  label: string;
  chargeId?: string;
  studentId?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  function send() {
    setFeedback(null);
    startTransition(async () => {
      const result = await dispatchWhatsAppBillingAction({ chargeId, studentId: chargeId ? undefined : studentId });
      if ("error" in result && result.error) {
        setFeedback(result.error);
        return;
      }
      if ("message" in result) setFeedback(result.message);
      router.refresh();
    });
  }

  return (
    <div className={compact ? "space-y-1" : "flex flex-col items-end gap-1"}>
      <Button type="button" size="sm" variant={compact ? "outline" : "default"} onClick={send} disabled={pending} className="gap-1.5">
        <MessageCircle className="h-3.5 w-3.5" />
        {pending ? "Enviando..." : label}
      </Button>
      {feedback && <p className="max-w-xs text-[11px] text-slate-500">{feedback}</p>}
    </div>
  );
}

function FilterButton({
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
        "rounded-full px-3 py-1.5 text-xs font-medium",
        active ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
      )}
    >
      {children}
    </button>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "danger" | "ok" | "muted" }) {
  const color = tone === "danger" ? "text-red-700" : tone === "ok" ? "text-emerald-700" : "text-slate-800";
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={cn("text-2xl font-bold", color)}>{value}</p>
    </div>
  );
}

function matchesFilter(charge: BillingCharge, filter: Filter) {
  if (filter === "all") return true;
  if (filter === "paid") return charge.standing === "paid";
  if (filter === "upcoming") return charge.standing === "upcoming";
  return charge.standing === "overdue" || charge.standing === "due";
}

function statusText(standing: BillingCharge["standing"]) {
  if (standing === "paid") return "text-emerald-700";
  if (standing === "overdue") return "text-red-700";
  if (standing === "due") return "text-amber-700";
  return "text-slate-500";
}
