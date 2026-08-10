/** Login automático /demo — permitido exceto em deploy institucional explícito. */
export function isDemoLoginEnabled(): boolean {
  return (
    process.env.EDUHUB_INSTITUTIONAL !== "1" &&
    process.env.EDUHUB_INSTITUTIONAL !== "true"
  );
}
