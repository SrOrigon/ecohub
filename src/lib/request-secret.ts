import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

export function presentedSecret(request: Request) {
  const header = request.headers.get("x-webhook-secret")?.trim();
  if (header) return header;
  const authorization = request.headers.get("authorization") ?? "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
}

export function secretsMatch(presented: string, expected: string) {
  if (!presented || !expected) return false;
  const left = Buffer.from(presented);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function requireCronSecret(request: Request) {
  const expected = process.env.CRON_SECRET?.trim() ?? "";
  if (expected.length < 16 || !secretsMatch(presentedSecret(request), expected)) {
    if (expected.length < 16) {
      console.error("[cron] CRON_SECRET ausente ou curto. A rota ficou fechada.");
    }
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  return null;
}
