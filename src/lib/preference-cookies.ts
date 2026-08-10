/** Cookies não sensíveis para melhorar UX (preferências, não autenticação). */

export const PREF_COOKIES = {
  lastPortal: "eduhub_last_portal",
  lastSchoolSlug: "eduhub_last_school_slug",
  rememberEmail: "eduhub_remember_email",
  onboardingDone: "eduhub_onboarding_done",
} as const;

export type LoginPortal = "escola" | "professor" | "aluno" | "responsavel";

export const PREF_MAX_AGE = 60 * 60 * 24 * 365; // 1 ano

export function isLoginPortal(value: string): value is LoginPortal {
  return value === "escola" || value === "professor" || value === "aluno" || value === "responsavel";
}
