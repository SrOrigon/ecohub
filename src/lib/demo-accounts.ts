/** Contas da escola de demonstração (geradas por `npm run db:demo`). */

export const DEMO_SCHOOL_SLUG = "colegio-modelo-ecohub";
export const DEMO_SCHOOL_NAME = "Colégio Modelo EcoHub";
export const DEMO_PASSWORD = "EcoHub2026!";

export const DEMO_DIRECTOR_EMAIL = "diretora.helena@colegiomodelo.com.br";
export const DEMO_TEACHER_EMAIL = "prof.ricardo@colegiomodelo.com.br";
export const DEMO_STUDENT_EMAIL = "aluno.demo-6-01@colegiomodelo.com.br";
export const DEMO_STUDENT_ENROLLMENT = "DEMO-6-01";
export const DEMO_STUDENT_PIN = "123456";

export type DemoPortal = "escola" | "professor" | "aluno" | "aluno-pin";

export const DEMO_PORTAL_LABELS: Record<DemoPortal, string> = {
  escola: "Instituição",
  professor: "Professor",
  aluno: "Aluno (e-mail)",
  "aluno-pin": "Aluno (matrícula + PIN)",
};

const VALID_DEMO_PORTALS: DemoPortal[] = ["escola", "professor", "aluno", "aluno-pin"];

export function isDemoPortal(value: string): value is DemoPortal {
  return (VALID_DEMO_PORTALS as string[]).includes(value);
}

export function demoCredentialsForPortal(portal: DemoPortal): {
  email?: string;
  password?: string;
  loginPortal?: "escola" | "professor" | "aluno";
  schoolSlug?: string;
  enrollmentCode?: string;
  pin?: string;
} {
  switch (portal) {
    case "escola":
      return { email: DEMO_DIRECTOR_EMAIL, password: DEMO_PASSWORD, loginPortal: "escola" };
    case "professor":
      return { email: DEMO_TEACHER_EMAIL, password: DEMO_PASSWORD, loginPortal: "professor" };
    case "aluno":
      return { email: DEMO_STUDENT_EMAIL, password: DEMO_PASSWORD, loginPortal: "aluno" };
    case "aluno-pin":
      return {
        schoolSlug: DEMO_SCHOOL_SLUG,
        enrollmentCode: DEMO_STUDENT_ENROLLMENT,
        pin: DEMO_STUDENT_PIN,
      };
  }
}
