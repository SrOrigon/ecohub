"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function MessagesLayout({
  threadId,
  threadTitle,
  list,
  chat,
  emptyChat,
}: {
  threadId?: string;
  threadTitle?: string;
  list: React.ReactNode;
  chat: React.ReactNode;
  emptyChat: React.ReactNode;
}) {
  const hasThread = Boolean(threadId);

  return (
    <div className="messages-layout grid gap-4 lg:grid-cols-3 lg:gap-6">
      <div className={cn("min-w-0 lg:col-span-1", hasThread && "hidden lg:block")}>{list}</div>

      <div className={cn("min-w-0 lg:col-span-2", !hasThread && "hidden lg:block")}>
        {hasThread ? (
          <div className="space-y-3">
            <Link
              href="/dashboard/mensagens"
              className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[color:var(--school-primary)] hover:underline lg:hidden"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Voltar às conversas
            </Link>
            {threadTitle && (
              <p className="font-semibold text-[var(--foreground)] lg:hidden">{threadTitle}</p>
            )}
            {chat}
          </div>
        ) : (
          emptyChat
        )}
      </div>
    </div>
  );
}
