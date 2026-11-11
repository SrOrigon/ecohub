export function receiptHref(receiptCode: string) {
  return `/dashboard/recibo/${encodeURIComponent(receiptCode)}`;
}
