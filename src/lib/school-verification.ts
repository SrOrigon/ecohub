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

  if (situacao.includes("INDISPONIVEL") || !situacao.trim()) {
    return SCHOOL_VERIFICATION_STATUS.pending;
  }

  if (!situacao.includes("ATIV")) {
    return SCHOOL_VERIFICATION_STATUS.rejected;
  }

  // CNPJ ativo na Receita Federal: verificação automática.
  // CNAE de ensino (grupo 85) é informativo; não bloqueia operação nem cadastros públicos.
  return SCHOOL_VERIFICATION_STATUS.verified;
}

/** Indica se o CNAE principal é do setor de educação (grupo 85). */
export function hasEducationCnae(cnae: string | number | null | undefined): boolean {
  return isEducationCnae(cnae);
}

export function verificationStatusMessage(status: SchoolVerificationStatus): string {
  switch (status) {
    case SCHOOL_VERIFICATION_STATUS.verified:
      return "Instituição verificada na Receita Federal. Professores e famílias já podem se cadastrar com o código da escola.";
    case SCHOOL_VERIFICATION_STATUS.manual_review:
      return "Cadastro recebido. A verificação automática do CNPJ será concluída em instantes.";
    case SCHOOL_VERIFICATION_STATUS.pending:
      return "Consultando o CNPJ na Receita Federal. A verificação é automática e costuma concluir em segundos.";
    case SCHOOL_VERIFICATION_STATUS.rejected:
      return "CNPJ inativo ou inválido na Receita Federal.";
    default:
      return "";
  }
}

/** Banner persistente só para status que ainda exigem ação ou bloqueiam cadastros públicos. */
export function shouldShowVerificationBanner(status: string): boolean {
  return (
    status === SCHOOL_VERIFICATION_STATUS.pending ||
    status === SCHOOL_VERIFICATION_STATUS.manual_review ||
    status === SCHOOL_VERIFICATION_STATUS.rejected
  );
}
