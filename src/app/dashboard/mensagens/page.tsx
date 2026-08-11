import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { MessagesLayout } from "@/components/layout/messages-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Textarea } from "@/components/ui/form-fields";
import { sendChatMessageAction } from "@/actions/product-suite";
import { redirect } from "next/navigation";

export default async function MensagensPage({
  searchParams,
}: {
  searchParams: Promise<{ thread?: string }>;
}) {
  const user = await getSessionUser();
  if (!user?.schoolId) redirect("/login");
  if (!["admin", "director", "secretary", "teacher", "parent"].includes(user.role)) redirect("/dashboard");

  const { thread: threadId } = await searchParams;

  const threads = await prisma.chatThread.findMany({
    where: {
      schoolId: user.schoolId,
      ...(user.role === "parent" ? { parentId: user.id } : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: {
      student: { include: { user: { select: { fullName: true } } } },
      parent: { select: { fullName: true } },
      messages: { orderBy: { createdAt: "asc" }, take: 1 },
    },
  });

  const activeThread = threadId
    ? await prisma.chatThread.findFirst({
        where: { id: threadId, schoolId: user.schoolId },
        include: {
          student: { include: { user: { select: { fullName: true } } } },
          parent: { select: { fullName: true, id: true } },
          messages: {
            orderBy: { createdAt: "asc" },
            include: { sender: { select: { fullName: true, role: true } } },
          },
        },
      })
    : null;

  const parentLinks =
    user.role === "parent"
      ? await prisma.parentStudent.findMany({
          where: { parentId: user.id },
          include: { student: { include: { user: { select: { fullName: true } } } } },
        })
      : [];

  const threadTitle = activeThread
    ? `${activeThread.student.user.fullName} ↔ ${activeThread.parent.fullName}`
    : undefined;

  const listPanel = (
    <Card className="h-full">
      <CardContent className="space-y-2 p-4">
        <p className="font-semibold text-slate-800">Conversas</p>
        {threads.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma conversa ainda.</p>
        ) : (
          threads.map((t) => (
            <a
              key={t.id}
              href={`/dashboard/mensagens?thread=${t.id}`}
              className={`block rounded-lg border p-3 text-sm transition hover:bg-slate-50 ${
                threadId === t.id ? "border-indigo-300 bg-indigo-50" : "border-slate-200"
              }`}
            >
              <p className="font-medium">{t.student.user.fullName}</p>
              <p className="text-slate-500">{t.parent.fullName}</p>
              {t.messages[0] && (
                <p className="mt-1 truncate text-xs text-slate-400">{t.messages[0].body}</p>
              )}
            </a>
          ))
        )}

        {user.role === "parent" && parentLinks.length > 0 && (
          <form action={sendChatMessageAction} className="mt-4 space-y-2 border-t pt-4">
            <p className="text-sm font-medium">Iniciar conversa</p>
            <input type="hidden" name="parentId" value={user.id} />
            <div>
              <Label htmlFor="newStudent">Sobre o filho(a)</Label>
              <select
                id="newStudent"
                name="studentId"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              >
                {parentLinks.map((l) => (
                  <option key={l.studentId} value={l.studentId}>
                    {l.student.user.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="newBody">Primeira mensagem</Label>
              <Textarea id="newBody" name="body" rows={2} required placeholder="Olá, gostaria de..." />
            </div>
            <Button type="submit" size="sm" className="w-full sm:w-auto">
              Enviar
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );

  const chatPanel = activeThread ? (
    <Card className="h-full">
      <CardContent className="flex min-h-[min(70dvh,32rem)] flex-col p-4">
        <p className="mb-4 hidden border-b pb-2 font-semibold lg:block">{threadTitle}</p>
        <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain">
          {activeThread.messages.map((msg) => (
            <div
              key={msg.id}
              className={`max-w-[90%] rounded-xl px-3 py-2 text-sm sm:max-w-[85%] ${
                msg.senderId === user.id ? "ml-auto bg-indigo-600 text-white" : "bg-slate-100 text-slate-800"
              }`}
            >
              <p className="text-xs opacity-70">{msg.sender.fullName}</p>
              <p className="break-words">{msg.body}</p>
            </div>
          ))}
        </div>
        <form action={sendChatMessageAction} className="mt-4 flex flex-col gap-2 border-t pt-4 sm:flex-row">
          <input type="hidden" name="threadId" value={activeThread.id} />
          <Input name="body" placeholder="Digite sua mensagem..." required className="min-w-0 flex-1" />
          <Button type="submit" className="w-full shrink-0 sm:w-auto">
            Enviar
          </Button>
        </form>
      </CardContent>
    </Card>
  ) : null;

  const emptyChat = (
    <Card className="h-full">
      <CardContent className="flex min-h-[min(50dvh,24rem)] items-center justify-center p-4">
        <p className="text-center text-slate-500">
          Selecione uma conversa ou inicie uma nova.
        </p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader title="Mensagens" description="Canal família-escola — conversas por aluno e responsável." />

      <MessagesLayout
        threadId={threadId}
        threadTitle={threadTitle}
        list={listPanel}
        chat={chatPanel}
        emptyChat={emptyChat}
      />
    </div>
  );
}
