"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  enrollStudentInClassAction,
  removeStudentFromClassAction,
  updateStudentEnrollmentStatusAction,
} from "@/actions/student-enrollments";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/form-fields";
import { ScrollablePicker } from "@/components/ui/scrollable-picker";
import { enrollmentStatusLabel } from "@/lib/student-enrollments";
import { sortByTextPt } from "@/lib/sort-order";
import { X } from "lucide-react";

type ClassOption = { id: string; name: string };

type EnrollmentItem = {
  classId: string;
  status: string;
  classGroup: { id: string; name: string; gradeLevel?: string | null };
};

export function StudentEnrollmentsManager({
  studentId,
  enrollments,
  classes,
  compact = false,
}: {
  studentId: string;
  enrollments: EnrollmentItem[];
  classes: ClassOption[];
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pickedClassId, setPickedClassId] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const enrolledClassIds = new Set(enrollments.map((item) => item.classId));
  const availableClasses = sortByTextPt(
    classes.filter((item) => !enrolledClassIds.has(item.id)),
    (item) => item.name
  );

  function enroll(classId: string) {
    setErrorMessage(null);
    const formData = new FormData();
    formData.set("studentId", studentId);
    formData.set("classId", classId);
    startTransition(async () => {
      const result = await enrollStudentInClassAction(formData);
      if (result?.error) {
        setErrorMessage(result.error);
      } else {
        setPickedClassId("");
        router.refresh();
      }
    });
  }

  function updateStatus(classId: string, status: string) {
    setErrorMessage(null);
    const formData = new FormData();
    formData.set("studentId", studentId);
    formData.set("classId", classId);
    formData.set("status", status);
    startTransition(async () => {
      const result = await updateStudentEnrollmentStatusAction(formData);
      if (result?.error) {
        setErrorMessage(result.error);
      } else {
        router.refresh();
      }
    });
  }

  function remove(classId: string, className: string) {
    const confirmed = window.confirm(`Remover este aluno da turma "${className}"?`);
    if (!confirmed) return;

    setErrorMessage(null);
    const formData = new FormData();
    formData.set("studentId", studentId);
    formData.set("classId", classId);
    startTransition(async () => {
      const result = await removeStudentFromClassAction(formData);
      if (result?.error) {
        setErrorMessage(result.error);
      } else {
        router.refresh();
      }
    });
  }

  const activeEnrollments = sortByTextPt(
    enrollments.filter((item) => item.status === "active" || item.status === "locked"),
    (item) => item.classGroup.name
  );
  const sortedEnrollments = sortByTextPt(enrollments, (item) => item.classGroup.name);

  if (compact) {
    return (
      <div className="space-y-2">
        {errorMessage && <p className="text-sm font-medium text-red-600">{errorMessage}</p>}
        <div
          className="flex max-h-[calc(2.75rem*5+0.5rem)] flex-wrap gap-1 overflow-y-auto overscroll-contain pr-1"
        >
          {activeEnrollments.length === 0 ? (
            <span className="text-sm text-slate-400">Sem turma</span>
          ) : (
            activeEnrollments.map((item) => (
              <Badge
                key={item.classId}
                variant="secondary"
                className="inline-flex max-w-[14rem] items-center gap-1 truncate pr-1 text-xs font-medium"
              >
                <span className="truncate">{item.classGroup.name}</span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => remove(item.classId, item.classGroup.name)}
                  className="rounded p-0.5 text-slate-500 hover:bg-slate-200 hover:text-red-600 disabled:opacity-50"
                  aria-label={`Remover de ${item.classGroup.name}`}
                  title={`Remover de ${item.classGroup.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))
          )}
        </div>
        {availableClasses.length > 0 && (
          <ScrollablePicker
            placeholder="+ Adicionar turma"
            disabled={pending}
            placement="top"
            aria-label="Adicionar turma ou curso"
            options={availableClasses.map((turma) => ({
              value: turma.id,
              label: turma.name,
            }))}
            onSelect={(classId) => enroll(classId)}
            className="min-w-[12rem] max-w-[20rem] text-sm"
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {errorMessage && (
        <div className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-600">
          {errorMessage}
        </div>
      )}
      <div className="space-y-2">
        {sortedEnrollments.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma turma ou curso vinculado a este aluno.</p>
        ) : (
          sortedEnrollments.map((item) => (
            <div
              key={item.classId}
              className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">{item.classGroup.name}</p>
                <p className="text-xs text-slate-500">
                  {item.classGroup.gradeLevel ? `${item.classGroup.gradeLevel} · ` : ""}
                  {enrollmentStatusLabel(item.status)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {item.status !== "active" && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => updateStatus(item.classId, "active")}
                  >
                    Reativar
                  </Button>
                )}
                {item.status === "active" && (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => updateStatus(item.classId, "locked")}
                    >
                      Trancar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => updateStatus(item.classId, "ended")}
                    >
                      Encerrar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="text-red-600"
                      disabled={pending}
                      onClick={() => remove(item.classId, item.classGroup.name)}
                    >
                      Remover
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {availableClasses.length > 0 && (
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (pickedClassId) enroll(pickedClassId);
          }}
        >
          <div className="min-w-[14rem] flex-1">
            <Label htmlFor={`add-class-${studentId}`}>Matricular em nova turma / curso</Label>
            <ScrollablePicker
              placeholder="Selecione..."
              value={pickedClassId}
              disabled={pending}
              aria-label="Selecionar turma ou curso"
              options={availableClasses.map((turma) => ({
                value: turma.id,
                label: turma.name,
              }))}
              onSelect={setPickedClassId}
            />
          </div>
          <Button type="submit" disabled={pending || !pickedClassId}>
            {pending ? "Salvando..." : "Matricular"}
          </Button>
        </form>
      )}
    </div>
  );
}
