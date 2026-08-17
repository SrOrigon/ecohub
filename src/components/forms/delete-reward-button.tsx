"use client";

import { deleteRewardAction } from "@/actions/rewards";
import { DeleteConfirmButton } from "@/components/ui/delete-confirm-button";

export function DeleteRewardButton({
  rewardId,
  rewardName,
  hasRedemptions,
}: {
  rewardId: string;
  rewardName: string;
  hasRedemptions: boolean;
}) {
  const confirmMessage = hasRedemptions
    ? `Excluir «${rewardName}» da loja? Os resgates já feitos deste item também saem do histórico.`
    : `Excluir «${rewardName}» da loja? Esta ação não pode ser desfeita.`;

  return (
    <DeleteConfirmButton
      label="Excluir"
      confirmMessage={confirmMessage}
      hiddenFields={{ rewardId, force: "1" }}
      action={deleteRewardAction}
    />
  );
}
