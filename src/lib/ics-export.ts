import type { SchoolSettings } from "@/lib/school-settings";

export type CalendarEventItem = {
  id?: string;
  title: string;
  description?: string;
  location?: string;
  startDate: Date | string; // 'YYYY-MM-DD' or ISO or Date
  startTime?: string;       // 'HH:mm'
  endTime?: string;         // 'HH:mm'
  allDay?: boolean;
};

function formatGoogleDate(dateStrOrObj: Date | string, timeStr?: string): string {
  const date = typeof dateStrOrObj === "string" ? new Date(dateStrOrObj) : dateStrOrObj;
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");

  if (!timeStr) {
    return `${y}${m}${d}`;
  }

  const [hh, mm] = timeStr.split(":").map(Number);
  const hour = String(isNaN(hh) ? 0 : hh).padStart(2, "0");
  const min = String(isNaN(mm) ? 0 : mm).padStart(2, "0");
  return `${y}${m}${d}T${hour}${min}00Z`;
}

/**
 * Gera URL direta para adicionar evento no Google Agenda (1-clique).
 */
export function buildGoogleCalendarUrl(event: CalendarEventItem): string {
  const base = "https://calendar.google.com/calendar/render?action=TEMPLATE";
  const title = encodeURIComponent(event.title);
  const details = encodeURIComponent(event.description || "");
  const location = encodeURIComponent(event.location || "");

  let datesParam = "";
  if (event.allDay || !event.startTime) {
    const d = formatGoogleDate(event.startDate);
    // Para evento de dia inteiro no Google Agenda, end date é d+1 dia
    datesParam = `${d}/${d}`;
  } else {
    const start = formatGoogleDate(event.startDate, event.startTime);
    const end = formatGoogleDate(event.startDate, event.endTime || event.startTime);
    datesParam = `${start}/${end}`;
  }

  return `${base}&text=${title}&details=${details}&location=${location}&dates=${datesParam}`;
}

/**
 * Constrói conteúdo iCalendar (.ics) para lista de eventos (compatível com Google Agenda, Apple e Outlook).
 */
export function buildAppointmentsIcs(
  appointments: Array<{
    id: string;
    studentName: string;
    studentWhatsapp?: string | null;
    serviceName: string;
    instructorName?: string | null;
    date: Date | string;
    startTime: string;
    endTime: string;
    isOnline?: boolean;
    schoolName?: string;
  }>,
  calendarName = "Ecohub Agendamentos"
): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ecohub//Agendamentos e Grade//PT",
    `X-WR-CALNAME:${escapeIcs(calendarName)}`,
    "X-WR-TIMEZONE:America/Sao_Paulo",
    "CALSCALE:GREGORIAN",
  ];

  for (const app of appointments) {
    const d = typeof app.date === "string" ? new Date(app.date) : app.date;
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    const datePrefix = `${y}${m}${day}`;

    const [sh, sm] = (app.startTime || "08:00").split(":");
    const [eh, em] = (app.endTime || "09:00").split(":");

    const dtStart = `${datePrefix}T${sh.padStart(2, "0")}${sm.padStart(2, "0")}00`;
    const dtEnd = `${datePrefix}T${eh.padStart(2, "0")}${em.padStart(2, "0")}00`;

    const summary = `${app.serviceName} - ${app.studentName}`;
    const desc = `Aula/Atendimento: ${app.serviceName}\\nAluno(a): ${app.studentName}\\nWhatsApp: ${app.studentWhatsapp || "Não informado"}\\nInstrutor: ${app.instructorName || "Não atribuído"}\\nInstituição: ${app.schoolName || "Ecohub"}`;
    const location = app.isOnline ? "Online" : app.schoolName || "Presencial";

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:appointment-${app.id}@ecohub`);
    lines.push(`DTSTAMP:${datePrefix}T000000Z`);
    lines.push(`DTSTART:${dtStart}`);
    lines.push(`DTEND:${dtEnd}`);
    lines.push(`SUMMARY:${escapeIcs(summary)}`);
    lines.push(`DESCRIPTION:${escapeIcs(desc)}`);
    lines.push(`LOCATION:${escapeIcs(location)}`);
    lines.push("STATUS:CONFIRMED");
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function buildSchoolCalendarIcs(settings: SchoolSettings, schoolName: string): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ecohub//Calendario Escolar//PT",
    `X-WR-CALNAME:${escapeIcs(schoolName)}`,
  ];

  for (const h of settings.calendar.holidays) {
    const d = h.date.replace(/-/g, "");
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:holiday-${d}@ecohub`);
    lines.push(`DTSTART;VALUE=DATE:${d}`);
    lines.push(`SUMMARY:${escapeIcs(h.label)}`);
    lines.push("END:VEVENT");
  }

  for (const e of settings.calendar.events) {
    const d = e.date.replace(/-/g, "");
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:event-${d}-${escapeIcs(e.label).slice(0, 20)}@ecohub`);
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
