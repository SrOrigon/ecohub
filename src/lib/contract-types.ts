export const CONTRACT_STATUSES = [
  { value: "rascunho", label: "Rascunho" },
  { value: "vigente", label: "Vigente" },
  { value: "encerrado", label: "Encerrado" },
  { value: "cancelado", label: "Cancelado" },
  { value: "trancado", label: "Trancado" },
] as const;

export type ContractStatus = (typeof CONTRACT_STATUSES)[number]["value"];

export function contractStatusLabel(status: string) {
  return CONTRACT_STATUSES.find((item) => item.value === status)?.label ?? status;
}

export function contractStatusVariant(status: string): "success" | "warning" | "danger" | "secondary" {
  if (status === "vigente") return "success";
  if (status === "rascunho") return "warning";
  if (status === "trancado") return "secondary";
  return "danger";
}

export function resolveContractStatus(documentStatus: string, contractStatus: string | null | undefined) {
  if (documentStatus === "draft") return "rascunho";
  return contractStatus ?? "vigente";
}
