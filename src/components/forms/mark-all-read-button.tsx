"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { markAllNotificationsReadAction } from "@/actions/notifications";
import { Button } from "@/components/ui/button";

export function MarkAllReadButton() {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await markAllNotificationsReadAction();
          router.refresh();
        });
      }}
    >
      {pending ? "Marcando..." : "Marcar todas como lidas"}
    </Button>
  );
}
