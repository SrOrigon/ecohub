import type { SchoolSettings } from "@/lib/school-settings";
import { parseDateOnly as parseLocalDateOnly, startOfToday, toDateKey } from "@/lib/date-only";

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function formatSchoolDays(days: number[]) {
  return days
    .sort((a, b) => a - b)
    .map((d) => WEEKDAY_LABELS[d] ?? String(d))
    .join(", ");
}

export function isSchoolDay(date: Date, settings: SchoolSettings) {
  const day = date.getDay();
  return settings.calendar.schoolDays.includes(day);
}

export function parseDateOnly(iso: string) {
  return parseLocalDateOnly(iso) ?? startOfToday();
}

export function isWithinSchoolYear(date: Date, settings: SchoolSettings) {
  const start = parseDateOnly(settings.calendar.yearStart);
  const end = parseDateOnly(settings.calendar.yearEnd);
  end.setHours(23, 59, 59, 999);
  return date >= start && date <= end;
}

export function getHolidayOn(date: Date, settings: SchoolSettings) {
  const key = toDateKey(date);
  return settings.calendar.holidays.find((h) => h.date.slice(0, 10) === key);
}

export function getEventsOn(date: Date, settings: SchoolSettings) {
  const key = toDateKey(date);
  return settings.calendar.events.filter((e) => e.date.slice(0, 10) === key);
}

export function getUpcomingCalendarItems(settings: SchoolSettings, limit = 5) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const items = [
    ...settings.calendar.holidays.map((h) => ({
      date: parseDateOnly(h.date),
      label: h.label,
      kind: "holiday" as const,
    })),
    ...settings.calendar.events.map((e) => ({
      date: parseDateOnly(e.date),
      label: e.label,
      kind: e.kind ?? ("event" as const),
    })),
  ]
    .filter((i) => i.date >= today)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, limit);

  return items;
}

export function getUpcomingEvents(settings: SchoolSettings, limit = 5) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return getUpcomingCalendarItems(settings, limit).map((item) => {
    const diff = Math.round((item.date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return {
      date: item.date.toISOString().slice(0, 10),
      label: item.label,
      kind: item.kind,
      isToday: diff === 0,
      daysUntil: diff,
    };
  });
}

export function getTodaySchoolStatus(settings: SchoolSettings) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const holiday = getHolidayOn(today, settings);
  if (holiday) {
    return {
      label: `Feriado: ${holiday.label}`,
      isClassDay: false,
      hours: null,
    };
  }
  if (!isWithinSchoolYear(today, settings)) {
    return {
      label: "Fora do período letivo",
      isClassDay: false,
      hours: null,
    };
  }
  if (!isSchoolDay(today, settings)) {
    return {
      label: "Sem aula hoje",
      isClassDay: false,
      hours: null,
    };
  }
  return {
    label: "Dia letivo",
    isClassDay: true,
    hours: `${settings.calendar.classStartTime} – ${settings.calendar.classEndTime}`,
  };
}
