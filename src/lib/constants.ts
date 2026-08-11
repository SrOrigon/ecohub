export type UserRole = "admin" | "director" | "secretary" | "teacher" | "student" | "parent";
export type AttendanceStatus = "present" | "absent" | "late" | "justified";
export type XpSource = "grade" | "attendance" | "mission" | "badge" | "manual" | "exercise" | "trail" | "classGoal" | "occurrence" | "homeTask";

export const HOME_TASK_DEFAULT_XP = 100;
export const HOME_TASK_DEFAULT_COINS = 10;

export const USER_ROLES: UserRole[] = ["admin", "director", "secretary", "teacher", "student", "parent"];
export const ATTENDANCE_STATUSES: AttendanceStatus[] = ["present", "absent", "late", "justified"];

export const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  present: "Presente",
  absent: "Falta",
  late: "Atraso",
  justified: "Justificada",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  director: "Diretor",
  secretary: "Secretaria",
  teacher: "Professor",
  student: "Aluno",
  parent: "Responsável",
};

export const SUBJECTS = [
  "Matemática",
  "Português",
  "História",
  "Geografia",
  "Ciências",
  "Inglês",
  "Educação Física",
  "Artes",
];

export const PERIODS = ["1º Bimestre", "2º Bimestre", "3º Bimestre", "4º Bimestre"];

export const BRAZILIAN_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

export function formatUserLocation(city?: string | null, state?: string | null) {
  const parts = [city?.trim(), state?.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join(" — ") : null;
}

export const OCCURRENCE_KINDS = ["observation", "positive", "warning", "disciplinary"] as const;
export type OccurrenceKind = (typeof OCCURRENCE_KINDS)[number];

export const OCCURRENCE_LABELS: Record<OccurrenceKind, string> = {
  observation: "Observação",
  positive: "Elogio",
  warning: "Advertência",
  disciplinary: "Ocorrência disciplinar",
};

export const CLASS_GOAL_METRICS = ["mission", "exercise", "attendance"] as const;
export type ClassGoalMetric = (typeof CLASS_GOAL_METRICS)[number];

export const CLASS_GOAL_LABELS: Record<ClassGoalMetric, string> = {
  mission: "Missões concluídas",
  exercise: "Exercícios entregues",
  attendance: "Presença",
};

export const TRAIL_STEP_TYPES = ["mission", "exercise", "reward"] as const;
export type TrailStepType = (typeof TRAIL_STEP_TYPES)[number];

export function isKidFriendlyRole(role: UserRole) {
  return role === "student";
}
