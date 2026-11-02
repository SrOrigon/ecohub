import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { dispatchSchoolWhatsAppBilling } from "@/lib/billing-dispatch";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const schools = await prisma.school.findMany({ select: { id: true, name: true } });
    const results = [];

    for (const school of schools) {
      const result = await dispatchSchoolWhatsAppBilling(school.id);
      results.push({
        schoolId: school.id,
        schoolName: school.name,
        sent: result.sent,
        failed: result.failed,
        skipped: result.skipped,
        prepared: result.prepared,
        configured: result.configured,
      });
    }

    return NextResponse.json({
      message: "Cobranças de WhatsApp processadas.",
      schools: results.length,
      results,
    });
  } catch (error) {
    console.error("[CRON_WHATSAPP_BILLING]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
