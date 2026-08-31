import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getClasses } from "@/lib/queries";
import { getSchoolSettings } from "@/lib/school-settings";
import { getContractTemplateHtml, hasInstitutionContractTemplate } from "@/lib/contract-template";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Select } from "@/components/ui/form-fields";
import { Badge } from "@/components/ui/badge";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { createStudentDocumentAction } from "@/actions/student-documents";
import { ContractStatusActions } from "@/components/contracts/contract-status-actions";
import { InstitutionContractTemplatePanel } from "@/components/contracts/institution-contract-template";
import {
  CONTRACT_STATUSES,
  contractStatusLabel,
  contractStatusVariant,
  resolveContractStatus,
} from "@/lib/contract-types";
import { redirect } from "next/navigation";
import Link from "next/link";
import { FileText, Plus, Printer } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default async function ContratosPage({
  searchParams,
}: {
  searchParams: Promise<{
    aluno?: string;
    turma?: string;
    situacao?: string;
    contrato?: string;
  }>;
}) {
  const user = await getSessionUser();
  if (!user?.schoolId) redirect("/login");
  if (!["admin", "director", "secretary"].includes(user.role)) redirect("/dashboard");

  const params = await searchParams;
  const studentFilter = params.aluno?.trim();
  const classFilter = params.turma?.trim();
  const statusFilter = params.situacao?.trim();
  const contractQuery = params.contrato?.trim().toLowerCase();

  const [students, classes, contracts, settings] = await Promise.all([
    prisma.student.findMany({
      where: { user: { schoolId: user.schoolId } },
      include: { user: { select: { fullName: true } } },
      orderBy: { user: { fullName: "asc" } },
    }),
    getClasses(user.schoolId),
    prisma.issuedDocument.findMany({
      where: {
        schoolId: user.schoolId,
        type: "contract",
        ...(studentFilter ? { studentId: studentFilter } : {}),
        ...(classFilter ? { classId: classFilter } : {}),
        ...(statusFilter ? { contractStatus: statusFilter } : {}),
      },
      orderBy: [{ contractStartDate: "desc" }, { updatedAt: "desc" }],
      include: {
        student: { include: { user: { select: { fullName: true } } } },
        classGroup: { select: { name: true } },
        issuedBy: { select: { fullName: true } },
      },
      take: 500,
    }),
    getSchoolSettings(user.schoolId),
  ]);

  const contractTemplateHtml = getContractTemplateHtml(settings);
  const customTemplate = hasInstitutionContractTemplate(settings);

  const filteredContracts = contractQuery
    ? contracts.filter((item) => {
        const haystack = [
          item.contractNumber ?? "",
          item.title,
          item.student.user.fullName,
          item.classGroup?.name ?? "",
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(contractQuery);
      })
    : contracts;

  const classOptions = classes.map((item) => ({ id: item.id, name: item.name }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contratos"
        description="Gestão de contratos por aluno e turma — estilo Sponte, com situação, datas e impressão individual."
      />

      <div className="layout-with-aside">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Plus className="h-4 w-4" />
                Novo contrato
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form action={createStudentDocumentAction} className="grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="type" value="contract" />
                <input type="hidden" name="redirectTo" value="contratos" />
                <div>
                  <Label htmlFor="studentId">Aluno</Label>
                  <Select id="studentId" name="studentId" required defaultValue={studentFilter ?? ""}>
                    <option value="">Selecione...</option>
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.user.fullName}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="classId">Turma / curso</Label>
                  <Select id="classId" name="classId" defaultValue={classFilter ?? ""}>
                    <option value="">Geral / sem turma específica</option>
                    {classOptions.map((turma) => (
                      <option key={turma.id} value={turma.id}>
                        {turma.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="contractStartDate">Data início</Label>
                  <Input
                    id="contractStartDate"
                    name="contractStartDate"
                    type="date"
                    defaultValue={new Date().toISOString().slice(0, 10)}
                  />
                </div>
                <div>
                  <Label htmlFor="contractEndDate">Data término</Label>
                  <Input id="contractEndDate" name="contractEndDate" type="date" />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="title">Título (opcional)</Label>
                  <Input
                    id="title"
                    name="title"
                    placeholder="Contrato de prestação de serviço"
                  />
                </div>
                <Button type="submit" className="w-fit gap-2">
                  <FileText className="h-4 w-4" />
                  Criar contrato
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contratos ({filteredContracts.length})</CardTitle>
            </CardHeader>
            <CardContent className="min-w-0">
              {filteredContracts.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhum contrato encontrado com os filtros atuais.</p>
              ) : (
                <ResponsiveTable minWidth="44rem">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="pb-3 pr-3">Nº contrato</th>
                      <th className="pb-3 pr-3">Início</th>
                      <th className="pb-3 pr-3">Término</th>
                      <th className="pb-3 pr-3">Aluno</th>
                      <th className="pb-3 pr-3">Turma</th>
                      <th className="pb-3 pr-3">Situação</th>
                      <th className="pb-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContracts.map((contract) => {
                      const situacao = resolveContractStatus(contract.status, contract.contractStatus);
                      return (
                        <tr key={contract.id} className="border-b border-slate-100 text-sm">
                          <td className="py-3 pr-3 font-mono text-xs">
                            {contract.contractNumber ?? "—"}
                          </td>
                          <td className="py-3 pr-3">
                            {contract.contractStartDate
                              ? formatDate(contract.contractStartDate)
                              : formatDate(contract.issuedAt)}
                          </td>
                          <td className="py-3 pr-3">
                            {contract.contractEndDate ? formatDate(contract.contractEndDate) : "—"}
                          </td>
                          <td className="py-3 pr-3">
                            <Link
                              href={`/dashboard/alunos/${contract.studentId}`}
                              className="font-medium text-indigo-600 hover:underline"
                            >
                              {contract.student.user.fullName}
                            </Link>
                          </td>
                          <td className="py-3 pr-3">{contract.classGroup?.name ?? "—"}</td>
                          <td className="py-3 pr-3">
                            <Badge variant={contractStatusVariant(situacao)}>
                              {contractStatusLabel(situacao)}
                            </Badge>
                          </td>
                          <td className="py-3">
                            <div className="flex flex-wrap gap-1">
                              <Link href={`/dashboard/documentos/${contract.id}`}>
                                <Button size="sm" variant="default">
                                  Editar
                                </Button>
                              </Link>
                              <Link
                                href={`/dashboard/documentos/${contract.id}/imprimir`}
                                target="_blank"
                              >
                                <Button size="sm" variant="outline" className="gap-1">
                                  <Printer className="h-3.5 w-3.5" />
                                  Imprimir
                                </Button>
                              </Link>
                            </div>
                            {situacao === "vigente" && (
                              <div className="mt-2">
                                <ContractStatusActions
                                  documentId={contract.id}
                                  currentStatus={situacao}
                                />
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </ResponsiveTable>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="layout-with-aside-aside min-w-0 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Modelo de contrato da instituição</CardTitle>
            </CardHeader>
            <CardContent>
              <InstitutionContractTemplatePanel
                hasCustomTemplate={customTemplate}
                sourceName={settings.documents.contractTemplateSourceName}
                updatedAt={settings.documents.contractTemplateUpdatedAt}
                initialHtml={contractTemplateHtml}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Filtros rápidos</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-3">
                <div>
                  <Label htmlFor="contrato">Número do contrato</Label>
                  <Input
                    id="contrato"
                    name="contrato"
                    defaultValue={params.contrato ?? ""}
                    placeholder="Ex.: 202600001"
                  />
                </div>
                <div>
                  <Label htmlFor="aluno">Aluno</Label>
                  <Select id="aluno" name="aluno" defaultValue={studentFilter ?? ""}>
                    <option value="">Todos</option>
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.user.fullName}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="turma">Turma</Label>
                  <Select id="turma" name="turma" defaultValue={classFilter ?? ""}>
                    <option value="">Todas</option>
                    {classOptions.map((turma) => (
                      <option key={turma.id} value={turma.id}>
                        {turma.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="situacao">Situação</Label>
                  <Select id="situacao" name="situacao" defaultValue={statusFilter ?? ""}>
                    <option value="">Todas</option>
                    {CONTRACT_STATUSES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <Button type="submit" className="w-full">
                  Filtrar
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-2 p-4 text-sm text-slate-600">
              <p className="font-medium text-slate-800">Ações disponíveis</p>
              <p>• Editar o texto e campos do contrato no editor</p>
              <p>• Imprimir ou salvar em PDF</p>
              <p>• Encerrar, cancelar ou trancar contratos vigentes</p>
              <Link href="/dashboard/documentos" className="inline-block text-indigo-600 hover:underline">
                Ver todos os documentos →
              </Link>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
