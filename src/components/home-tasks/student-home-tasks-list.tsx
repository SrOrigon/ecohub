"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { completeHomeTaskAction } from "@/actions/home-tasks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SaoVictoryOverlay } from "@/components/celebration/sao-victory-overlay";
import { Home, CheckCircle2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

type HomeTaskItem = {
  id: string;
  title: string;
  description: string | null;
  xpReward: number;
  coinReward: number;
  status: string;
  dueDate: Date | null;
  completedAt: Date | null;
  parent?: { fullName: string };
};

function CompleteHomeTaskButton({ taskId, kidFriendly }: { taskId: string; kidFriendly?: boolean }) {
  const router = useRouter();
  const [resultVisible, setResultVisible] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) =>
      completeHomeTaskAction(formData),
    null
  );

  useEffect(() => {
    if (state?.success) setResultVisible(false);
  }, [state?.success]);

  if (state?.success && resultVisible) {
    return (
      <p className="text-sm font-semibold text-emerald-700" role="status">
        Concluída!
      </p>
    );
  }

  return (
    <>
      <SaoVictoryOverlay
        open={!!state?.success && !resultVisible}
        onProceed={() => {
          setResultVisible(true);
          router.refresh();
        }}
      />
      <form action={formAction}>
        <input type="hidden" name="taskId" value={taskId} />
        <Button
          type="submit"
          size={kidFriendly ? "lg" : "sm"}
          disabled={pending || (!!state?.success && !resultVisible)}
          className="gap-1"
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          {pending ? "..." : "Concluí!"}
        </Button>
        {state?.error && <p className="mt-1 text-xs text-red-600">{state.error}</p>}
      </form>
    </>
  );
}

export function StudentHomeTasksList({
  tasks,
  kidFriendly = true,
}: {
  tasks: HomeTaskItem[];
  kidFriendly?: boolean;
}) {
  const pending = tasks.filter((t) => t.status === "pending");
  const done = tasks.filter((t) => t.status === "completed").slice(0, 5);

  return (
    <Card id="tarefas-casa" className={kidFriendly ? "kid-card border-2 border-violet-200 bg-violet-50/30" : ""}>
      <CardHeader className="pb-2">
        <CardTitle className={`flex items-center gap-2 ${kidFriendly ? "text-xl" : "text-lg"}`}>
          <Home className="h-5 w-5 text-violet-600" aria-hidden="true" />
          Tarefas de casa
        </CardTitle>
        <p className={`text-slate-600 ${kidFriendly ? "text-base" : "text-sm"}`}>
          {pending.length === 0
            ? "Nenhuma tarefa pendente  -  parabéns!"
            : `${pending.length} tarefa(s) da família para fazer`}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {pending.length === 0 && done.length === 0 ? (
          <p className="text-slate-500">Quando seus responsáveis criarem tarefas, elas aparecem aqui.</p>
        ) : (
          <>
            {pending.map((t) => (
              <div
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-white bg-white p-4 shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className={`font-bold text-slate-900 ${kidFriendly ? "text-lg" : "text-base"}`}>{t.title}</p>
                  {t.description && <p className="text-sm text-slate-600">{t.description}</p>}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="warning">+{t.xpReward} XP · {t.coinReward} moedas</Badge>
                    {t.dueDate && (
                      <Badge variant="secondary">Até {formatDate(t.dueDate)}</Badge>
                    )}
                    {t.parent && (
                      <span className="text-xs text-slate-500">Por {t.parent.fullName}</span>
                    )}
                  </div>
                </div>
                <CompleteHomeTaskButton taskId={t.id} kidFriendly={kidFriendly} />
              </div>
            ))}
            {done.length > 0 && (
              <div className="border-t border-slate-100 pt-3">
                <p className="mb-2 text-sm font-medium text-slate-500">Concluídas recentemente</p>
                {done.map((t) => (
                  <p key={t.id} className="text-sm text-slate-600 line-through opacity-70">
                    {t.title}
                  </p>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
