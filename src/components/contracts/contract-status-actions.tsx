import { updateContractStatusAction } from "@/actions/student-documents";
import { Button } from "@/components/ui/button";
import { CONTRACT_STATUSES } from "@/lib/contract-types";

export function ContractStatusActions({
  documentId,
  currentStatus,
}: {
  documentId: string;
  currentStatus: string;
}) {
  const transitions = CONTRACT_STATUSES.filter(
    (item) => item.value !== currentStatus && item.value !== "rascunho"
  );

  return (
    <div className="flex flex-wrap gap-1">
      {transitions.map((item) => (
        <form key={item.value} action={updateContractStatusAction}>
          <input type="hidden" name="documentId" value={documentId} />
          <input type="hidden" name="contractStatus" value={item.value} />
          <Button type="submit" size="sm" variant="outline" className="text-xs">
            {item.label}
          </Button>
        </form>
      ))}
    </div>
  );
}
