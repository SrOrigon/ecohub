const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
export const AVATAR_MAX_BYTES = 320_000;

export function isAllowedAvatarMime(mime: string) {
  return ALLOWED_MIME.has(mime);
}

export function isValidExternalAvatarUrl(url: string) {
  return /^https?:\/\/.+/i.test(url.trim());
}

export function isStoredAvatar(value: string | null | undefined) {
  if (!value) return false;
  return value.startsWith("data:image/") || value.startsWith("/uploads/") || isValidExternalAvatarUrl(value);
}

export async function fileToAvatarDataUrl(file: File): Promise<string | { error: string }> {
  if (!isAllowedAvatarMime(file.type)) {
    return { error: "Use JPG, PNG, WebP ou GIF." };
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return { error: "A foto deve ter no máximo 300 KB após compressão." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");
  return `data:${file.type};base64,${base64}`;
}

export async function resolveAvatarFromForm(
  formData: FormData,
  currentAvatar: string | null = null
): Promise<string | null | { error: string }> {
  const removeAvatar = formData.get("removeAvatar") === "1";
  if (removeAvatar) return null;

  const avatarFile = formData.get("avatarFile");
  if (avatarFile instanceof File && avatarFile.size > 0) {
    try {
      if (!isAllowedAvatarMime(avatarFile.type)) {
        return { error: "Formato de imagem não suportado. Use JPG, PNG, WebP ou GIF." };
      }
      if (avatarFile.size > AVATAR_MAX_BYTES) {
        return { error: "A foto deve ter no máximo 300 KB." };
      }
      const dataUrl = await fileToAvatarDataUrl(avatarFile);
      if (typeof dataUrl === "object") return dataUrl;
      return dataUrl;
    } catch {
      return { error: "Não foi possível processar a foto enviada. Tente outro arquivo." };
    }
  }

  const avatarUrlField = String(formData.get("avatarUrl") ?? "").trim();
  if (avatarUrlField) {
    if (!isValidExternalAvatarUrl(avatarUrlField)) {
      return { error: "URL da foto deve começar com http:// ou https://" };
    }
    return avatarUrlField;
  }

  return currentAvatar;
}
