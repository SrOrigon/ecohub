"use client";

import { useActionState, useMemo, useState } from "react";
import {
  createPersonalNoteAction,
  updatePersonalNoteAction,
} from "@/actions/personal-notes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Textarea } from "@/components/ui/form-fields";
import { FormMessage } from "@/components/ui/form-utils";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import {
  groupNotesByDate,
  type PersonalNoteDTO,
} from "@/lib/personal-notes";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  Clock,
  NotebookPen,
  Pencil,
  Pin,
  Plus,
  StickyNote,
} from "lucide-react";
import { DeleteNoteButton } from "@/components/notes/delete-note-button";

type Tab = "quick" | "dated" | "history";

export function PersonalNotesManager({
  notes,
  initialDate,
}: {
  notes: PersonalNoteDTO[];
  initialDate?: string;
}) {
  const [tab, setTab] = useState<Tab>(initialDate ? "dated" : "quick");
  const [selectedDate, setSelectedDate] = useState(initialDate ?? new Date().toISOString().split("T")[0]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editNote, setEditNote] = useState<PersonalNoteDTO | null>(null);
  const [createMode, setCreateMode] = useState<"quick" | "dated">("quick");

  const quickNotes = useMemo(() => notes.filter((n) => !n.date), [notes]);
  const datedNotesForDay = useMemo(
    () => notes.filter((n) => n.date === selectedDate),
    [notes, selectedDate]
  );
  const historyGroups = useMemo(
    () => groupNotesByDate(notes.filter((n) => n.date)),
    [notes]
  );

  const [createState, createAction, createPending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      const r = await createPersonalNoteAction(formData);
      if (r.success) setCreateOpen(false);
      return r;
    },
    null
  );

  const [editState, editAction, editPending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      const r = await updatePersonalNoteAction(formData);
      if (r.success) setEditNote(null);
      return r;
    },
    null
  );

  function openCreate(mode: "quick" | "dated") {
    setCreateMode(mode);
    setCreateOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Tipo de anotação">
        <TabButton active={tab === "quick"} onClick={() => setTab("quick")} icon={Pin}>
          Anotações rápidas
          {quickNotes.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {quickNotes.length}
            </Badge>
          )}
        </TabButton>
        <TabButton active={tab === "dated"} onClick={() => setTab("dated")} icon={CalendarDays}>
          Por dia
        </TabButton>
        <TabButton active={tab === "history"} onClick={() => setTab("history")} icon={Clock}>
          Histórico
        </TabButton>
      </div>

      {tab === "quick" && (
        <section className="content-section">
          <SectionHeader
            title="Anotações sem data"
            description="Lembretes gerais, ideias e anotações que não dependem de um dia específico."
            action={
              <Button onClick={() => openCreate("quick")} className="gap-2">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Nova anotação
              </Button>
            }
          />
          {quickNotes.length === 0 ? (
            <EmptyState
              icon={StickyNote}
              title="Nenhuma anotação rápida"
              description="Use para guardar ideias, listas ou lembretes que não precisam de data."
            >
              <Button onClick={() => openCreate("quick")}>Criar primeira anotação</Button>
            </EmptyState>
          ) : (
            <div className="notes-grid">
              {quickNotes.map((note) => (
                <NoteCard key={note.id} note={note} onEdit={setEditNote} />
              ))}
            </div>
          )}
        </section>
      )}

      {tab === "dated" && (
        <section className="content-section">
          <SectionHeader
            title="Anotações do dia"
            description="Organize lembretes para provas, reuniões ou tarefas de um dia específico."
            action={
              <Button onClick={() => openCreate("dated")} className="gap-2">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Anotação para este dia
              </Button>
            }
          />
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div className="min-w-[12rem] flex-1 sm:max-w-xs">
              <Label htmlFor="note-day-picker">Selecionar dia</Label>
              <Input
                id="note-day-picker"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <p className="text-sm text-[var(--muted-foreground)]">
              {datedNotesForDay.length === 0
                ? "Nenhuma anotação neste dia."
                : `${datedNotesForDay.length} anotação(ões)`}
            </p>
          </div>
          {datedNotesForDay.length === 0 ? (
            <EmptyState
              icon={NotebookPen}
              title={`Sem anotações em ${formatDate(selectedDate)}`}
              description="Ex.: lembrete de material para prova, revisão ou horário de entrega."
            >
              <Button onClick={() => openCreate("dated")}>Adicionar para este dia</Button>
            </EmptyState>
          ) : (
            <div className="notes-grid">
              {datedNotesForDay.map((note) => (
                <NoteCard key={note.id} note={note} onEdit={setEditNote} showDate={false} />
              ))}
            </div>
          )}
        </section>
      )}

      {tab === "history" && (
        <section className="content-section">
          <SectionHeader
            title="Histórico por data"
            description="Todas as anotações vinculadas a dias, da mais recente para a mais antiga."
          />
          {historyGroups.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="Histórico vazio"
              description="Quando você criar anotações com data, elas aparecerão aqui."
            >
              <Button onClick={() => openCreate("dated")}>Criar anotação com data</Button>
            </EmptyState>
          ) : (
            <div className="space-y-6">
              {historyGroups.map((group) => (
                <div key={group.date}>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                    <CalendarDays className="h-4 w-4" aria-hidden="true" />
                    {formatDate(group.date)}
                  </h3>
                  <div className="notes-grid">
                    {group.notes.map((note) => (
                      <NoteCard key={note.id} note={note} onEdit={setEditNote} showDate={false} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={createMode === "quick" ? "Nova anotação rápida" : "Nova anotação do dia"}
      >
        <form action={createAction} className="space-y-4">
          <input type="hidden" name="mode" value={createMode} />
          {createMode === "dated" && (
            <div>
              <Label htmlFor="create-date">Data</Label>
              <Input
                id="create-date"
                name="date"
                type="date"
                defaultValue={selectedDate}
                required
              />
            </div>
          )}
          <div>
            <Label htmlFor="create-title">Título (opcional)</Label>
            <Input id="create-title" name="title" placeholder="Ex.: Revisão de matemática" />
          </div>
          <div>
            <Label htmlFor="create-content">Conteúdo</Label>
            <Textarea
              id="create-content"
              name="content"
              required
              rows={5}
              placeholder="Escreva sua anotação..."
            />
          </div>
          <FormMessage message={createState} />
          <Button type="submit" className="w-full" disabled={createPending}>
            {createPending ? "Salvando..." : "Salvar anotação"}
          </Button>
        </form>
      </Modal>

      <Modal open={!!editNote} onClose={() => setEditNote(null)} title="Editar anotação">
        {editNote && (
          <form action={editAction} className="space-y-4">
            <input type="hidden" name="id" value={editNote.id} />
            <div>
              <Label htmlFor="edit-title">Título (opcional)</Label>
              <Input id="edit-title" name="title" defaultValue={editNote.title ?? ""} />
            </div>
            <div>
              <Label htmlFor="edit-content">Conteúdo</Label>
              <Textarea
                id="edit-content"
                name="content"
                required
                rows={5}
                defaultValue={editNote.content}
              />
            </div>
            <div>
              <Label htmlFor="edit-date">Data (opcional)</Label>
              <Input
                id="edit-date"
                name="date"
                type="date"
                defaultValue={editNote.date ?? ""}
              />
              <label className="mt-2 flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                <input type="checkbox" name="clearDate" value="true" className="rounded" />
                Remover data (virar anotação rápida)
              </label>
            </div>
            <FormMessage message={editState} />
            <Button type="submit" className="w-full" disabled={editPending}>
              {editPending ? "Salvando..." : "Atualizar"}
            </Button>
          </form>
        )}
      </Modal>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Pin;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition",
        active
          ? "border-[color:var(--school-primary)] bg-[color:var(--school-primary-soft)] text-[color:var(--school-primary)]"
          : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--hover)]"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      {children}
    </button>
  );
}

function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-header mb-4">
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-bold text-[var(--foreground)]">{title}</h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">{description}</p>
      </div>
      {action && <div className="page-header-actions">{action}</div>}
    </div>
  );
}

function NoteCard({
  note,
  onEdit,
  showDate = true,
}: {
  note: PersonalNoteDTO;
  onEdit: (note: PersonalNoteDTO) => void;
  showDate?: boolean;
}) {
  return (
    <article className="note-card group">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {note.title ? (
            <h3 className="font-semibold text-[var(--foreground)]">{note.title}</h3>
          ) : (
            <h3 className="font-medium text-[var(--muted-foreground)]">Sem título</h3>
          )}
          {showDate && note.date && (
            <p className="mt-1 flex items-center gap-1 text-xs text-[color:var(--school-primary)]">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              {formatDate(note.date)}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
          <button
            type="button"
            onClick={() => onEdit(note)}
            className="icon-btn !min-h-9 !min-w-9"
            aria-label="Editar anotação"
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </button>
          <DeleteNoteButton id={note.id} />
        </div>
      </div>
      <p className="note-card-content">{note.content}</p>
      <p className="mt-3 text-xs text-[var(--muted-foreground)]">
        Atualizado {formatDate(note.updatedAt)}
      </p>
    </article>
  );
}
