import { prisma } from "@/lib/db";
import { fetchCnpjFromBrasilApi } from "@/lib/cnpj";
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
  const current = school.verificationStatus as SchoolVerificationStatus;
  if (!needsAutomaticRecheck(school)) return current;

  const lookup = await fetchCnpjFromBrasilApi(school.cnpj!);
  if ("error" in lookup) return current;

  if (lookup.verificationStatus === current && school.cnpjCheckedAt) {
    const recent = Date.now() - school.cnpjCheckedAt.getTime() < RECHECK_MS;
    if (recent) return current;
  }

  await prisma.school.update({
    where: { id: school.id },
    data: {
      verificationStatus: lookup.verificationStatus,
      cnpjCheckedAt: new Date(),
      legalName: lookup.razaoSocial,
      city: lookup.city ?? undefined,
      state: lookup.state ?? undefined,
    },
  });

  return lookup.verificationStatus;
}
