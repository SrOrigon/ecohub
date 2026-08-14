import { prisma } from "@/lib/db";
import { fetchCnpjFromBrasilApi } from "@/lib/cnpj";
import { notifySchoolDirectors } from "@/lib/notifications";
import {
  SCHOOL_VERIFICATION_STATUS,
  type SchoolVerificationStatus,
} from "@/lib/school-verification";

const RECHECK_MS = 6 * 60 * 60 * 1000;

type SchoolVerificationRow = {
  id: string;
  cnpj: string | null;
  verificationStatus: string;
  cnpjCheckedAt: Date | null;
};

async function notifyVerificationOutcome(
  schoolId: string,
  previous: SchoolVerificationStatus,
  next: SchoolVerificationStatus
) {
  if (previous === next) return;

  if (next === SCHOOL_VERIFICATION_STATUS.verified) {
    await notifySchoolDirectors(
      schoolId,
      "Instituição verificada",
      "Seu CNPJ foi confirmado na Receita Federal. Cadastros públicos de professores e alunos já estão liberados.",
      "/dashboard/configuracoes"
    );
    return;
  }

  if (next === SCHOOL_VERIFICATION_STATUS.rejected) {
    await notifySchoolDirectors(
      schoolId,
      "Verificação não concluída",
      "O CNPJ consta como inativo ou irregular na Receita Federal. Atualize os dados ou entre em contato com o suporte.",
      "/dashboard/configuracoes"
    );
  }
}

async function applyVerificationUpdate(
  school: SchoolVerificationRow,
  previous: SchoolVerificationStatus,
  next: SchoolVerificationStatus,
  extra?: { legalName?: string; city?: string | null; state?: string | null }
) {
  if (previous === next && school.cnpjCheckedAt) {
    const recent = Date.now() - school.cnpjCheckedAt.getTime() < RECHECK_MS;
    if (recent) return next;
  }

  await prisma.school.update({
    where: { id: school.id },
    data: {
      verificationStatus: next,
      cnpjCheckedAt: new Date(),
      ...(extra?.legalName ? { legalName: extra.legalName } : {}),
      ...(extra?.city != null ? { city: extra.city } : {}),
      ...(extra?.state != null ? { state: extra.state } : {}),
    },
  });

  await notifyVerificationOutcome(school.id, previous, next);
  return next;
}

function needsAutomaticRecheck(school: SchoolVerificationRow): boolean {
  if (!school.cnpj) return false;
  if (school.verificationStatus === SCHOOL_VERIFICATION_STATUS.verified) return false;
  if (school.verificationStatus === SCHOOL_VERIFICATION_STATUS.rejected) return false;

  if (
    school.verificationStatus === SCHOOL_VERIFICATION_STATUS.pending ||
    school.verificationStatus === SCHOOL_VERIFICATION_STATUS.manual_review
  ) {
    return true;
  }

  if (!school.cnpjCheckedAt) return true;
  return Date.now() - school.cnpjCheckedAt.getTime() > RECHECK_MS;
}

/** Reconsulta a Receita e atualiza o status da escola quando ainda não está verificada. */
export async function syncSchoolVerificationIfNeeded(
  school: SchoolVerificationRow
): Promise<SchoolVerificationStatus> {
  const previous = school.verificationStatus as SchoolVerificationStatus;
  if (!needsAutomaticRecheck(school)) return previous;

  // Registros legados: manual_review era CNPJ ativo com CNAE fora do ensino — hoje isso é verified.
  if (previous === SCHOOL_VERIFICATION_STATUS.manual_review) {
    return applyVerificationUpdate(school, previous, SCHOOL_VERIFICATION_STATUS.verified);
  }

  const lookup = await fetchCnpjFromBrasilApi(school.cnpj!);
  if ("error" in lookup) return previous;

  return applyVerificationUpdate(school, previous, lookup.verificationStatus, {
    legalName: lookup.razaoSocial,
    city: lookup.city,
    state: lookup.state,
  });
}

/** Notifica direção quando o status de verificação muda. */
export async function notifySchoolVerificationChange(
  schoolId: string,
  previous: SchoolVerificationStatus,
  next: SchoolVerificationStatus
) {
  await notifyVerificationOutcome(schoolId, previous, next);
}

/** Notifica direção logo após cadastro quando o status inicial já é conhecido. */
export async function notifyInitialSchoolVerification(
  schoolId: string,
  status: SchoolVerificationStatus
) {
  if (status === SCHOOL_VERIFICATION_STATUS.pending) return;

  await notifyVerificationOutcome(schoolId, SCHOOL_VERIFICATION_STATUS.pending, status);
}
