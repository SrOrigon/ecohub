import { NextResponse } from "next/server";
import { reconcilePaymentEvent } from "@/lib/payment-gateway";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const externalInvoiceId =
      body?.payment?.id ||
      body?.externalInvoiceId ||
      body?.id ||
      body?.invoiceId;

    const eventStatus = body?.event || body?.status || "PAYMENT_RECEIVED";

    let status: "PAID" | "OVERDUE" | "CANCELED" = "PAID";
    if (String(eventStatus).includes("OVERDUE")) status = "OVERDUE";
    if (String(eventStatus).includes("REFUND") || String(eventStatus).includes("CANCEL")) status = "CANCELED";

    if (!externalInvoiceId) {
      return NextResponse.json({ error: "External invoice id missing" }, { status: 400 });
    }

    const updated = await reconcilePaymentEvent({
      externalInvoiceId: String(externalInvoiceId),
      invoiceId: body?.invoiceId ? String(body.invoiceId) : null,
      status,
      paidAt: body?.paidAt ? new Date(body.paidAt) : new Date(),
    });

    return NextResponse.json({
      received: true,
      invoiceId: updated.id,
      status: updated.status,
    });
  } catch (error) {
    console.error("[payments-webhook] Error reconciling payment:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
