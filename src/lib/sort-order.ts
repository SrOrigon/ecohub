/** Ordenação consistente em português (alfabética + numérica natural). */
export const PT_LOCALE = "pt-BR";

const collator = new Intl.Collator(PT_LOCALE, {
  sensitivity: "base",
  numeric: true,
  ignorePunctuation: true,
});

export function compareTextPt(a: string, b: string): number {
  return collator.compare(a.trim(), b.trim());
}

export function sortByTextPt<T>(items: readonly T[], getText: (item: T) => string): T[] {
  return [...items].sort((left, right) => compareTextPt(getText(left), getText(right)));
}

export function sortStringsPt(items: readonly string[]): string[] {
  return sortByTextPt(items, (item) => item);
}

export function compareEnrollmentCode(a: string, b: string): number {
  return compareTextPt(a, b);
}

export function sortStudentsByName<
  T extends { user?: { fullName?: string | null } | null },
>(students: readonly T[]): T[] {
  return sortByTextPt(students, (student) => student.user?.fullName ?? "");
}

export function sortStudentsByEnrollmentCode<
  T extends { enrollmentCode?: string | null },
>(students: readonly T[]): T[] {
  return [...students].sort((left, right) =>
    compareEnrollmentCode(left.enrollmentCode ?? "", right.enrollmentCode ?? "")
  );
}

export function sortTeachersByName<
  T extends { fullName?: string | null },
>(teachers: readonly T[]): T[] {
  return sortByTextPt(teachers, (teacher) => teacher.fullName ?? "");
}
