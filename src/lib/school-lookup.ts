import { prisma } from "@/lib/db";

export async function findSchoolBySlug(input: string) {
  const normalized = input.trim().toLowerCase();
  if (!normalized) return null;

  return prisma.school.findUnique({ where: { slug: normalized } });
}

export async function createUniqueSchoolSlug(baseName: string) {
  let base = baseName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  if (!base) base = "escola";

  let slug = base;
  let n = 0;
  while (await prisma.school.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}
