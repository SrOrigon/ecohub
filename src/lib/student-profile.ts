export const GENDER_OPTIONS = [
  { value: "", label: "Não informado" },
  { value: "feminino", label: "Feminino" },
  { value: "masculino", label: "Masculino" },
  { value: "nao_binario", label: "Não binário" },
  { value: "outro", label: "Outro" },
  { value: "prefiro_nao_informar", label: "Prefiro não informar" },
] as const;

export const PRONOUN_OPTIONS = [
  { value: "", label: "Não informado" },
  { value: "ela/dela", label: "ela/dela" },
  { value: "ele/dele", label: "ele/dele" },
  { value: "elu/delu", label: "elu/delu" },
  { value: "outro", label: "Outro" },
] as const;

export const STUDENT_ACTIVITY_TYPES = [
  { value: "event_created", label: "Evento criado" },
  { value: "rsvp", label: "Presença confirmada" },
  { value: "checkin", label: "Check-in" },
  { value: "interaction", label: "Interação" },
  { value: "custom", label: "Outro" },
] as const;

export const SOCIAL_NETWORKS = [
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/..." },
  { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/in/..." },
  { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@..." },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/..." },
  { key: "other", label: "Outra rede", placeholder: "https://..." },
] as const;

export type SocialLinks = Partial<Record<(typeof SOCIAL_NETWORKS)[number]["key"], string>>;

const USERNAME_RE = /^[a-z0-9_]{3,30}$/;

export function normalizeUsername(raw: string): string {
  return raw.trim().replace(/^@+/, "").toLowerCase();
}

/** Valores típicos de autofill (e-mail, URL) no campo username — ignorar em vez de bloquear cadastro. */
function looksLikeAutofillUsername(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  if (trimmed.includes("@")) return true;
  if (/^https?:\/\//i.test(trimmed)) return true;
  if (trimmed.includes(".") && trimmed.includes("@")) return true;
  return false;
}

export function parseUsername(raw: string): { username: string | null; error?: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { username: null };
  if (looksLikeAutofillUsername(trimmed)) return { username: null };

  const username = normalizeUsername(raw);
  if (!username) return { username: null };
  if (!USERNAME_RE.test(username)) {
    return {
      username: null,
      error: "Nome de usuário deve ter 3 a 30 caracteres (letras minúsculas, números ou _).",
    };
  }
  return { username };
}

export function parseInterests(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  const trimmed = raw.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean).slice(0, 20);
      }
    } catch {
      /* lista separada por vírgula */
    }
  }
  return trimmed
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20);
}

export function stringifyInterests(tags: string[]): string {
  return JSON.stringify(tags);
}

export function parseSocialLinks(raw: string | null | undefined): SocialLinks {
  if (!raw?.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const links: SocialLinks = {};
    for (const { key } of SOCIAL_NETWORKS) {
      const value = parsed[key];
      if (typeof value === "string" && value.trim()) links[key] = value.trim();
    }
    return links;
  } catch {
    return {};
  }
}

export function stringifySocialLinks(links: SocialLinks): string {
  const cleaned: SocialLinks = {};
  for (const { key } of SOCIAL_NETWORKS) {
    const value = links[key]?.trim();
    if (value) cleaned[key] = value;
  }
  return JSON.stringify(cleaned);
}

export function socialLinksFromForm(formData: FormData): { links: SocialLinks; error?: string } {
  const links: SocialLinks = {};
  for (const { key, label } of SOCIAL_NETWORKS) {
    const value = String(formData.get(`social_${key}`) ?? "").trim();
    if (!value) continue;
    if (!/^https?:\/\/.+/i.test(value)) {
      return { links: {}, error: `O link de ${label} deve começar com http:// ou https://` };
    }
    links[key] = value;
  }
  return { links };
}

export type ParsedStudentProfile = {
  displayName: string | null;
  username: string | null;
  phone: string | null;
  gender: string | null;
  pronouns: string | null;
  bio: string | null;
  interests: string;
  socialLinks: string;
  street: string | null;
  streetNumber: string | null;
  addressComplement: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  latitude: number | null;
  longitude: number | null;
};

export function parseStudentProfileForm(
  formData: FormData
): { data: ParsedStudentProfile } | { error: string } {
  const usernameResult = parseUsername(String(formData.get("username") ?? ""));
  if (usernameResult.error) return { error: usernameResult.error };

  const social = socialLinksFromForm(formData);
  if (social.error) return { error: social.error };

  const lat = parseOptionalCoord(String(formData.get("latitude") ?? ""), "Latitude");
  if (lat.error) return { error: lat.error };
  const lng = parseOptionalCoord(String(formData.get("longitude") ?? ""), "Longitude");
  if (lng.error) return { error: lng.error };
  if (lat.value != null && (lat.value < -90 || lat.value > 90)) {
    return { error: "Latitude deve estar entre -90 e 90." };
  }
  if (lng.value != null && (lng.value < -180 || lng.value > 180)) {
    return { error: "Longitude deve estar entre -180 e 180." };
  }

  const state = emptyToNull(String(formData.get("state") ?? ""));
  const bio = emptyToNull(String(formData.get("bio") ?? ""));
  if (bio && bio.length > 280) return { error: "A biografia deve ter no máximo 280 caracteres." };

  return {
    data: {
      displayName: emptyToNull(String(formData.get("displayName") ?? "")),
      username: usernameResult.username,
      phone: emptyToNull(String(formData.get("phone") ?? "")),
      gender: emptyToNull(String(formData.get("gender") ?? "")),
      pronouns: emptyToNull(String(formData.get("pronouns") ?? "")),
      bio,
      interests: stringifyInterests(parseInterests(String(formData.get("interests") ?? ""))),
      socialLinks: stringifySocialLinks(social.links),
      street: emptyToNull(String(formData.get("street") ?? "")),
      streetNumber: emptyToNull(String(formData.get("streetNumber") ?? "")),
      addressComplement: emptyToNull(String(formData.get("addressComplement") ?? "")),
      city: emptyToNull(String(formData.get("city") ?? "")),
      state: state ? state.toUpperCase() : null,
      zipCode: emptyToNull(String(formData.get("zipCode") ?? "")),
      latitude: lat.value,
      longitude: lng.value,
    },
  };
}

export function parseOptionalCoord(raw: string, label: string): { value: number | null; error?: string } {
  const trimmed = raw.trim().replace(",", ".");
  if (!trimmed) return { value: null };
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return { value: null, error: `${label} inválida.` };
  return { value };
}

export function normalizeEnrollmentCode(raw: string): string {
  return raw.trim();
}

export function parseEnrollmentCode(raw: string): { code: string } | { error: string } {
  const code = normalizeEnrollmentCode(raw);
  if (!code) return { error: "Matrícula é obrigatória." };
  return { code };
}

export function emptyToNull(raw: string): string | null {
  const value = raw.trim();
  return value ? value : null;
}

export function genderLabel(value: string | null | undefined): string {
  return GENDER_OPTIONS.find((option) => option.value === value)?.label ?? "Não informado";
}

export function activityTypeLabel(value: string): string {
  return STUDENT_ACTIVITY_TYPES.find((option) => option.value === value)?.label ?? value;
}
