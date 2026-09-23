import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { decryptSecret } from "@/lib/security/crypto-vault";
import { awardXp } from "@/lib/gamification";
import { getSchoolSettingsForStudent } from "@/lib/school-settings";
import { makeReceiptCode } from "@/lib/student-finance";
import { logAuditEvent } from "@/lib/audit-logger";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ schoolSlug: string }> }
) {
  try {
    const { schoolSlug } = await params;
    const school = await prisma.school.findUnique({
      where: { slug: schoolSlug },
      include: { paymentConfigs: true },
    });

    if (!school) {
      return NextResponse.json({ error: "Escola não encontrada." }, { status: 404 });
    }

    const config = school.paymentConfigs[0];

    if (config?.encryptedApiKey) {
      try {
        decryptSecret(config.encryptedApiKey);
      } catch {
        /* ignore decrypt fallback */
      }
    }
    if (config?.encryptedApiSecret) {
      try {
        decryptSecret(config.encryptedApiSecret);
      } catch {
        /* ignore decrypt fallback */
      }
    }

    const body = await req.json();

    const externalInvoiceId =
      body?.payment?.id ||
      body?.externalInvoiceId ||
      body?.id ||
      body?.invoiceId;

    const eventStatus = String(body?.event || body?.status || "PAYMENT_RECEIVED").toUpperCase();

    let status: "PAID" | "OVERDUE" | "CANCELED" = "PAID";
    if (eventStatus.includes("OVERDUE")) status = "OVERDUE";
    if (eventStatus.includes("REFUND") || eventStatus.includes("CANCEL")) status = "CANCELED";

    if (!externalInvoiceId) {
      return NextResponse.json({ error: "Identificador externo da fatura ausente." }, { status: 400 });
    }

    // Busca StudentInvoice ou Invoice pelo externalInvoiceId ou id
    const studentInvoice = await prisma.studentInvoice.findFirst({
      where: {
        schoolId: school.id,
        OR: [{ externalInvoiceId: String(externalInvoiceId) }, { id: String(externalInvoiceId) }],
      },
      include: {
        student: { select: { id: true, enrollmentCode: true, financeAccount: true, userId: true } },
      },
    });

    if (!studentInvoice) {
      // Tenta fallback na tabela Invoice
      const legacyInvoice = await prisma.invoice.findFirst({
        where: {
          schoolId: school.id,
          OR: [{ externalInvoiceId: String(externalInvoiceId) }, { id: String(externalInvoiceId) }],
        },
      });

      if (!legacyInvoice) {
        return NextResponse.json({ error: "Fatura não encontrada." }, { status: 404 });
      }

      if (legacyInvoice.status === "PAID" && status === "PAID") {
        return NextResponse.json({ received: true, status: "PAID", idempotent: true });
      }

      await prisma.invoice.update({
        where: { id: legacyInvoice.id },
        data: { status, paidAt: status === "PAID" ? new Date() : legacyInvoice.paidAt },
      });

      return NextResponse.json({ received: true, status });
    }

    // Checagem de idempotência para StudentInvoice
    if (studentInvoice.status === "PAID" && status === "PAID") {
      return NextResponse.json({
        received: true,
        invoiceId: studentInvoice.id,
        status: "PAID",
        idempotent: true,
      });
    }

    const paidAt = body?.paidAt ? new Date(body.paidAt) : new Date();

    const updated = await prisma.studentInvoice.update({
      where: { id: studentInvoice.id },
      data: {
        status,
        paidAt: status === "PAID" ? paidAt : studentInvoice.paidAt,
      },
    });

    if (status === "PAID") {
      let account = studentInvoice.student.financeAccount;
      if (!account) {
        account = await prisma.studentFinanceAccount.create({
          data: { studentId: studentInvoice.studentId },
        });
      }

      const settings = await getSchoolSettingsForStudent(studentInvoice.studentId);
      const awardedXp = settings.finance.tuitionXp;
      const awardedCoins = settings.finance.tuitionCoins;

      const payment = await prisma.tuitionPayment.create({
        data: {
          accountId: account.id,
          studentId: studentInvoice.studentId,
          amountCents: studentInvoice.amountCents,
          dueDate: studentInvoice.dueDate,
          paidAt,
          method: "webhook_gateway",
          receiptCode: makeReceiptCode(studentInvoice.student.enrollmentCode),
          awardedXp,
          awardedCoins,
          note: `Conciliação automática via Webhook (${schoolSlug})`,
        },
      });

      await awardXp(
        studentInvoice.studentId,
        awardedXp,
        `Pagamento reconciliado via Pix: ${studentInvoice.title}`,
        "tuition",
        awardedCoins,
        settings
      );

      await logAuditEvent({
        schoolId: school.id,
        actorId: "WEBHOOK_GATEWAY",
        actorRole: "system",
        action: "WEBHOOK_PAYMENT_RECONCILED",
        entityType: "StudentInvoice",
        entityId: studentInvoice.id,
        diffAfter: {
          status: "PAID",
          receiptCode: payment.receiptCode,
          amountCents: studentInvoice.amountCents,
        },
      });
    }

    return NextResponse.json({
      received: true,
      invoiceId: updated.id,
      status: updated.status,
    });
  } catch (error) {
    console.error("[payments-school-webhook] Erro ao processar webhook:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno" },
      { status: 500 }
    );
  }
}
