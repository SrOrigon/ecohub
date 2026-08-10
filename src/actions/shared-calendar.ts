"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  parseSchoolSettings,
  stringifySchoolSettings,
  type CalendarEvent,
  type SchoolHoliday,
  type SchoolSettings,
} from "@/lib/school-settings";

const CALENDAR_STAFF = ["admin", "director", "secretary", "teacher"] as const;

async function loadSettings(schoolId: string) {
  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) throw new Error("Escola não encontrada.");
  return { school, settings: parseSchoolSettings(school.settings) };
}

async function saveSettings(schoolId: string, settings: SchoolSettings) {
  await prisma.school.update({
    where: { id: schoolId },
    data: { settings: stringifySchoolSettings(settings) },
  });
  revalidatePath("/dashboard/calendario");
  revalidatePath("/dashboard/agenda");
  revalidatePath("/dashboard/professor");
  revalidatePath("/dashboard/aluno");
  revalidatePath("/dashboard/responsavel");
}

export async function addSharedCalendarItemAction(formData: FormData): Promise<void> {
  const user = await requireSession([...CALENDAR_STAFF]);
  if (!user.schoolId) return;

  const itemType = String(formData.get("itemType") ?? "event");
  const date = String(formData.get("date") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();

  if (!date || !label) return;

  const { settings } = await loadSettings(user.schoolId);

  if (itemType === "holiday") {
    const holiday: SchoolHoliday = { date, label };
    if (settings.calendar.holidays.some((h) => h.date.slice(0, 10) === date && h.label === label)) return;
    settings.calendar.holidays.push(holiday);
    settings.calendar.holidays.sort((a, b) => a.date.localeCompare(b.date));
  } else {
    const kind = (String(formData.get("kind") ?? "event") || "event") as CalendarEvent["kind"];
    const event: CalendarEvent = { date, label, kind };
    settings.calendar.events.push(event);
    settings.calendar.events.sort((a, b) => a.date.localeCompare(b.date));
  }

  await saveSettings(user.schoolId, settings);
}

export async function removeSharedCalendarItemAction(formData: FormData): Promise<void> {
  const user = await requireSession([...CALENDAR_STAFF]);
  if (!user.schoolId) return;

  const itemType = String(formData.get("itemType") ?? "");
  const date = String(formData.get("date") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();

  const { settings } = await loadSettings(user.schoolId);

  if (itemType === "holiday") {
    settings.calendar.holidays = settings.calendar.holidays.filter(
      (h) => !(h.date.slice(0, 10) === date && h.label === label)
    );
  } else {
    settings.calendar.events = settings.calendar.events.filter(
      (e) => !(e.date.slice(0, 10) === date && e.label === label)
    );
  }

  await saveSettings(user.schoolId, settings);
}

export async function updateSharedCalendarMetaAction(formData: FormData): Promise<void> {
  const user = await requireSession(["admin", "director", "secretary"]);
  if (!user.schoolId) return;

  const yearStart = String(formData.get("yearStart") ?? "").trim();
  const yearEnd = String(formData.get("yearEnd") ?? "").trim();
  const classStartTime = String(formData.get("classStartTime") ?? "").trim();
  const classEndTime = String(formData.get("classEndTime") ?? "").trim();
  const schoolDaysRaw = String(formData.get("schoolDays") ?? "");

  const { settings } = await loadSettings(user.schoolId);

  if (yearStart) settings.calendar.yearStart = yearStart;
  if (yearEnd) settings.calendar.yearEnd = yearEnd;
  if (classStartTime) settings.calendar.classStartTime = classStartTime;
  if (classEndTime) settings.calendar.classEndTime = classEndTime;
  if (schoolDaysRaw) {
    settings.calendar.schoolDays = schoolDaysRaw
      .split(",")
      .map((d) => Number(d.trim()))
      .filter((d) => !Number.isNaN(d) && d >= 0 && d <= 6);
  }

  await saveSettings(user.schoolId, settings);
}
