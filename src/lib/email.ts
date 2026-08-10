export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export type SendEmailResult = {
  ok: boolean;
  sent: boolean;
  skipped?: boolean;
  error?: string;
};

/** Envia e-mail via Resend quando RESEND_API_KEY está configurado; senão registra no log. */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim() ?? "EduHub <onboarding@resend.dev>";

  if (!apiKey) {
    console.info("[email:skipped]", { to: input.to, subject: input.subject });
    return { ok: true, sent: false, skipped: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text ?? input.html.replace(/<[^>]+>/g, " "),
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[email:error]", res.status, body);
      return { ok: false, sent: false, error: "Falha ao enviar e-mail." };
    }

    return { ok: true, sent: true };
  } catch (error) {
    console.error("[email:exception]", error);
    return { ok: false, sent: false, error: "Erro de conexão ao enviar e-mail." };
  }
}
