/** E-mails autorizados a gerenciar escolas pendentes (separados por vírgula). */
export function isPlatformAdmin(email: string): boolean {
  const list =
    process.env.PLATFORM_ADMIN_EMAILS?.split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean) ?? [];
  return list.includes(email.trim().toLowerCase());
}
