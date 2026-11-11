import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL } from "@/lib/student-finance";
import { daysPastDue, formatDueDate, type BillingCharge } from "@/lib/billing-status";

export function DelinquencyPanel({ charges }: { charges: BillingCharge[] }) {
  const overdue = charges
    .filter((charge) => charge.standing === "overdue")
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const groups = new Map<string, BillingCharge[]>();
  for (const charge of overdue) {
    const key = charge.className || "Sem turma";
    const rows = groups.get(key) ?? [];
    rows.push(charge);
    groups.set(key, rows);
  }

  const totalCents = overdue.reduce((sum, charge) => sum + charge.amountCents, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inadimplência</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {overdue.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma parcela em atraso.</p>
        ) : (
          <>
            <p className="text-sm text-slate-700">
              {overdue.length} parcela(s) em atraso · {formatBRL(totalCents)} em aberto
            </p>
            {[...groups.entries()].map(([className, rows]) => (
              <section key={className}>
                <h3 className="mb-2 text-sm font-semibold text-slate-800">
                  {className} · {formatBRL(rows.reduce((sum, row) => sum + row.amountCents, 0))}
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                        <th className="px-2 py-2">Aluno</th>
                        <th className="px-2 py-2">Parcela</th>
                        <th className="px-2 py-2">Vencimento</th>
                        <th className="px-2 py-2">Atraso</th>
                        <th className="px-2 py-2">Valor</th>
                        <th className="px-2 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((charge) => (
                        <tr key={charge.id} className="border-b border-slate-100">
                          <td className="px-2 py-2">{charge.studentName}</td>
                          <td className="px-2 py-2">{charge.title}</td>
                          <td className="whitespace-nowrap px-2 py-2">{formatDueDate(new Date(charge.dueDate))}</td>
                          <td className="whitespace-nowrap px-2 py-2">{daysPastDue(new Date(charge.dueDate))} dia(s)</td>
                          <td className="whitespace-nowrap px-2 py-2 tabular-nums">{formatBRL(charge.amountCents)}</td>
                          <td className="px-2 py-2 text-right">
                            <Link
                              href={`/dashboard/financeiro?aluno=${charge.studentId}`}
                              className="font-medium text-indigo-700 hover:underline"
                            >
                              Abrir
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </>
        )}
      </CardContent>
    </Card>
  );
}
