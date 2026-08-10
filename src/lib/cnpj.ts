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

export async function fetchCnpjFromBrasilApi(cnpj: string): Promise<CnpjLookupResult | { error: string }> {
  const normalized = normalizeCnpj(cnpj);

  if (!isValidCnpj(normalized)) {
    return { error: "CNPJ inválido. Confira os números digitados." };
  }

  // Brasil API aceita apenas CNPJ numérico por enquanto.
  if (!/^\d{14}$/.test(normalized)) {
    return {
      error:
        "CNPJ alfanumérico detectado. A consulta automática ainda não está disponível — entre em contato para verificação manual.",
    };
  }

  let response: Response;
  try {
    response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${normalized}`, {
      next: { revalidate: 86400 },
      headers: { Accept: "application/json" },
    });
  } catch {
    return { error: "Não foi possível consultar o CNPJ agora. Tente novamente em instantes." };
  }

  if (response.status === 404) {
    return { error: "CNPJ não encontrado na base da Receita Federal." };
  }
  if (!response.ok) {
    return { error: "Serviço de consulta de CNPJ indisponível. Tente novamente mais tarde." };
  }

  const data = (await response.json()) as BrasilApiCnpj;
  const situacao = data.descricao_situacao_cadastral ?? "";
  const cnae = String(data.cnae_fiscal ?? "");
  const verificationStatus = resolveVerificationStatus({ situacao, cnae });

  return {
    cnpj: normalized,
    razaoSocial: data.razao_social?.trim() || "Razão social não informada",
    nomeFantasia: data.nome_fantasia?.trim() || null,
    situacao,
    cnae,
    cnaeDescricao: data.cnae_fiscal_descricao ?? null,
    city: data.municipio ?? null,
    state: data.uf ?? null,
    verificationStatus,
  };
}
