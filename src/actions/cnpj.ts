"use server";

import { fetchCnpjFromBrasilApi } from "@/lib/cnpj";
import {
  AUTH_RATE_LIMIT,
  enforceRateLimit,
  RateLimitError,
  rateLimitMessage,
} from "@/lib/security/rate-limit";

export async function lookupCnpjAction(formData: FormData) {
  const cnpj = formData.get("cnpj")?.toString() ?? "";
  if (!cnpj.trim()) {
    return { error: "Informe o CNPJ da instituição." };
  }

  try {
    await enforceRateLimit("cnpj-lookup", cnpj.replace(/\D/g, ""), AUTH_RATE_LIMIT.cnpjLookup);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return { error: rateLimitMessage(error.retryAfterSec) };
    }
    throw error;
  }

  return fetchCnpjFromBrasilApi(cnpj);
}
