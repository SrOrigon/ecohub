/** Status de verificação cadastral da instituição. */
export const SCHOOL_VERIFICATION_STATUS = {
  pending: "pending",
  verified: "verified",
  manual_review: "manual_review",
  rejected: "rejected",
} as const;

export type SchoolVerificationStatus =
  (typeof SCHOOL_VERIFICATION_STATUS)[keyof typeof SCHOOL_VERIFICATION_STATUS];

export const SCHOOL_VERIFICATION_LABELS: Record<SchoolVerificationStatus, string> = {
  pending: "Pendente",
  verified: "Verificada",
  manual_review: "Em análise",
  rejected: "Rejeitada",
};

export function isSchoolVerified(status: string): boolean {
  return status === SCHOOL_VERIFICATION_STATUS.verified;
}

export function canAcceptPublicSignup(status: string): boolean {
  return isSchoolVerified(status);
}

/** CNAE principal compatível com instituição de ensino (grupo 85). */
export function isEducationCnae(cnae: string | number | null | undefined): boolean {
  if (cnae == null) return false;
  const digits = String(cnae).replace(/\D/g, "");
  return digits.startsWith("85");
}

export function resolveVerificationStatus(input: {
  situacao: string | null | undefined;
  cnae: string | number | null | undefined;
}): SchoolVerificationStatus {
  const situacao = (input.situacao ?? "").toUpperCase();
  if (!situacao.includes("ATIV")) {
    return SCHOOL_VERIFICATION_STATUS.rejected;
  }
  if (isEducationCnae(input.cnae)) {
    return SCHOOL_VERIFICATION_STATUS.verified;
  }
  return SCHOOL_VERIFICATION_STATUS.manual_review;
}

export function verificationStatusMessage(status: SchoolVerificationStatus): string {
  switch (status) {
    case SCHOOL_VERIFICATION_STATUS.verified:
      return "Instituição verificada na Receita Federal. Professores e famílias já podem se cadastrar com o código da escola.";
    case SCHOOL_VERIFICATION_STATUS.manual_review:
      return "CNPJ ativo, mas o CNAE não é de ensino. Nossa equipe pode revisar manualmente  -  enquanto isso, cadastros públicos ficam pausados.";
    case SCHOOL_VERIFICATION_STATUS.pending:
      return "Aguardando validação do CNPJ.";
    case SCHOOL_VERIFICATION_STATUS.rejected:
      return "CNPJ inativo ou inválido na Receita Federal.";
    default:
      return "";
  }
}
