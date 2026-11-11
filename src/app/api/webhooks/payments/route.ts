import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { reconcilePaymentEvent } from "@/lib/payment-gateway";
import { presentedSecret, secretsMatch } from "@/lib/request-secret";
import { readStoredSecret } from "@/lib/security/crypto-vault";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const externalInvoiceId = String(
      body?.payment?.id || body?.externalInvoiceId || body?.id || body?.invoiceId || ""
    ).trim();
    if (!externalInvoiceId) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const invoice = await prisma.invoice.findFirst({
      where: {
        OR: [{ externalInvoiceId }, { id: externalInvoiceId }],
      },
      select: { id: true, schoolId: true, externalInvoiceId: true },
    });
    if (!invoice) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const config = await prisma.schoolPaymentConfig.findUnique({
      where: { schoolId: invoice.schoolId },
      select: { webhookSecret: true },
    });
    if (!secretsMatch(presentedSecret(req), readStoredSecret(config?.webhookSecret))) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const eventStatus = String(body?.event || body?.status || "PAYMENT_RECEIVED");
    let status: "PAID" | "OVERDUE" | "CANCELED" = "PAID";
    if (eventStatus.includes("OVERDUE")) status = "OVERDUE";
    if (eventStatus.includes("REFUND") || eventStatus.includes("CANCEL")) status = "CANCELED";

    const updated = await reconcilePaymentEvent({
      externalInvoiceId: invoice.externalInvoiceId,
      invoiceId: invoice.id,
      status,
      paidAt: body?.paidAt ? new Date(body.paidAt) : new Date(),
    });

    return NextResponse.json({ received: true, status: updated.status });
  } catch (error) {
    console.error("[payments-webhook] Error reconciling payment:", error);
    return NextResponse.json({ error: "Não foi possível registrar o pagamento." }, { status: 500 });
  }
}
