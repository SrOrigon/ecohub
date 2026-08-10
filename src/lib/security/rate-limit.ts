import { getClientIp } from "./client-ip";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const CLEANUP_MS = 60_000;
let lastCleanup = Date.now();

function cleanupExpired(now: number) {
  if (now - lastCleanup < CLEANUP_MS) return;
  lastCleanup = now;
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
}

export class RateLimitError extends Error {
  readonly retryAfterSec: number;

  constructor(retryAfterSec: number) {
    super("RATE_LIMIT");
    this.retryAfterSec = retryAfterSec;
  }
}

export function rateLimitMessage(retryAfterSec: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterSec / 60));
  return `Muitas tentativas. Aguarde ${minutes} minuto(s) e tente novamente.`;
}

/** Rate limit por IP + identificador (e-mail, matrícula, etc.). */
export async function enforceRateLimit(
  namespace: string,
  identifier: string,
  opts: { limit: number; windowMs: number }
): Promise<void> {
  const ip = await getClientIp();
  const key = `${namespace}:${ip}:${identifier.toLowerCase().slice(0, 256)}`;
  const now = Date.now();
  cleanupExpired(now);

  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return;
  }

  if (bucket.count >= opts.limit) {
    throw new RateLimitError(Math.ceil((bucket.resetAt - now) / 1000));
  }

  bucket.count += 1;
}

export const AUTH_RATE_LIMIT = {
  login: { limit: 5, windowMs: 15 * 60 * 1000 },
  pinLogin: { limit: 5, windowMs: 15 * 60 * 1000 },
  register: { limit: 3, windowMs: 60 * 60 * 1000 },
  inviteAccept: { limit: 5, windowMs: 15 * 60 * 1000 },
  cnpjLookup: { limit: 10, windowMs: 60 * 60 * 1000 },
} as const;
