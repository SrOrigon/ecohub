/**
 * Utilidades para datas "sem hora" (YYYY-MM-DD).
 *
 * `new Date("2026-02-01")` é interpretado como meia-noite UTC. Em fusos negativos
 * (Brasil) isso vira o dia anterior no horário local, deslocando feriados, chamadas
 * e agenda em um dia. As funções abaixo sempre trabalham no fuso local.
 */

/** Converte "YYYY-MM-DD" em Date local à meia-noite. Retorna null se inválido. */
export function parseDateOnly(iso: string | null | undefined): Date | null {
  if (!iso) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (!match) {
    const fallback = new Date(iso);
    if (Number.isNaN(fallback.getTime())) return null;
    fallback.setHours(0, 0, 0, 0);
    return fallback;
  }

  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Igual a parseDateOnly, mas cai para a data de hoje quando a entrada é inválida. */
export function parseDateOnlyOrToday(iso: string | null | undefined): Date {
  return parseDateOnly(iso) ?? startOfToday();
}

/** Data de hoje à meia-noite no fuso local. */
export function startOfToday(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

/** Formata uma Date como "YYYY-MM-DD" usando o fuso local (não UTC). */
export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Chave "YYYY-MM-DD" do dia de hoje no fuso local. */
export function todayKey(): string {
  return toDateKey(new Date());
}
