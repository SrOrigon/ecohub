/** Início do dia em UTC local (YYYY-MM-DD → Date). */
export function parseNoteDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr?.trim()) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function formatNoteDateInput(date: Date | null | undefined): string {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

export function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export type PersonalNoteDTO = {
  id: string;
  title: string | null;
  content: string;
  date: string | null;
  createdAt: string;
  updatedAt: string;
};

export function serializeNote(note: {
  id: string;
  title: string | null;
  content: string;
  date: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): PersonalNoteDTO {
  return {
    id: note.id,
    title: note.title,
    content: note.content,
    date: note.date ? formatNoteDateInput(note.date) : null,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  };
}

export function groupNotesByDate(
  notes: PersonalNoteDTO[]
): { date: string; notes: PersonalNoteDTO[] }[] {
  const map = new Map<string, PersonalNoteDTO[]>();
  for (const note of notes) {
    if (!note.date) continue;
    const list = map.get(note.date) ?? [];
    list.push(note);
    map.set(note.date, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, grouped]) => ({ date, notes: grouped }));
}
