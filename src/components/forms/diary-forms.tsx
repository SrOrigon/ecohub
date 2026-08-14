"use client";

import { useActionState, useState } from "react";
import { createDiaryEntryAction, createOccurrenceAction } from "@/actions/diary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Select, Textarea } from "@/components/ui/form-fields";
import { FormMessage } from "@/components/ui/form-utils";
import { Modal } from "@/components/ui/modal";
import { useToday } from "@/hooks/use-today";
import { OCCURRENCE_KINDS, OCCURRENCE_LABELS } from "@/lib/constants";

interface ClassOption {
  id: string;
  name: string;
  students: { id: string; name: string }[];
}

export function DiaryForms({
  classes,
  subjects,
}: {
  classes: ClassOption[];
  subjects: string[];
}) {
  const [diaryOpen, setDiaryOpen] = useState(false);
  const [occOpen, setOccOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState("");
  const today = useToday();

  const classData = classes.find((c) => c.id === selectedClass);

  const [diaryState, diaryAction, diaryPending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      const r = await createDiaryEntryAction(formData);
      if (r.success) setDiaryOpen(false);
      return r;
    },
    null
  );

  const [occState, occAction, occPending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      const r = await createOccurrenceAction(formData);
      if (r.success) setOccOpen(false);
      return r;
    },
    null
  );

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setDiaryOpen(true)}>Registrar conteúdo</Button>
        <Button variant="secondary" onClick={() => setOccOpen(true)}>
          Nova ocorrência
        </Button>
      </div>

      <Modal open={diaryOpen} onClose={() => setDiaryOpen(false)} title="Diário de classe">
        <form action={diaryAction} className="space-y-4">
          <div>
            <Label htmlFor="diary-classId">Turma</Label>
            <Select
              id="diary-classId"
              name="classId"
              required
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              <option value="">Selecione...</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="diary-date">Data</Label>
              <Input id="diary-date" name="date" type="date" defaultValue={today} required />
            </div>
            <div>
              <Label htmlFor="diary-subject">Disciplina</Label>
              <Select id="diary-subject" name="subject" defaultValue="">
                <option value="">Geral</option>
                {subjects.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="diary-content">Conteúdo ministrado / observações</Label>
            <Textarea id="diary-content" name="content" rows={4} required placeholder="O que foi trabalhado em sala hoje?" />
          </div>
          <FormMessage message={diaryState} />
          <Button type="submit" disabled={diaryPending} className="w-full">
            {diaryPending ? "Salvando..." : "Salvar no diário"}
          </Button>
        </form>
      </Modal>

      <Modal open={occOpen} onClose={() => setOccOpen(false)} title="Registrar ocorrência">
        <form action={occAction} className="space-y-4">
          <div>
            <Label htmlFor="occ-classId">Turma</Label>
            <Select
              id="occ-classId"
              name="classId"
              required
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              <option value="">Selecione...</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="occ-studentId">Aluno (opcional)</Label>
              <Select id="occ-studentId" name="studentId" defaultValue="">
                <option value="">Turma inteira</option>
                {classData?.students.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="occ-kind">Tipo</Label>
              <Select id="occ-kind" name="kind" defaultValue="observation">
                {OCCURRENCE_KINDS.map((k) => (
                  <option key={k} value={k}>{OCCURRENCE_LABELS[k]}</option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="occ-date">Data</Label>
            <Input id="occ-date" name="date" type="date" defaultValue={today} />
          </div>
          <div>
            <Label htmlFor="occ-description">Descrição</Label>
            <Textarea id="occ-description" name="description" rows={3} required />
          </div>
          <FormMessage message={occState} />
          <Button type="submit" disabled={occPending} className="w-full">
            {occPending ? "Registrando..." : "Registrar ocorrência"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
