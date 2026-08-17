import { prisma } from "@/lib/db";
import { CACHE_TTL, cacheGetOrSet } from "@/lib/runtime-cache";

export async function findSchoolBySlug(input: string) {
  const normalized = input.trim().toLowerCase();
  if (!normalized) return null;

  return cacheGetOrSet(`school:slug:${normalized}`, CACHE_TTL.schoolSlug, () =>
    prisma.school.findUnique({ where: { slug: normalized } })
  );
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
