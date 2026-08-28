/** Disciplinas cadastradas manualmente pela instituição  -  fonte única do sistema. */

import { compareTextPt } from "@/lib/sort-order";

export function normalizeSubjectName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function parseSubjectsInput(raw: string): string[] {
  return dedupeSubjects(
    raw
      .split(/\r?\n|,/)
      .map(normalizeSubjectName)
      .filter(Boolean)
  );
}

export function dedupeSubjects(subjects: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const subject of subjects.map(normalizeSubjectName).filter(Boolean)) {
    const key = subject.toLocaleLowerCase("pt-BR");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(subject);
  }
  return result;
}

export function isInstitutionSubject(subject: string, configured: string[]): boolean {
  const normalized = normalizeSubjectName(subject).toLocaleLowerCase("pt-BR");
  return configured.some((item) => item.toLocaleLowerCase("pt-BR") === normalized);
}

export function assertInstitutionSubject(
  subject: string,
  configured: string[]
): { ok: true } | { ok: false; error: string } {
  if (configured.length === 0) {
    return {
      ok: false,
      error: "Cadastre as disciplinas da instituição em Disciplinas antes de continuar.",
    };
  }
  if (!isInstitutionSubject(subject, configured)) {
    return {
      ok: false,
      error: `"${subject}" não está entre as disciplinas cadastradas pela instituição.`,
    };
  }
  return { ok: true };
}

export function mergeSubjectLists(configured: string[], fromData: string[]): string[] {
  const merged = dedupeSubjects([...configured, ...fromData.filter(Boolean)]);
  if (configured.length === 0) {
    return merged.sort((a, b) => compareTextPt(a, b));
  }
  const order = new Map(configured.map((subject, index) => [subject.toLocaleLowerCase("pt-BR"), index]));
  return merged.sort((a, b) => {
    const ia = order.get(a.toLocaleLowerCase("pt-BR")) ?? 999;
    const ib = order.get(b.toLocaleLowerCase("pt-BR")) ?? 999;
    if (ia !== ib) return ia - ib;
    return compareTextPt(a, b);
  });
}
