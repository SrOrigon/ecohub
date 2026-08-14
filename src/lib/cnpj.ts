import {
  resolveVerificationStatus,
  type SchoolVerificationStatus,
} from "@/lib/school-verification";

export type CnpjLookupResult = {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  situacao: string;
  cnae: string;
  cnaeDescricao: string | null;
  city: string | null;
  state: string | null;
  verificationStatus: SchoolVerificationStatus;
};

const REPEATED = /^(\d)\1{13}$/;

/** Remove máscara e normaliza para consulta (somente alfanuméricos). */
export function normalizeCnpj(value: string): string {
  return value.replace(/[^0-9A-Za-z]/g, "").toUpperCase();
}

/** Formata CNPJ numérico 00.000.000/0000-00 */
export function formatCnpj(value: string): string {
  const raw = normalizeCnpj(value);
  if (raw.length !== 14 || !/^\d{14}$/.test(raw)) return value;
  return raw.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

function charValue(char: string): number {
  return char.toUpperCase().charCodeAt(0) - 48;
}

function computeCheckDigit(base: string): number {
  const weights =
    base.length === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  let sum = 0;
  for (let i = 0; i < base.length; i += 1) {
    sum += charValue(base[i]) * weights[i];
  }
  const mod = sum % 11;
  return mod < 2 ? 0 : 11 - mod;
}

/** Valida dígitos verificadores (numérico e alfanumérico). */
export function isValidCnpj(value: string): boolean {
  const cnpj = normalizeCnpj(value);
  if (cnpj.length !== 14) return false;
  if (!/^[0-9A-Z]{12}\d{2}$/.test(cnpj)) return false;
  if (/^\d{14}$/.test(cnpj) && REPEATED.test(cnpj)) return false;

  const base = cnpj.slice(0, 12);
  const dv = cnpj.slice(12);
  const d1 = computeCheckDigit(base);
  const d2 = computeCheckDigit(base + String(d1));
  return dv === `${d1}${d2}`;
}

type BrasilApiCnpj = {
  cnpj?: string;
  razao_social?: string;
  nome_fantasia?: string;
  descricao_situacao_cadastral?: string;
  situacao_cadastral?: number;
  cnae_fiscal?: number | string;
  cnae_fiscal_descricao?: string;
  municipio?: string;
  uf?: string;
};

type MinhaReceitaCnpj = {
  cnpj?: string;
  razao_social?: string;
  nome_fantasia?: string;
  descricao_situacao_cadastral?: string;
  cnae_fiscal?: number | string;
  cnae_fiscal_descricao?: string;
  municipio?: string;
  uf?: string;
};

type PublicaCnpj = {
  estabelecimento?: {
    cnpj?: string;
    nome_fantasia?: string;
    situacao_cadastral?: string;
    atividade_principal?: { id?: string; descricao?: string };
    cidade?: { nome?: string };
    estado?: { sigla?: string };
  };
  razao_social?: string;
};

async function fetchFromBrasilApi(normalized: string): Promise<CnpjLookupResult | null | "not_found"> {
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${normalized}`, {
      next: { revalidate: 86400 },
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    if (res.status === 404) return "not_found";
    if (!res.ok) return null;
    const data = (await res.json()) as BrasilApiCnpj;
    const situacao = data.descricao_situacao_cadastral ?? "";
    const cnae = String(data.cnae_fiscal ?? "");
    return {
      cnpj: normalized,
      razaoSocial: data.razao_social?.trim() || "Razão social não informada",
      nomeFantasia: data.nome_fantasia?.trim() || null,
      situacao,
      cnae,
      cnaeDescricao: data.cnae_fiscal_descricao ?? null,
      city: data.municipio ?? null,
      state: data.uf ?? null,
      verificationStatus: resolveVerificationStatus({ situacao, cnae }),
    };
  } catch {
    return null;
  }
}

async function fetchFromMinhaReceita(normalized: string): Promise<CnpjLookupResult | null | "not_found"> {
  try {
    const res = await fetch(`https://minhareceita.org/${normalized}`, {
      next: { revalidate: 86400 },
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    if (res.status === 404) return "not_found";
    if (!res.ok) return null;
    const data = (await res.json()) as MinhaReceitaCnpj;
    const situacao = data.descricao_situacao_cadastral ?? "";
    const cnae = String(data.cnae_fiscal ?? "");
    return {
      cnpj: normalized,
      razaoSocial: data.razao_social?.trim() || "Razão social não informada",
      nomeFantasia: data.nome_fantasia?.trim() || null,
      situacao,
      cnae,
      cnaeDescricao: data.cnae_fiscal_descricao ?? null,
      city: data.municipio ?? null,
      state: data.uf ?? null,
      verificationStatus: resolveVerificationStatus({ situacao, cnae }),
    };
  } catch {
    return null;
  }
}

async function fetchFromPublicaCnpj(normalized: string): Promise<CnpjLookupResult | null | "not_found"> {
  try {
    const res = await fetch(`https://publica.cnpj.ws/cnpj/${normalized}`, {
      next: { revalidate: 86400 },
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    if (res.status === 404) return "not_found";
    if (!res.ok) return null;
    const data = (await res.json()) as PublicaCnpj;
    const situacao = data.estabelecimento?.situacao_cadastral ?? "";
    const cnae = String(data.estabelecimento?.atividade_principal?.id ?? "");
    return {
      cnpj: normalized,
      razaoSocial: data.razao_social?.trim() || "Razão social não informada",
      nomeFantasia: data.estabelecimento?.nome_fantasia?.trim() || null,
      situacao,
      cnae,
      cnaeDescricao: data.estabelecimento?.atividade_principal?.descricao ?? null,
      city: data.estabelecimento?.cidade?.nome ?? null,
      state: data.estabelecimento?.estado?.sigla ?? null,
      verificationStatus: resolveVerificationStatus({ situacao, cnae }),
    };
  } catch {
    return null;
  }
}

export async function fetchCnpjFromBrasilApi(cnpj: string): Promise<CnpjLookupResult | { error: string }> {
  const normalized = normalizeCnpj(cnpj);

  if (!isValidCnpj(normalized)) {
    return { error: "CNPJ inválido. Confira os números digitados." };
  }

  if (!/^\d{14}$/.test(normalized)) {
    return {
      error:
        "CNPJ alfanumérico detectado. A consulta automática ainda não está disponível  -  entre em contato para verificação manual.",
    };
  }

  // Tenta múltiplos provedores públicos em ordem de prioridade
  const brasilApiRes = await fetchFromBrasilApi(normalized);
  if (brasilApiRes === "not_found") return { error: "CNPJ não encontrado na base da Receita Federal." };
  if (brasilApiRes) return brasilApiRes;

  const minhaReceitaRes = await fetchFromMinhaReceita(normalized);
  if (minhaReceitaRes === "not_found") return { error: "CNPJ não encontrado na base da Receita Federal." };
  if (minhaReceitaRes) return minhaReceitaRes;

  const publicaRes = await fetchFromPublicaCnpj(normalized);
  if (publicaRes === "not_found") return { error: "CNPJ não encontrado na base da Receita Federal." };
  if (publicaRes) return publicaRes;

  // Se todas as APIs públicas falharem, mas o CNPJ for matematicamente válido:
  return {
    cnpj: normalized,
    razaoSocial: "Razão Social a confirmar",
    nomeFantasia: null,
    situacao: "RECEITA_INDISPONIVEL",
    cnae: "",
    cnaeDescricao: "Serviço de consulta governamental indisponível no momento",
    city: null,
    state: null,
    verificationStatus: "pending",
  };
}

