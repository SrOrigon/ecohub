export interface WhatsAppInvoicePayload {
  parentName: string;
  studentName: string;
  schoolName: string;
  amount: number;
  dueDate: string;
  pixCode?: string | null;
  referenceMonth?: string | null;
}

/**
 * Higieniza telefones do padrão brasileiro para o formato internacional E.164.
 * Remove caracteres não numéricos e prefixa '55' caso não exista.
 */
export function sanitizeBrazilianPhone(phone: string): string {
  let clean = phone.replace(/\D/g, "");
  if (clean.length === 10 || clean.length === 11) {
    clean = `55${clean}`;
  }
  return clean;
}

/**
 * Formata valores numéricos para o padrão de moeda Real (BRL).
 */
export function formatCurrencyBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatBRL(value: number): string {
  return formatCurrencyBRL(value);
}

/**
 * Constrói a mensagem formal e amigável com os detalhes da fatura e Pix.
 */
export function buildBillingMessageText(payload: WhatsAppInvoicePayload): string {
  const formattedVal = formatCurrencyBRL(payload.amount);
  const dueDate = prettyDueDate(payload.dueDate);
  const ref = payload.referenceMonth ? ` referente a *${payload.referenceMonth}*` : "";

  let msg = `Olá, ${payload.parentName}!\n\n`;
  msg += `Lembramos sobre a fatura escolar de *${payload.studentName}*${ref}, `;
  msg += `com vencimento em *${dueDate}* no valor de *${formattedVal}*.\n\n`;

  if (payload.pixCode) {
    msg += `📌 *Código Pix Copia e Cola:*\n${payload.pixCode}\n\n`;
  }

  msg += `Caso já tenha efetuado o pagamento, por favor desconsidere este aviso.\n\n`;
  msg += `Atenciosamente,\n*${payload.schoolName}*`;
  return msg;
}

function prettyDueDate(value: string) {
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR").format(parsed);
}

/**
 * Constrói a mensagem formal e amigável com os detalhes da fatura e Pix.
 */
export function buildWhatsAppBillingMessage(payload: WhatsAppInvoicePayload): string {
  return encodeURIComponent(buildBillingMessageText(payload));
}

export async function sendWhatsAppCloudMessage(params: {
  phone: string;
  text: string;
  phoneNumberId: string;
  accessToken: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const to = normalizeWhatsAppNumber(params.phone);
  if (!to) return { ok: false, error: "Telefone de WhatsApp inválido." };

  const response = await fetch(
    `https://graph.facebook.com/v21.0/${params.phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { preview_url: false, body: params.text },
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    return { ok: false, error: body.slice(0, 280) || "Falha ao enviar pelo WhatsApp." };
  }

  return { ok: true };
}

export async function sendWhatsAppWebhookMessage(params: {
  webhookUrl: string;
  phone: string;
  text: string;
  studentName: string;
  amountCents: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const to = normalizeWhatsAppNumber(params.phone);
  if (!to) return { ok: false, error: "Telefone de WhatsApp inválido." };

  const response = await fetch(params.webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phone: to,
      message: params.text,
      studentName: params.studentName,
      amountCents: params.amountCents,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    return { ok: false, error: body.slice(0, 280) || "Webhook de WhatsApp recusou o envio." };
  }

  return { ok: true };
}

/**
 * Gera a URL universal wa.me para abrir diretamente o WhatsApp Web/App.
 */
export function buildWhatsAppLink(phone: string, encodedMessage: string): string {
  const cleanPhone = sanitizeBrazilianPhone(phone);
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
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
