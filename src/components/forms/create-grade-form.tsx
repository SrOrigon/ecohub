"use client";

import { useState, FormEvent } from "react";
import { createGradeAction } from "@/actions/crud";
import { useOfflineMutation } from "@/hooks/use-offline-mutation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Select } from "@/components/ui/form-fields";
import { Modal } from "@/components/ui/modal";

interface StudentOption {
  id: string;
  name: string;
}

export function CreateGradeForm({
  students,
  subjects,
  periods,
  maxGrade = 10,
}: {
  students: StudentOption[];
  subjects: string[];
  periods: string[];
  maxGrade?: number;
}) {
  const [open, setOpen] = useState(false);
  const { mutate } = useOfflineMutation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultState, setResultState] = useState<{ error?: string; message?: string; queued?: boolean } | null>(
    null
  );

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setResultState(null);

    const formData = new FormData(e.currentTarget);
    try {
      const res = await mutate("createGradeAction", formData, createGradeAction);
      if (res.success) {
        if (res.queued) {
          setResultState({
            queued: true,
            message: res.message ?? "Nota salva offline. Será enviada ao reconectar.",
          });
        } else {
          setResultState({ message: "Nota lançada! XP creditado automaticamente." });
          setTimeout(() => setOpen(false), 1200);
        }
      } else {
        setResultState({ error: res.error ?? "Erro ao lançar nota." });
      }
    } catch {
      setResultState({ error: "Erro de conexão ao lançar nota." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>+ Lançar nota</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Lançar nota">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="studentId">Aluno</Label>
            <Select id="studentId" name="studentId" required>
              <option value="">Selecione...</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="subject">Disciplina</Label>
            <Select id="subject" name="subject" required>
              {subjects.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="value">Nota (0-{maxGrade})</Label>
            <Input
              id="value"
              name="value"
              type="number"
              step="0.1"
              min="0"
              max={maxGrade}
              required
            />
          </div>
          <div>
            <Label htmlFor="period">Período</Label>
            <Select id="period" name="period" required>
              {periods.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Select>
          </div>
          {resultState?.error && <p className="text-sm text-red-600">{resultState.error}</p>}
          {resultState?.message && (
            <p className={`text-sm ${resultState.queued ? "text-amber-700 font-medium" : "text-emerald-600"}`}>
              {resultState.message}
            </p>
          )}
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Salvando..." : "Lançar nota"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
