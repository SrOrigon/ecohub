import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { loadTuitionReceipt } from "@/lib/tuition-receipt";
import { formatBRL } from "@/lib/student-finance";
import { formatDueDate } from "@/lib/billing-status";
import { PrintDocumentButton } from "@/components/documents/print-document-button";
import { Button } from "@/components/ui/button";

export default async function TuitionReceiptPage({ params }: { params: Promise<{ code: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { code } = await params;
  const receipt = await loadTuitionReceipt(user, decodeURIComponent(code));
  if (!receipt) notFound();

  const { school } = receipt;
  const location = [school.city, school.state].filter(Boolean).join(" / ");
  const payer = receipt.payerNames.length > 0 ? receipt.payerNames.join(", ") : receipt.studentName;

  return (
    <div className="document-print-shell min-h-screen bg-white">
      <div className="no-print border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
          <Link href={receipt.backHref}>
            <Button type="button" variant="outline" size="sm">
              Voltar
            </Button>
          </Link>
          <PrintDocumentButton />
        </div>
      </div>

      <article className="document-print mx-auto max-w-[210mm] bg-white p-[16mm] text-[11pt] leading-relaxed text-slate-900">
        <header className="border-b-2 border-slate-300 pb-4">
          <p className="text-lg font-bold">{school.legalName || school.name}</p>
          {school.legalName && school.legalName !== school.name && (
            <p className="text-sm text-slate-600">{school.name}</p>
          )}
          <p className="text-sm text-slate-600">
            {[school.cnpj ? `CNPJ ${school.cnpj}` : null, location || null].filter(Boolean).join(" · ")}
          </p>
        </header>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-2xl font-bold">Recibo</h1>
          <p className="font-mono text-sm text-slate-600">Nº {receipt.receiptCode}</p>
        </div>

        <p className="mt-4 text-3xl font-bold tabular-nums">{formatBRL(receipt.amountCents)}</p>

        <p className="mt-6">
          Recebemos de <strong>{payer}</strong> a importância de{" "}
          <strong>{formatBRL(receipt.amountCents)}</strong>, referente a <strong>{receipt.title}</strong> do(a)
          aluno(a) <strong>{receipt.studentName}</strong>.
        </p>

        <dl className="mt-6 grid grid-cols-1 gap-x-8 gap-y-3 rounded-lg border border-slate-200 p-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase text-slate-500">Aluno(a)</dt>
            <dd>{receipt.studentName}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Matrícula</dt>
            <dd>{receipt.enrollmentCode}</dd>
          </div>
          {receipt.className && (
            <div>
              <dt className="text-xs uppercase text-slate-500">Turma</dt>
              <dd>{receipt.className}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs uppercase text-slate-500">Vencimento</dt>
            <dd>{formatDueDate(receipt.dueDate)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Pago em</dt>
            <dd>{formatDueDate(receipt.paidAt)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Forma de pagamento</dt>
            <dd>{receipt.methodLabel}</dd>
          </div>
        </dl>

        <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2">
          <p className="text-sm text-slate-600">
            {location ? `${location}, ` : ""}
            {formatDueDate(receipt.paidAt)}
          </p>
          <div className="border-t border-slate-400 pt-2 text-center text-sm">{school.legalName || school.name}</div>
        </div>
      </article>
    </div>
  );
}
