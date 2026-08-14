import { NextResponse } from "next/server";
import { authorizeMaintenanceRequest } from "@/lib/maintenance-auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** GET ?q= — lista escolas (busca por nome, slug, cnpj ou e-mail do diretor). */
export async function GET(request: Request) {
  if (!authorizeMaintenanceRequest(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const q = new URL(request.url).searchParams.get("q")?.trim().toLowerCase() ?? "";

  const schools = await prisma.school.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      cnpj: true,
      verificationStatus: true,
      createdAt: true,
      users: {
        where: { role: { in: ["director", "admin"] } },
        select: { email: true, fullName: true, role: true },
        take: 3,
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const filtered = q
    ? schools.filter((s) => {
        const haystack = [
          s.name,
          s.slug,
          s.cnpj ?? "",
          ...s.users.map((u) => u.email),
          ...s.users.map((u) => u.fullName),
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      })
    : schools;

  return NextResponse.json({ count: filtered.length, schools: filtered });
}
