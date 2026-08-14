"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createAnnouncementAction, markAnnouncementReadAction, deleteAnnouncementAction } from "@/actions/announcements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Select, Textarea } from "@/components/ui/form-fields";
import { FormMessage } from "@/components/ui/form-utils";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Megaphone } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { DeleteConfirmButton } from "@/components/ui/delete-confirm-button";

function MarkReadButton({ announcementId }: { announcementId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="mt-3"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const fd = new FormData();
          fd.set("announcementId", announcementId);
          await markAnnouncementReadAction(fd);
          router.refresh();
        });
      }}
    >
      {pending ? "..." : "Marcar como lido"}
    </Button>
  );
}

interface ClassOption {
  id: string;
  name: string;
}

export function AnnouncementBoard({
  announcements,
  canCreate,
  canModerate = false,
  currentUserId,
  classes = [],
}: {
  announcements: {
    id: string;
    title: string;
    body: string;
    publishedAt: Date;
    isRead: boolean;
    authorId: string;
    author: { fullName: string };
    classGroup: { name: string } | null;
  }[];
  canCreate: boolean;
  canModerate?: boolean;
  currentUserId?: string;
  classes?: ClassOption[];
}) {
  const [open, setOpen] = useState(false);

  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      const r = await createAnnouncementAction(formData);
      if (r.success) setOpen(false);
      return r;
    },
    null
  );

  return (
    <div className="space-y-4">
      {canCreate && (
        <>
          <Button onClick={() => setOpen(true)} className="gap-2">
            <Megaphone className="h-4 w-4" aria-hidden="true" />
            Novo comunicado
          </Button>
          <Modal open={open} onClose={() => setOpen(false)} title="Publicar comunicado">
            <form action={formAction} className="space-y-4">
              <div>
                <Label htmlFor="ann-title">Título</Label>
                <Input id="ann-title" name="title" required placeholder="Ex.: Reunião de pais" />
              </div>
              <div>
                <Label htmlFor="ann-classId">Destinatários</Label>
                <Select id="ann-classId" name="classId" defaultValue="">
                  <option value="">Toda a escola</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="ann-body">Mensagem</Label>
                <Textarea id="ann-body" name="body" rows={5} required />
              </div>
              <FormMessage message={state} />
              <Button type="submit" disabled={pending} className="w-full">
                {pending ? "Publicando..." : "Publicar"}
              </Button>
            </form>
          </Modal>
        </>
      )}

      {announcements.length === 0 ? (
        <p className="text-slate-600">Nenhum comunicado ainda.</p>
      ) : (
        announcements.map((a) => {
          const canDelete = canModerate || (currentUserId != null && a.authorId === currentUserId);
          return (
          <article key={a.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">{a.title}</h3>
                {!a.isRead && <Badge variant="warning">Novo</Badge>}
                {a.classGroup && <Badge variant="secondary">{a.classGroup.name}</Badge>}
              </div>
              {canDelete && (
                <DeleteConfirmButton
                  label="Excluir"
                  iconOnly
                  confirmMessage={`Excluir o comunicado "${a.title}"? Esta ação não pode ser desfeita.`}
                  hiddenFields={{ announcementId: a.id }}
                  action={deleteAnnouncementAction}
                />
              )}
            </div>
            <p className="whitespace-pre-wrap text-slate-700">{a.body}</p>
            <p className="mt-3 text-xs text-slate-500">
              {a.author.fullName} · {formatDate(a.publishedAt)}
            </p>
            {!a.isRead && <MarkReadButton announcementId={a.id} />}
          </article>
        );
        })
      )}
    </div>
  );
}
