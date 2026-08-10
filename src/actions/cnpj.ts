"use server";

import { fetchCnpjFromBrasilApi } from "@/lib/cnpj";

export async function lookupCnpjAction(formData: FormData) {
  const cnpj = formData.get("cnpj")?.toString() ?? "";
  if (!cnpj.trim()) {
    return { error: "Informe o CNPJ da instituição." };
  }
  return fetchCnpjFromBrasilApi(cnpj);
}
