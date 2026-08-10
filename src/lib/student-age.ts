const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

export function calculateAge(birthDate: Date, reference = new Date()): number {
  const diff = reference.getTime() - birthDate.getTime();
  return Math.floor(diff / MS_PER_YEAR);
}

export function parseBirthDate(value: string | null | undefined): Date | null {
  if (!value?.trim()) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export function isMinor(birthDate: Date | null | undefined, minAge = 18): boolean {
  if (!birthDate) return true;
  return calculateAge(birthDate) < minAge;
}

export function canSelfRegisterStudent(birthDate: Date | null | undefined, minAge = 18): boolean {
  if (!birthDate) return false;
  return calculateAge(birthDate) >= minAge;
}
