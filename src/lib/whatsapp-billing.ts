export interface WhatsAppInvoicePayload {
  parentName: string;
  studentName: string;
  schoolName: string;
  amount: number;
  dueDate: string;
  pixCode?: string | null;
  referenceMonth?: string | null;
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatCurrencyBRL(value: number): string {
  return formatBRL(value);
}

export function buildWhatsAppBillingMessage(payload: WhatsAppInvoicePayload): string {
  const formattedVal = formatBRL(payload.amount);
  const ref = payload.referenceMonth ? ` referente a ${payload.referenceMonth}` : "";

  let msg = `Olá, ${payload.parentName}!\n\n`;
  msg += `Lembramos da fatura escolar de *${payload.studentName}*${ref}, `;
  msg += `com vencimento em *${payload.dueDate}* no valor de *${formattedVal}*.\n\n`;

  if (payload.pixCode) {
    msg += `📌 *Código Pix Copia e Cola:*\n\`\`\`${payload.pixCode}\`\`\`\n\n`;
  }

  msg += `Qualquer dúvida, estamos à disposição.\n*${payload.schoolName}*`;
  return encodeURIComponent(msg);
}

export function buildWhatsAppLink(phone: string, encodedMessage: string): string {
  let clean = phone.replace(/\D/g, "");
  if (clean.length === 10 || clean.length === 11) {
    clean = `55${clean}`;
  }
  return `https://wa.me/${clean}?text=${encodedMessage}`;
}

export function sanitizeBrazilianPhone(phone: string): string {
  let clean = phone.replace(/\D/g, "");
  if (clean.length === 10 || clean.length === 11) {
    clean = `55${clean}`;
  }
  return clean;
}

export function normalizeWhatsAppNumber(phone: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");

  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  if (digits.length === 12 || digits.length === 13) {
    if (digits.startsWith("55")) return digits;
  }

  if (digits.length >= 10 && digits.length <= 15) {
    return digits;
  }

  return null;
}

export function formatWhatsAppMask(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export interface InvoiceBillingDetails {
  id: string;
  title: string;
  amountCents: number;
  dueDate: Date | string;
  pixCopyPaste?: string | null;
  pixQrCodeBase64?: string | null;
  studentName: string;
  parentName?: string | null;
  schoolName?: string;
  pixKey?: string | null;
}

export function generateInvoiceWhatsAppMessage(
  invoice: InvoiceBillingDetails,
  schoolName: string = "Ecohub"
): string {
  return buildWhatsAppBillingMessage({
    parentName: invoice.parentName || "Responsável",
    studentName: invoice.studentName,
    schoolName: schoolName,
    amount: invoice.amountCents / 100,
    dueDate: String(invoice.dueDate),
    pixCode: invoice.pixCopyPaste || invoice.pixKey,
  });
}

export function generateWhatsAppLink(phone: string, text: string): string | null {
  const normalizedPhone = normalizeWhatsAppNumber(phone);
  if (!normalizedPhone) return null;

  const encodedText = text.includes("%") ? text : encodeURIComponent(text);
  return `https://api.whatsapp.com/send?phone=${normalizedPhone}&text=${encodedText}`;
}
