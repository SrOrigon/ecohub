import { headers } from "next/headers";

/**
 * IP do cliente atrás do proxy.
 * O primeiro valor de x-forwarded-for pode ser inventado por quem chama.
 * O último é o que o proxy acrescenta.
 */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((part) => part.trim()).filter(Boolean);
    const last = parts[parts.length - 1];
    if (last) return last;
  }
  return h.get("x-real-ip")?.trim() || "unknown";
}
