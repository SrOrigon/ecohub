import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import {
  endOfDay,
  serializeNote,
  startOfDay,
  type PersonalNoteDTO,
} from "@/lib/personal-notes";
import { assertSelf } from "@/lib/security/access-control";

export async function fetchPersonalNotesForUser(
  actor: SessionUser,
  userId: string
): Promise<PersonalNoteDTO[]> {
  assertSelf(actor, userId);

  const notes = await prisma.userNote.findMany({
    where: { userId },
    orderBy: [{ date: "desc" }, { updatedAt: "desc" }],
  });
  return notes.map(serializeNote);
}

export async function fetchTodayPersonalNotes(
  actor: SessionUser,
  userId: string
): Promise<PersonalNoteDTO[]> {
  assertSelf(actor, userId);

  const today = new Date();
  const notes = await prisma.userNote.findMany({
    where: {
      userId,
      date: { gte: startOfDay(today), lte: endOfDay(today) },
    },
    orderBy: { updatedAt: "desc" },
    take: 5,
  });
  return notes.map(serializeNote);
}
