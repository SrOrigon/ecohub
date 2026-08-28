import { prisma } from "@/lib/db";
import { calculateAge } from "@/lib/student-age";
import { formatDate } from "@/lib/utils";

export const DOCUMENT_MERGE_FIELDS = [
  { key: "NumeroContrato", label: "Número do contrato" },
  { key: "DataContrato", label: "Data do contrato" },
  { key: "NomeAluno", label: "Nome do aluno" },
  { key: "DataNascAluno", label: "Data de nascimento" },
  { key: "IdadeAluno", label: "Idade" },
  { key: "EmailAluno", label: "E-mail do aluno" },
  { key: "TelefoneAluno", label: "Telefone" },
  { key: "EnderecoAluno", label: "Endereço completo" },
  { key: "CidadeAluno", label: "Cidade do aluno" },
  { key: "EstadoAluno", label: "Estado do aluno" },
  { key: "CepAluno", label: "CEP" },
  { key: "CodigoMatricula", label: "Código de matrícula" },
  { key: "TurmaAluno", label: "Turma" },
  { key: "CursoAluno", label: "Curso/série" },
  { key: "NomeEscola", label: "Nome da escola" },
  { key: "RazaoSocialEscola", label: "Razão social" },
  { key: "CnpjEscola", label: "CNPJ da escola" },
  { key: "CidadeEscola", label: "Cidade da escola" },
  { key: "EstadoEscola", label: "Estado da escola" },
  { key: "EnderecoEscola", label: "Endereço da escola" },
  { key: "BairroEscola", label: "Bairro da escola" },
  { key: "DataInicioContrato", label: "Data início do contrato" },
  { key: "DataFimContrato", label: "Data fim do contrato" },
  { key: "DataHoje", label: "Data de hoje" },
] as const;

export type DocumentMergeKey = (typeof DOCUMENT_MERGE_FIELDS)[number]["key"];

function formatAddress(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(", ");
}

export function stripHtmlToText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function applyMergeTags(html: string, context: Record<string, string>) {
  return html.replace(/&lt;&lt;([A-Za-z0-9_]+)&gt;&gt;/g, (_, key: string) => context[key] ?? `&lt;&lt;${key}&gt;&gt;`).replace(/<<([A-Za-z0-9_]+)>>/g, (_, key: string) => context[key] ?? `<<${key}>>`);
}

export async function buildStudentMergeContext(
  schoolId: string,
  studentId: string,
  options?: {
    contractNumber?: string | null;
    classId?: string | null;
    issuedAt?: Date;
    contractStartDate?: Date | null;
    contractEndDate?: Date | null;
  }
) {
  const student = await prisma.student.findFirst({
    where: { id: studentId, user: { schoolId } },
    include: {
      user: true,
      classGroup: true,
      classEnrollments: {
        where: { status: { in: ["active", "locked"] } },
        include: { classGroup: true },
        orderBy: { enrolledAt: "asc" },
      },
    },
  });
  if (!student) return null;

  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) return null;

  const turmaFromClassId = options?.classId
    ? await prisma.classGroup.findFirst({
        where: { id: options.classId, schoolId },
        select: { name: true, gradeLevel: true },
      })
    : null;

  const studentUser = student.user;
  const age = student.birthDate ? calculateAge(student.birthDate) : null;
  const issuedAt = options?.issuedAt ?? new Date();
  const activeClasses = student.classEnrollments.map((item) => item.classGroup.name);
  const turmaLabel =
    turmaFromClassId?.name ??
    (activeClasses.length > 0
      ? activeClasses.join(", ")
      : student.classGroup?.name ?? "—");

  return {
    NumeroContrato: options?.contractNumber ?? "—",
    DataContrato: formatDate(issuedAt),
    NomeAluno: studentUser.fullName,
    DataNascAluno: student.birthDate ? formatDate(student.birthDate) : "—",
    IdadeAluno: age != null ? String(age) : "—",
    EmailAluno: studentUser.email,
    TelefoneAluno: studentUser.phone ?? "—",
    EnderecoAluno: formatAddress([
      [studentUser.street, studentUser.streetNumber].filter(Boolean).join(", "),
      studentUser.addressComplement,
      studentUser.zipCode,
    ]),
    CidadeAluno: studentUser.city ?? "—",
    EstadoAluno: studentUser.state ?? "—",
    CepAluno: studentUser.zipCode ?? "—",
    CodigoMatricula: student.enrollmentCode,
    TurmaAluno: turmaLabel,
    CursoAluno: turmaFromClassId?.gradeLevel ?? student.classGroup?.gradeLevel ?? "—",
    NomeEscola: school.name,
    RazaoSocialEscola: school.legalName ?? school.name,
    CnpjEscola: school.cnpj ?? "—",
    CidadeEscola: school.city ?? "—",
    EstadoEscola: school.state ?? "—",
    EnderecoEscola: "—",
    BairroEscola: "—",
    DataInicioContrato: options?.contractStartDate ? formatDate(options.contractStartDate) : "—",
    DataFimContrato: options?.contractEndDate ? formatDate(options.contractEndDate) : "—",
    DataHoje: formatDate(new Date()),
  } satisfies Record<string, string>;
}

export async function buildDocumentMergeContext(documentId: string, schoolId: string) {
  const document = await prisma.issuedDocument.findFirst({
    where: { id: documentId, schoolId },
    include: {
      student: { include: { user: { select: { fullName: true } } } },
      school: true,
    },
  });

  if (!document) return null;

  const context = await buildStudentMergeContext(document.schoolId, document.studentId, {
    contractNumber: document.contractNumber ?? document.id.slice(-8).toUpperCase(),
    classId: document.classId,
    issuedAt: document.issuedAt,
    contractStartDate: document.contractStartDate,
    contractEndDate: document.contractEndDate,
  });
  if (!context) return null;

  return { document, context };
}

export async function nextContractNumber(schoolId: string) {
  const year = new Date().getFullYear();
  const count = await prisma.issuedDocument.count({
    where: {
      schoolId,
      type: "contract",
      issuedAt: {
        gte: new Date(`${year}-01-01T00:00:00.000Z`),
        lt: new Date(`${year + 1}-01-01T00:00:00.000Z`),
      },
    },
  });
  return `${year}${String(count + 1).padStart(5, "0")}`;
}
