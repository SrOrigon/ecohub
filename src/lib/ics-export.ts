import type { SchoolSettings } from "@/lib/school-settings";

export function buildSchoolCalendarIcs(settings: SchoolSettings, schoolName: string): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//EduHub//Calendario Escolar//PT",
    `X-WR-CALNAME:${escapeIcs(schoolName)}`,
  ];

  for (const h of settings.calendar.holidays) {
    const d = h.date.replace(/-/g, "");
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:holiday-${d}@eduhub`);
    lines.push(`DTSTART;VALUE=DATE:${d}`);
    lines.push(`SUMMARY:${escapeIcs(h.label)}`);
    lines.push("END:VEVENT");
  }

  for (const e of settings.calendar.events) {
    const d = e.date.replace(/-/g, "");
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:event-${d}-${escapeIcs(e.label).slice(0, 20)}@eduhub`);
    lines.push(`DTSTART;VALUE=DATE:${d}`);
    lines.push(`SUMMARY:${escapeIcs(e.label)}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function escapeIcs(s: string) {
  return s.replace(/[,;\\]/g, "\\$&").replace(/\n/g, "\\n");
}

export function whatsAppShareUrl(phone: string | null | undefined, message: string): string {
  const text = encodeURIComponent(message);
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length >= 10) {
    return `https://wa.me/55${digits}?text=${text}`;
  }
  return `https://wa.me/?text=${text}`;
}
