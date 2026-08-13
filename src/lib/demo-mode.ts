/** Login automático /demo — desativado por padrão para produção (requer EDUHUB_ENABLE_DEMO=1). */
export function isDemoLoginEnabled(): boolean {
  return (
    process.env.EDUHUB_ENABLE_DEMO === "1" ||
    process.env.EDUHUB_ENABLE_DEMO === "true"
  );
}

