import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Select } from "@/components/ui/form-fields";
import { REPORT_CATALOG } from "@/lib/report-catalog";
import type { OperationalReportTable, ReportFilters } from "@/lib/operational-reports";
import { ReportCatalogNav } from "@/components/reports/report-catalog-nav";
import { ReportTableActions } from "@/components/reports/report-table-actions";

export function OperationalReportPanel({
  filters,
  classes,
  students,
  table,
}: {
  filters: ReportFilters;
  classes: Array<{ id: string; name: string }>;
  students: Array<{ id: string; name: string }>;
  table: OperationalReportTable | null;
}) {
  const selected = REPORT_CATALOG.find((item) => item.id === filters.tipo);

  return (
    <section className="space-y-4">
      <div className="no-print">
        <h2 className="text-lg font-semibold text-slate-900">Relatórios da escola</h2>
        <p className="mt-1 text-sm text-slate-600">
          Escolha o relatório, ajuste os filtros e visualize a lista para imprimir ou exportar.
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <ReportCatalogNav reports={REPORT_CATALOG} active={filters.tipo} />

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            {selected ? (
              <form method="get" action="/dashboard/relatorios" className="space-y-4">
                <input type="hidden" name="tipo" value={selected.id} />
                <div>
                  <h3 className="font-semibold text-slate-900">{selected.title}</h3>
                  <p className="text-sm text-slate-600">{selected.description}</p>
                </div>
                {selected.filters.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {selected.filters.includes("turma") && (
                  <div>
                    <Label htmlFor="turma">Turma</Label>
                    <Select id="turma" name="turma" defaultValue={filters.turma ?? ""}>
                      <option value="">Todas</option>
                      {classes.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  )}
                  {selected.filters.includes("aluno") && (
                    <div>
                      <Label htmlFor="aluno">Aluno</Label>
                      <Select id="aluno" name="aluno" defaultValue={filters.aluno ?? ""}>
                        <option value="">Todos</option>
                        {students.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </Select>
                    </div>
                  )}
                  {selected.filters.includes("nome") && (
                    <div>
                      <Label htmlFor="nome">Nome</Label>
                      <Input id="nome" name="nome" defaultValue={filters.nome ?? ""} placeholder="Parte do nome" />
                    </div>
                  )}
                  {selected.filters.includes("situacao") && (
                    <div>
                      <Label htmlFor="situacao">Situação</Label>
                      <Select id="situacao" name="situacao" defaultValue={filters.situacao ?? "active"}>
                        <option value="active">Cursando</option>
                        <option value="inactive">Inativo</option>
                        <option value="todos">Todos</option>
                      </Select>
                    </div>
                  )}
                  {selected.filters.includes("ordem") && (
                    <div>
                      <Label htmlFor="ordem">Ordenar por</Label>
                      <Select id="ordem" name="ordem" defaultValue={filters.ordem ?? selected.orderOptions?.[0]?.value ?? "nome"}>
                        {(selected.orderOptions ?? [{ value: "nome", label: "Nome" }]).map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                  )}
                  {selected.filters.includes("periodo") && (
                    <>
                      <div>
                        <Label htmlFor="de">{selected.id === "aniversariantes" ? "Aniversário de" : "Período de"}</Label>
                        <Input id="de" name="de" type="date" defaultValue={filters.de ?? ""} />
                      </div>
                      <div>
                        <Label htmlFor="ate">Até</Label>
                        <Input id="ate" name="ate" type="date" defaultValue={filters.ate ?? ""} />
                      </div>
                    </>
                  )}
                  {selected.filters.includes("visualizar") && (
                    <div>
                      <Label htmlFor="visualizar">Visualizar</Label>
                      <Select id="visualizar" name="visualizar" defaultValue={filters.visualizar ?? selected.viewOptions?.[0]?.value ?? "todas"}>
                        {(selected.viewOptions ?? []).map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                  )}
                  {selected.filters.includes("minFaltas") && (
                    <div>
                      <Label htmlFor="minFaltas">Mínimo de faltas no período</Label>
                      <Input id="minFaltas" name="minFaltas" type="number" min={0} defaultValue={filters.minFaltas ?? ""} />
                    </div>
                  )}
                </div>
                )}
                <Button type="submit" size="sm">
                  Visualizar
                </Button>
              </form>
            ) : (
              <p className="text-sm text-slate-600">
                Selecione um relatório ao lado. Documentos pedagógicos emitidos pela escola continuam em Documentos.
              </p>
            )}
          </div>
        </div>
      </div>

      {table && (
        <div className="document-print space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-slate-500">{table.schoolName}</p>
              <h3 className="text-lg font-semibold text-slate-900">{table.title}</h3>
              <p className="text-sm text-slate-500">{table.rows.length} registro(s)</p>
            </div>
            <ReportTableActions title={table.title} columns={table.columns} rows={table.rows} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  {table.columns.map((column) => (
                    <th key={column} className="px-3 py-2">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.length === 0 ? (
                  <tr>
                    <td colSpan={table.columns.length} className="px-3 py-6 text-center text-slate-500">
                      {table.empty}
                    </td>
                  </tr>
                ) : (
                  table.rows.map((row, index) => (
                    <tr key={`${row[0]}-${index}`} className="border-t border-slate-100">
                      {row.map((cell, cellIndex) => (
                        <td key={`${cellIndex}-${cell}`} className="px-3 py-2 align-top">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
