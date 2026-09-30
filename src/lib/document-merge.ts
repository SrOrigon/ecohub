import { prisma } from "@/lib/db";
import { calculateAge } from "@/lib/student-age";
import { formatDate } from "@/lib/utils";

export const DOCUMENT_MERGE_FIELDS = [
  { key: "contractNumber", label: "Nº do Contrato" },
  { key: "contractDate", label: "Data do Contrato" },

  { key: "studentName", label: "Nome do aluno" },
  { key: "studentBirthDate", label: "Data de Nascimento (Aluno)" },
  { key: "studentCpf", label: "CPF do Aluno" },
  { key: "studentRg", label: "RG do Aluno" },
  { key: "studentAge", label: "Idade do Aluno" },
  { key: "studentAddress", label: "Endereço do Aluno" },
  { key: "studentNumber", label: "Número do Endereço (Aluno)" },
  { key: "studentPhone", label: "Telefone do Aluno" },
  { key: "studentCep", label: "CEP do Aluno" },
  { key: "studentCityState", label: "Cidade/Estado do Aluno" },

  { key: "responsibleName", label: "Nome do Responsável" },
  { key: "responsibleBirthDate", label: "Data de Nascimento (Responsável)" },
  { key: "responsibleCpf", label: "CPF do Responsável" },
  { key: "responsibleRg", label: "RG do Responsável" },
  { key: "responsiblePhone", label: "Telefone do Responsável" },
  { key: "responsibleAddress", label: "Endereço do Responsável" },
  { key: "responsibleNumber", label: "Número do Endereço (Resp.)" },
  { key: "responsibleBairro", label: "Bairro do Responsável" },
  { key: "responsibleCep", label: "CEP do Responsável" },
  { key: "responsibleCityState", label: "Cidade/Estado do Responsável" },

  { key: "enrollmentFee", label: "Taxa de Matrícula" },
  { key: "totalAmountWithoutDiscount", label: "Valor Total sem Desconto" },
  { key: "totalAmountWithDiscount", label: "Valor Total com Desconto" },
  { key: "installmentValue", label: "Valor da Parcela" },
  { key: "installmentValueWithDiscount", label: "Valor da Parcela com Desconto" },
  { key: "installmentsCount", label: "Nº de Parcelas" },

  { key: "courseName", label: "Nome do Curso" },
  { key: "courseDurationMonths", label: "Duração do Curso (Meses)" },
  { key: "startDate", label: "Data de Início" },
  { key: "estimatedEndDate", label: "Data Estimada de Término" },
  { key: "scheduleDaysAndHours", label: "Dias da Semana e Horários" },

  // Backward compatibility placeholders if any old templates used them
  { key: "NumeroContrato", label: "Número do contrato (Legado)" },
  { key: "DataContrato", label: "Data do contrato (Legado)" },
  { key: "NomeAluno", label: "Nome do aluno (Legado)" },
  { key: "DataNascAluno", label: "Data de nascimento (Legado)" },
  { key: "IdadeAluno", label: "Idade (Legado)" },
  { key: "EmailAluno", label: "E-mail do aluno (Legado)" },
  { key: "TelefoneAluno", label: "Telefone (Legado)" },
  { key: "EnderecoAluno", label: "Endereço completo (Legado)" },
  { key: "CidadeAluno", label: "Cidade do aluno (Legado)" },
  { key: "EstadoAluno", label: "Estado do aluno (Legado)" },
  { key: "CepAluno", label: "CEP (Legado)" },
  { key: "CodigoMatricula", label: "Código de matrícula (Legado)" },
  { key: "TurmaAluno", label: "Turma (Legado)" },
  { key: "CursoAluno", label: "Curso/série (Legado)" },
  { key: "NomeEscola", label: "Nome da escola (Legado)" },
  { key: "RazaoSocialEscola", label: "Razão social (Legado)" },
  { key: "CnpjEscola", label: "CNPJ da escola (Legado)" },
  { key: "CidadeEscola", label: "Cidade da escola (Legado)" },
  { key: "EstadoEscola", label: "Estado da escola (Legado)" },
  { key: "EnderecoEscola", label: "Endereço da escola (Legado)" },
  { key: "BairroEscola", label: "Bairro da escola (Legado)" },
  { key: "DataInicioContrato", label: "Data início do contrato (Legado)" },
  { key: "DataFimContrato", label: "Data fim do contrato (Legado)" },
  { key: "DataHoje", label: "Data de hoje (Legado)" },
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
    contractData?: Record<string, string>;
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
      parentLinks: {
        include: { parent: true },
        orderBy: { createdAt: "asc" },
      }
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

  const parentUser = student.parentLinks[0]?.parent;
  const contractData = options?.contractData ?? {};

  // For Master Tek specifically requested hardcoded fallback values
  const razaoSocialEscola = "MASTER TEK SOLUTIONS LTDA ME";
  const cnpjEscola = "60.916.740/0001-02";
  const enderecoEscola = "RUA MACEDO COIMBRA, nº 138";
  const bairroEscola = "CAMPO GRANDE";
  const cepEscola = "23.052-130";
  const cidadeEstadoEscola = "Rio de Janeiro/RJ";

  return {
    contractNumber: options?.contractNumber ?? "—",
    contractDate: formatDate(issuedAt),

    studentName: studentUser.fullName,
    studentBirthDate: student.birthDate ? formatDate(student.birthDate) : "—",
    studentCpf: contractData.studentCpf ?? "—",
    studentRg: contractData.studentRg ?? "—",
    studentAge: age != null ? String(age) : "—",
    studentAddress: formatAddress([
      [studentUser.street, studentUser.streetNumber].filter(Boolean).join(", "),
      studentUser.addressComplement
    ]) || "—",
    studentNumber: studentUser.streetNumber ?? "—",
    studentPhone: studentUser.phone ?? "—",
    studentCep: studentUser.zipCode ?? "—",
    studentCityState: formatAddress([studentUser.city, studentUser.state]) || "—",

    responsibleName: parentUser?.fullName ?? contractData.responsibleName ?? "—",
    responsibleBirthDate: contractData.responsibleBirthDate ?? "—", // Missing from User model
    responsibleCpf: contractData.responsibleCpf ?? "—",
    responsibleRg: contractData.responsibleRg ?? "—",
    responsiblePhone: parentUser?.phone ?? contractData.responsiblePhone ?? "—",
    responsibleAddress: parentUser ? formatAddress([
      [parentUser.street, parentUser.streetNumber].filter(Boolean).join(", "),
      parentUser.addressComplement
    ]) : contractData.responsibleAddress ?? "—",
    responsibleNumber: parentUser?.streetNumber ?? contractData.responsibleNumber ?? "—",
    responsibleBairro: contractData.responsibleBairro ?? "—", // Missing from User model natively
    responsibleCep: parentUser?.zipCode ?? contractData.responsibleCep ?? "—",
    responsibleCityState: parentUser ? formatAddress([parentUser.city, parentUser.state]) : contractData.responsibleCityState ?? "—",

    enrollmentFee: contractData.enrollmentFee ?? "—",
    totalAmountWithoutDiscount: contractData.totalAmountWithoutDiscount ?? "—",
    totalAmountWithDiscount: contractData.totalAmountWithDiscount ?? "—",
    installmentValue: contractData.installmentValue ?? "—",
    installmentValueWithDiscount: contractData.installmentValueWithDiscount ?? "—",
    installmentsCount: contractData.installmentsCount ?? "—",

    courseName: turmaFromClassId?.gradeLevel ?? student.classGroup?.gradeLevel ?? contractData.courseName ?? "—",
    courseDurationMonths: contractData.courseDurationMonths ?? "—",
    startDate: options?.contractStartDate ? formatDate(options.contractStartDate) : contractData.startDate ?? "—",
    estimatedEndDate: options?.contractEndDate ? formatDate(options.contractEndDate) : contractData.estimatedEndDate ?? "—",
    scheduleDaysAndHours: contractData.scheduleDaysAndHours ?? "—",

    // Backward compatibility mappings
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
    RazaoSocialEscola: razaoSocialEscola,
    CnpjEscola: cnpjEscola,
    CidadeEscola: cidadeEstadoEscola.split("/")[0] ?? school.city ?? "—",
    EstadoEscola: cidadeEstadoEscola.split("/")[1] ?? school.state ?? "—",
    EnderecoEscola: enderecoEscola,
    BairroEscola: bairroEscola,
    CepEscola: cepEscola,
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
