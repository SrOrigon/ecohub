"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { updateStudentAction } from "@/actions/crud";
import { Select } from "@/components/ui/form-fields";

interface ClassOption {
  id: string;
  name: string;
}

export function StudentClassSelect({
  studentId,
  currentClassId,
  classes,
}: {
  studentId: string;
  currentClassId: string | null;
  classes: ClassOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const classId = event.target.value;
    const formData = new FormData();
    formData.set("studentId", studentId);
    formData.set("classId", classId);

    startTransition(async () => {
      await updateStudentAction(formData);
      router.refresh();
    });
  }

  if (classes.length === 0) {
    return <span className="text-sm text-slate-400">Sem turmas cadastradas</span>;
  }

  return (
    <Select
      value={currentClassId ?? ""}
      onChange={handleChange}
      disabled={pending}
      aria-label="Turma ou curso do aluno"
      className="min-w-[9rem] max-w-[14rem] text-sm"
    >
      <option value="">Sem turma / curso</option>
      {classes.map((turma) => (
        <option key={turma.id} value={turma.id}>
          {turma.name}
        </option>
      ))}
    </Select>
  );
}
