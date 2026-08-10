export type DemoRoleKey = "director" | "secretary" | "professor" | "student" | "parent" | "pin";

export type DemoEmailAccount = {
  type: "email";
  email: string;
  password: string;
  label: string;
  tenantSlug: string;
};

export type DemoPinAccount = {
  type: "pin";
  schoolSlug: string;
  enrollmentCode: string;
  pin: string;
  label: string;
};

export const DEMO_PASSWORD = "demo123";

export const DEMO_ACCOUNTS: Record<DemoRoleKey, DemoEmailAccount | DemoPinAccount> = {
  director: {
    type: "email",
    email: "admin@eduhub.local",
    password: DEMO_PASSWORD,
    label: "Diretor(a)",
    tenantSlug: "escola-demo",
  },
  secretary: {
    type: "email",
    email: "secretaria@eduhub.local",
    password: DEMO_PASSWORD,
    label: "Secretaria",
    tenantSlug: "escola-demo",
  },
  professor: {
    type: "email",
    email: "professor@eduhub.local",
    password: DEMO_PASSWORD,
    label: "Professor(a)",
    tenantSlug: "escola-demo",
  },
  student: {
    type: "email",
    email: "lucas@aluno.local",
    password: DEMO_PASSWORD,
    label: "Aluno (e-mail)",
    tenantSlug: "escola-demo",
  },
  parent: {
    type: "email",
    email: "mariana@responsavel.local",
    password: DEMO_PASSWORD,
    label: "Responsável",
    tenantSlug: "escola-demo",
  },
  pin: {
    type: "pin",
    schoolSlug: "escola-demo",
    enrollmentCode: "2026001",
    pin: "123456",
    label: "Aluno (PIN)",
  },
};

export function isDemoRoleKey(value: string): value is DemoRoleKey {
  return value in DEMO_ACCOUNTS;
}

/** Papel padrão para demonstração rápida. */
export const DEFAULT_DEMO_ROLE: DemoRoleKey = "director";
