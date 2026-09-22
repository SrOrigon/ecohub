import { formatBRL } from "@/lib/student-finance";
import { formatDate } from "@/lib/utils";

export function normalizeWhatsAppNumber(phone: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");

  // Formato nacional brasileiro com DDD (10 ou 11 dígitos, ex: 21999998888 ou 2133334444)
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  // Já em formato internacional com 55 (12 ou 13 dígitos)
  if (digits.length === 12 || digits.length === 13) {
    if (digits.startsWith("55")) return digits;
  }

  // Outros formatos com pelo menos 10 dígitos
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
  const amountStr = formatBRL(invoice.amountCents);
  const dueDateStr = formatDate(invoice.dueDate.toString());
  const parentGreeting = invoice.parentName ? `Olá, ${invoice.parentName}!` : "Olá!";

  let message = `${parentGreeting}\n\n`;
  message += `Lembrete de cobrança de *${schoolName}* referente ao estudante *${invoice.studentName}*:\n\n`;
  message += `📌 *Fatura:* ${invoice.title}\n`;
  message += `💰 *Valor:* ${amountStr}\n`;
  message += `📅 *Vencimento:* ${dueDateStr}\n\n`;

  if (invoice.pixCopyPaste) {
    message += `🔑 *Pix Copia e Cola:*\n\`\`\`${invoice.pixCopyPaste}\`\`\`\n\n`;
  } else if (invoice.pixKey) {
    message += `🔑 *Chave Pix da Instituição:* ${invoice.pixKey}\n\n`;
  }

  message += `Agradecemos pela atenção e parceria! Caso já tenha efetuado o pagamento, por gentileza desconsidere este aviso.`;

  return message;
}

export function generateWhatsAppLink(phone: string, text: string): string | null {
  const normalizedPhone = normalizeWhatsAppNumber(phone);
  if (!normalizedPhone) return null;

  const encodedText = encodeURIComponent(text);
  return `https://api.whatsapp.com/send?phone=${normalizedPhone}&text=${encodedText}`;
}
